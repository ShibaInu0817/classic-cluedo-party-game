import { describe, expect, test } from 'vitest';
import { applyIntent, reachable } from '../src/index.ts';
import { ok, tinyGameRolling } from './helpers.ts';

// tiny-manor: seat 0 plays P1, starting at corridor 3,0. H1's door is the corridor cell 3,1.
describe('moving after a roll', () => {
  test('reach covers corridor squares within the roll, and a room through its door costs one step', async () => {
    const { theme, g } = await tinyGameRolling(2);
    const rolled = ok(theme, g, 0, { type: 'roll' }).g;
    expect(reachable(rolled, theme).sort()).toEqual(['3,1', '3,2', 'R:H1']);
  });

  test('stepping into a room ends movement and asks for a suggestion', async () => {
    const { theme, g } = await tinyGameRolling(4);
    const { g: after, events } = ok(theme, ok(theme, g, 0, { type: 'roll' }).g, 0, { type: 'move', node: 'R:H1' });
    expect(after.pos.P1).toBe('R:H1');
    expect(after.stage).toBe('suggest');
    expect(events).toEqual([{ type: 'moved', seat: 0, character: 'P1', path: ['3,0', '3,1', 'R:H1'] }]);
  });

  test('stopping on a corridor square ends the move without a suggestion', async () => {
    const { theme, g } = await tinyGameRolling(2);
    const after = ok(theme, ok(theme, g, 0, { type: 'roll' }).g, 0, { type: 'move', node: '3,2' }).g;
    expect(after.pos.P1).toBe('3,2');
    expect(after.stage).toBe('end');
  });

  test('a square beyond the roll is refused', async () => {
    const { theme, g } = await tinyGameRolling(2);
    const rolled = ok(theme, g, 0, { type: 'roll' }).g;
    expect(applyIntent(rolled, 0, { type: 'move', node: '3,3' }, { theme })).toEqual({ error: 'square not reachable' });
  });

  test('moving before rolling is refused', async () => {
    const { theme, g } = await tinyGameRolling(2);
    expect(applyIntent(g, 0, { type: 'move', node: '3,1' }, { theme })).toEqual({ error: 'cannot move now' });
  });
});
