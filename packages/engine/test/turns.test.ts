import { describe, expect, test } from 'vitest';
import { applyIntent, reachable, type GameState } from '../src/index.ts';
import { ok, tinyGameRolling } from './helpers.ts';
import type { CompiledTheme } from '@cluedo/theme-sdk';

/** Rolls and stops on the first reachable corridor square, leaving the seat at stage 'end'. */
function walkAndStop(theme: CompiledTheme, g: GameState, seat: number): GameState {
  const s = ok(theme, g, seat, { type: 'roll' }).g;
  const square = reachable(s, theme).find((n) => !n.startsWith('R:'))!;
  return ok(theme, s, seat, { type: 'move', node: square }).g;
}

describe('ending a turn', () => {
  test('passes the turn clockwise and starts it at the roll stage', async () => {
    const { theme, g } = await tinyGameRolling(2);
    const { g: next, events } = ok(theme, walkAndStop(theme, g, 0), 0, { type: 'endTurn' });
    expect(next.turn).toBe(1);
    expect(next.stage).toBe('roll');
    expect(next.dice).toBeUndefined();
    expect(events).toEqual([{ type: 'turnStarted', seat: 1, round: 1 }]);
  });

  test('the round goes up when the turn wraps back to the first seat', async () => {
    const { theme, g } = await tinyGameRolling(2);
    let s = g;
    for (const seat of [0, 1, 2]) s = ok(theme, walkAndStop(theme, s, seat), seat, { type: 'endTurn' }).g;
    expect(s.turn).toBe(0);
    expect(s.round).toBe(2);
  });

  test('a turn cannot end while a suggestion is owed', async () => {
    const { theme, g } = await tinyGameRolling(4);
    const inRoom = ok(theme, ok(theme, g, 0, { type: 'roll' }).g, 0, { type: 'move', node: 'R:H1' }).g;
    expect(applyIntent(inRoom, 0, { type: 'endTurn' }, { theme })).toEqual({ error: 'cannot end turn now' });
  });
});
