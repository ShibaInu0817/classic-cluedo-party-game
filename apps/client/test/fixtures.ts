import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ThemeBundle } from '../src/theme/ThemeProvider.tsx';

const THEMES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../themes');
const read = (p: string) => JSON.parse(readFileSync(path.join(THEMES, p), 'utf8'));

/** The tiny-manor fixture pack, as the client would fetch it. */
export const tinyBundle = (): ThemeBundle => ({
  id: 'tiny-manor',
  manifest: read('_fixtures/tiny-manor/theme.json'),
  i18n: { en: read('_fixtures/tiny-manor/i18n/en.json'), fr: read('_fixtures/tiny-manor/i18n/fr.json') },
});
