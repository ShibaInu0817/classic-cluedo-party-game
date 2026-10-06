import { createContext, useContext, useMemo, type CSSProperties, type ReactNode } from 'react';
import type { Manifest } from '@cluedo/theme-sdk/schema';
import { compileBoard, type CompiledBoard } from '@cluedo/theme-sdk/board';
import { UI } from '../i18n/ui.ts';

/** What the client fetches for a theme: the manifest plus its i18n files. */
export interface ThemeBundle {
  id: string;
  manifest: Manifest;
  i18n: Record<string, Record<string, string>>;
}

export interface ThemeApi {
  bundle: ThemeBundle;
  manifest: Manifest;
  lang: string;
  /** Translate a key; `{name}` placeholders are filled from `vars`. */
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** URL of a pack-relative asset path, with `{lang}` filled in. */
  asset: (path: string) => string;
  /** Display name of a card id (suspect, room or object). */
  cardName: (id: string) => string;
  cardArt: (id: string) => string | undefined;
  colorOf: (characterId: string) => string;
  /** The board graph, compiled from the manifest exactly as the server does. */
  board: CompiledBoard;
}

const Ctx = createContext<ThemeApi | null>(null);

export function useTheme(): ThemeApi {
  const api = useContext(Ctx);
  if (!api) throw new Error('useTheme outside ThemeProvider');
  return api;
}

export async function fetchThemeBundle(id: string, langs: string[]): Promise<ThemeBundle> {
  const manifest: Manifest = await (await fetch(`/themes/${id}/theme.json`)).json();
  const wanted = [...new Set([manifest.meta.defaultLanguage, ...langs])].filter((l) => manifest.meta.languages.includes(l));
  const i18n: ThemeBundle['i18n'] = {};
  await Promise.all(wanted.map(async (l) => (i18n[l] = await (await fetch(`/themes/${id}/i18n/${l}.json`)).json())));
  return { id, manifest, i18n };
}

export function makeThemeApi(bundle: ThemeBundle, lang: string): ThemeApi {
  const { manifest, i18n } = bundle;
  const def = manifest.meta.defaultLanguage;
  const cards = new Map([...manifest.deck.suspects, ...manifest.deck.rooms, ...manifest.deck.objects].map((c) => [c.id, c]));
  const asset = (p: string) => `/themes/${bundle.id}/${p.replaceAll('{lang}', manifest.meta.languages.includes(lang) ? lang : def)}`;
  const t = (key: string, vars?: Record<string, string | number>) => {
    const raw = i18n[lang]?.[key] ?? i18n[def]?.[key] ?? UI[lang]?.[key] ?? UI.en![key] ?? key;
    return vars ? raw.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`)) : raw;
  };
  return {
    bundle,
    manifest,
    lang,
    t,
    asset,
    cardName: (id) => (cards.get(id) ? t(cards.get(id)!.nameKey) : id),
    cardArt: (id) => (cards.get(id) ? asset(cards.get(id)!.art) : undefined),
    colorOf: (id) => manifest.deck.suspects.find((s) => s.id === id)?.color ?? 'var(--color-ink)',
    board: compileBoard({ ...manifest.board, secretPassages: manifest.board.secretPassages ?? [] }),
  };
}

/** CSS custom properties from the theme's design tokens. Components only ever use var(--…). */
export function tokenVars(m: Manifest): CSSProperties {
  const tk = m.ui.tokens;
  const vars: Record<string, string> = {};
  for (const [k, v] of Object.entries(tk.color)) vars[`--color-${k}`] = v;
  vars['--font-display'] = `'${tk.font.display}', system-ui, sans-serif`;
  vars['--font-ui'] = `'${tk.font.ui}', system-ui, sans-serif`;
  vars['--font-glyph'] = `'${tk.font.glyph}', serif`;
  for (const [k, v] of Object.entries(tk.radius ?? {})) vars[`--radius-${k}`] = `${v}px`;
  if (tk.shadow) vars['--shadow'] = tk.shadow;
  return vars as CSSProperties;
}

export function ThemeProvider({ bundle, lang, children }: { bundle: ThemeBundle; lang: string; children: ReactNode }) {
  const api = useMemo(() => makeThemeApi(bundle, lang), [bundle, lang]);
  return (
    <Ctx.Provider value={api}>
      <div data-testid="theme-root" className="theme-root" style={tokenVars(bundle.manifest)} lang={lang}>
        {children}
      </div>
    </Ctx.Provider>
  );
}
