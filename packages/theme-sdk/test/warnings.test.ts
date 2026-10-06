import { expect, test } from 'vitest';
import { loadThemePack } from '../src/index.ts';
import { TINY } from './helpers.ts';

test('a key missing only in a non-default language is a warning, not an error', async () => {
  const { warnings } = await loadThemePack(TINY); // fr.json lacks award.mostSuspected
  expect(warnings.join('\n')).toMatch(/i18n\/fr\.json.*award\.mostSuspected/);
});
