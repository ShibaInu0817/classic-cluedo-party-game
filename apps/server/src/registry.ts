import { loadThemePack, type CompiledTheme } from '@cluedo/theme-sdk';

export interface ThemeEntry { theme: CompiledTheme; dir: string }

/** Loads and validates every theme pack at boot. An invalid pack throws, so the server refuses to start. */
export async function loadRegistry(dirs: string[]): Promise<Map<string, ThemeEntry>> {
  const map = new Map<string, ThemeEntry>();
  for (const dir of dirs) {
    const { theme, warnings } = await loadThemePack(dir);
    for (const w of warnings) console.warn(`[theme ${theme.id}] ${w}`);
    if (map.has(theme.id)) throw new Error(`two theme packs share the id "${theme.id}"`);
    map.set(theme.id, { theme, dir });
  }
  return map;
}
