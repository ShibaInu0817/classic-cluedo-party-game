import { describe, expect, test } from 'vitest';
import { privateView, reachable, type GameState } from '../src/index.ts';
import { ok, tinyGame } from './helpers.ts';
import type { CompiledTheme } from '@cluedo/theme-sdk';

const stopOnCorridor = (theme: CompiledTheme, g: GameState, seat: number) => {
  const r = ok(theme, g, seat, { type: 'roll' }).g;
  return ok(theme, ok(theme, r, seat, { type: 'move', node: reachable(r, theme).find((n) => !n.startsWith('R:'))! }).g, seat, { type: 'endTurn' }).g;
};

/** Seat 0 plays a plain turn, then seat 1 accuses wrongly and becomes a ghost; it is now seat 2's turn. */
async function seat1IsGhost(seed: string) {
  const { theme, g } = await tinyGame(seed);
  let s = stopOnCorridor(theme, g, 0);
  const wrong = { sus: g.envelope.sus, room: g.envelope.room, obj: ['W1', 'W2', 'W3'].find((o) => o !== g.envelope.obj)! };
  s = ok(theme, s, 1, { type: 'accuse', ...wrong }).g;
  return { theme, g: s };
}

describe('ghosts', () => {
  test('are skipped when the turn comes round', async () => {
    const { theme, g } = await seat1IsGhost('ghost-skip');
    expect(g.turn).toBe(2);
    let s = stopOnCorridor(theme, g, 2);
    expect(s.turn).toBe(0);
    s = stopOnCorridor(theme, s, 0);
    expect(s.turn).toBe(2);
  });

  test('still have to show a card when asked', async () => {
    // Seat 2 (P3, start 0,3) walks into the Cellar H3 (door 1,3) and suggests a trio only the ghost can disprove.
    for (let i = 0; i < 3000; i++) {
      const { theme, g } = await seat1IsGhost(`ghost-show-${i}`);
      const rolled = ok(theme, g, 2, { type: 'roll' }).g;
      if (!reachable(rolled, theme).includes('R:H3')) continue;
      const [h0, h1] = [privateView(g, 0).hand, privateView(g, 1).hand];
      if (h0.includes('H3')) continue;
      const sus = h1.find((c) => c.startsWith('P'));
      const obj = ['W1', 'W2', 'W3'].find((o) => !h0.includes(o));
      if (!sus || h0.includes(sus) || !obj) continue;

      const inCellar = ok(theme, rolled, 2, { type: 'move', node: 'R:H3' }).g;
      const { g: asking, events } = ok(theme, inCellar, 2, { type: 'suggest', sus, obj });
      expect(events).toContainEqual({ type: 'asked', seat: 1, has: true });
      expect(asking.pending?.asked).toBe(1);
      expect(ok(theme, asking, 1, { type: 'showCard', card: sus }).g.stage).toBe('end');
      return;
    }
    throw new Error('no seed produced the scenario');
  });
});
