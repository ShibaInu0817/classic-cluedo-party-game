import { describe, expect, test } from 'vitest';
import { applyIntent, reachable } from '../src/index.ts';
import { ok, p2StartsInLibrary, tinyGame } from './helpers.ts';

describe('starting a turn inside a room', () => {
  test('a suggestion that names you drags your token into that room', async () => {
    const { g } = await p2StartsInLibrary();
    expect(g.turn).toBe(1);
    expect(g.pos.P2).toBe('R:H2');
  });

  test('you may leave by the door but cannot end in the room you started in', async () => {
    const { theme, g } = await p2StartsInLibrary();
    const rolled = ok(theme, g, 1, { type: 'roll' }).g;
    const reach = reachable(rolled, theme);
    expect(reach).toContain('5,3');
    expect(reach).not.toContain('R:H2');
  });

  test('the secret passage replaces the roll and lands you in the linked room, ready to suggest', async () => {
    const { theme, g } = await p2StartsInLibrary();
    const { g: after, events } = ok(theme, g, 1, { type: 'secretPassage' });
    expect(after.pos.P2).toBe('R:H3');
    expect(after.stage).toBe('suggest');
    expect(events).toEqual([{ type: 'moved', seat: 1, character: 'P2', path: ['R:H2', 'R:H3'], passage: true }]);
  });

  test('there is no secret passage from a corridor or after rolling', async () => {
    const { theme, g } = await tinyGame();
    expect(applyIntent(g, 0, { type: 'secretPassage' }, { theme })).toEqual({ error: 'no secret passage here' });
    const { g: lib } = await p2StartsInLibrary();
    const rolled = ok(theme, lib, 1, { type: 'roll' }).g;
    expect(applyIntent(rolled, 1, { type: 'secretPassage' }, { theme })).toEqual({ error: 'no secret passage here' });
  });
});
