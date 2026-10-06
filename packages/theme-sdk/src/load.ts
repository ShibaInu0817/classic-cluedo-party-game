import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { ManifestSchema, type Manifest, type Rules } from './schema.ts';
import { compileBoard, type CompiledBoard } from './board.ts';
import { crossCheck, ThemeValidationError } from './validate.ts';
import { assetRefs, i18nRefs } from './refs.ts';

export interface CompiledTheme {
  id: string;
  manifest: Manifest;
  board: CompiledBoard;
  deck: Manifest['deck'];
  rules: Rules;
  i18n: Record<string, Record<string, string>>;
}

const exists = (p: string) => access(p).then(() => true, () => false);

async function readJson(file: string, issues: string[]): Promise<any> {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (e) {
    issues.push(`cannot read ${path.basename(path.dirname(file))}/${path.basename(file)}: ${(e as Error).message}`);
    return undefined;
  }
}

/** Loads, validates and compiles a theme pack folder. Throws ThemeValidationError with every issue found. */
export async function loadThemePack(dir: string): Promise<{ theme: CompiledTheme; warnings: string[] }> {
  const issues: string[] = [];
  const warnings: string[] = [];

  const raw = await readJson(path.join(dir, 'theme.json'), issues);
  if (raw === undefined) throw new ThemeValidationError(issues);
  const parsed = ManifestSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ThemeValidationError(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`));
  }
  const manifest = parsed.data;
  issues.push(...crossCheck(manifest));

  const files = assetRefs(manifest).flatMap((ref) =>
    ref.includes('{lang}') ? manifest.meta.languages.map((l) => ref.replaceAll('{lang}', l)) : [ref],
  );
  for (const ref of new Set(files)) {
    const full = path.resolve(dir, ref);
    if (!full.startsWith(path.resolve(dir) + path.sep)) issues.push(`asset path escapes the pack: ${ref}`);
    else if (!(await exists(full))) issues.push(`missing asset ${ref}`);
  }

  const i18n: CompiledTheme['i18n'] = {};
  const keys = [...new Set(i18nRefs(manifest))];
  for (const lang of manifest.meta.languages) {
    const dict = await readJson(path.join(dir, 'i18n', `${lang}.json`), issues);
    if (!dict) continue;
    i18n[lang] = dict;
    const missing = keys.filter((k) => typeof dict[k] !== 'string');
    for (const k of missing) {
      const msg = `i18n/${lang}.json is missing "${k}"`;
      if (lang === manifest.meta.defaultLanguage) issues.push(msg);
      else warnings.push(`${msg} (falls back to ${manifest.meta.defaultLanguage})`);
    }
  }

  if (issues.length) throw new ThemeValidationError(issues);
  const theme: CompiledTheme = {
    id: manifest.meta.id,
    manifest,
    board: compileBoard(manifest.board),
    deck: manifest.deck,
    rules: manifest.rules,
    i18n,
  };
  return { theme, warnings };
}
