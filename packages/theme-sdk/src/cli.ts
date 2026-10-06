// theme:check <id | path> — validates a theme pack the same way the server does at boot.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadThemePack } from './load.ts';
import { ThemeValidationError } from './validate.ts';

const THEMES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../themes');
const arg = process.argv[2];
if (!arg) {
  console.error('usage: pnpm theme:check <theme-id | path/to/pack>');
  process.exit(2);
}
const dir = arg.includes('/') && !arg.startsWith('_') ? path.resolve(arg) : path.join(THEMES, arg);

try {
  const { theme, warnings } = await loadThemePack(dir);
  for (const w of warnings) console.warn(`warning: ${w}`);
  const d = theme.deck;
  console.log(
    `✓ ${theme.id}: ${d.suspects.length} suspects, ${d.rooms.length} rooms, ${d.objects.length} objects, ` +
      `${theme.board.width}×${theme.board.height} board`,
  );
} catch (e) {
  if (!(e instanceof ThemeValidationError)) throw e;
  console.error(`✗ ${arg}`);
  for (const i of e.issues) console.error(`  - ${i}`);
  process.exit(1);
}
