import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const THEMES = path.join(ROOT, 'themes');
export const TINY = path.join(THEMES, '_fixtures/tiny-manor');
export const CNY = path.join(THEMES, 'cny-guest');

import { cp, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';

/** Copies a pack to a temp dir, lets the test edit its manifest/i18n/files, returns the dir. */
export async function mutatedPack(
  edit: (m: any, ctx: { dir: string; i18n: (lang: string, fn: (d: any) => void) => Promise<void> }) => void | Promise<void>,
  src = TINY,
): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'pack-'));
  await cp(src, dir, { recursive: true });
  const file = path.join(dir, 'theme.json');
  const m = JSON.parse(await readFile(file, 'utf8'));
  await edit(m, {
    dir,
    i18n: async (lang, fn) => {
      const f = path.join(dir, 'i18n', `${lang}.json`);
      const d = JSON.parse(await readFile(f, 'utf8'));
      fn(d);
      await writeFile(f, JSON.stringify(d));
    },
  });
  await writeFile(file, JSON.stringify(m));
  return dir;
}
export const cleanup = (dir: string) => rm(dir, { recursive: true, force: true });
