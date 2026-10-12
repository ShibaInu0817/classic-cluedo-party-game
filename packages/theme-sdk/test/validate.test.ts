import { describe, expect, test } from 'vitest';
import { loadThemePack, ThemeValidationError } from '../src/index.ts';
import { mutatedPack } from './helpers.ts';

async function issuesOf(edit: Parameters<typeof mutatedPack>[0]): Promise<string[]> {
  const dir = await mutatedPack(edit);
  try {
    await loadThemePack(dir);
  } catch (e) {
    if (e instanceof ThemeValidationError) return e.issues;
    throw e;
  }
  return [];
}

describe('theme validation rejects a broken pack', () => {
  test('ambient sparkles in a room that does not exist', async () => {
    const issues = await issuesOf((m) => { m.ui.ambient = { sparkleRooms: ['NOPE'] }; });
    expect(issues.join('\n')).toMatch(/ui\.ambient\.sparkleRooms\[0\].*NOPE/);
  });

  test('ambient hanging art that is missing from the pack', async () => {
    const issues = await issuesOf((m) => { m.ui.ambient = { hanging: { art: 'assets/nope.svg' } }; });
    expect(issues.join('\n')).toMatch(/assets\/nope\.svg/);
  });

  test('a door that names an unknown room', async () => {
    const issues = await issuesOf((m) => { m.board.doors[0].room = 'NOPE'; });
    expect(issues.join('\n')).toMatch(/NOPE/);
  });

  test('a suspect starting inside a room instead of on the corridor', async () => {
    const issues = await issuesOf((m) => { m.deck.suspects[0].start = '0,0'; });
    expect(issues.join('\n')).toMatch(/P1.*start.*0,0.*not a corridor/);
  });

  test('a door that is not a corridor cell next to its room', async () => {
    const issues = await issuesOf((m) => { m.board.doors[0].cell = '5,3'; }); // corridor, but not touching H1
    expect(issues.join('\n')).toMatch(/door.*H1.*5,3/);
  });

  test('fewer suspects than the maximum number of players (each seat plays a suspect)', async () => {
    const issues = await issuesOf((m) => { m.meta.players.max = 4; });
    expect(issues.join('\n')).toMatch(/players\.max 4.*3 suspects/);
  });

  test('the same card id used twice', async () => {
    const issues = await issuesOf((m) => { m.deck.objects[0].id = 'H1'; });
    expect(issues.join('\n')).toMatch(/"H1" is used twice/);
  });

  test('an asset file the manifest points at is missing', async () => {
    const issues = await issuesOf((m) => { m.deck.rooms[1].art = 'assets/rooms/missing.svg'; });
    expect(issues.join('\n')).toMatch(/missing asset.*assets\/rooms\/missing\.svg/);
  });

  test('a string key missing from the default language', async () => {
    const issues = await issuesOf(async (_m, { i18n }) => {
      await i18n('en', (d) => { delete d['room.H2']; });
    });
    expect(issues.join('\n')).toMatch(/i18n\/en\.json.*room\.H2/);
  });

  test('a room nobody can enter (no door, no secret passage)', async () => {
    const issues = await issuesOf((m) => { m.board.doors = m.board.doors.filter((d: any) => d.room !== 'H1'); });
    expect(issues.join('\n')).toMatch(/room H1 cannot be entered/);
  });

  test('a per-language asset ({lang}) missing for one of the languages', async () => {
    const issues = await issuesOf(async (m, { dir }) => {
      const { writeFile } = await import('node:fs/promises');
      await writeFile(`${dir}/assets/logo.en.svg`, '<svg/>'); // fr variant deliberately absent
      m.ui.logo = 'assets/logo.{lang}.svg';
    });
    expect(issues).toEqual(['missing asset assets/logo.fr.svg']);
  });
});
