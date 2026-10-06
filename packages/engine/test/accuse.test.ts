import { describe, expect, test } from 'vitest';
import { applyIntent, privateView, type GameState } from '../src/index.ts';
import { ok, tinyGame } from './helpers.ts';

const wrongTrio = (g: GameState) => ({
  sus: g.envelope.sus,
  room: g.envelope.room,
  obj: ['W1', 'W2', 'W3'].find((o) => o !== g.envelope.obj)!,
});

describe('accusing', () => {
  test('a correct accusation wins the game and reveals the envelope to everyone', async () => {
    const { theme, g } = await tinyGame();
    const { g: after, events } = ok(theme, g, 0, { type: 'accuse', ...g.envelope });
    expect(after.stage).toBe('over');
    expect(after.winner).toBe(0);
    expect(events).toEqual([
      { type: 'accused', seat: 0, correct: true },
      { type: 'gameWon', seat: 0, envelope: g.envelope },
    ]);
  });

  test('a wrong accusation makes you a ghost; the event does not carry the guess and only you see the envelope', async () => {
    const { theme, g } = await tinyGame();
    const { g: after, events } = ok(theme, g, 0, { type: 'accuse', ...wrongTrio(g) });
    expect(after.out[0]).toBe(true);
    expect(events.slice(0, 2)).toEqual([{ type: 'accused', seat: 0, correct: false }, { type: 'becameGhost', seat: 0 }]);
    expect(privateView(after, 0).envelope).toEqual(g.envelope);
    expect(privateView(after, 1).envelope).toBeUndefined();
  });

  test('the ghost loses its turn at once and is skipped from then on', async () => {
    const { theme, g } = await tinyGame();
    const { g: after, events } = ok(theme, g, 0, { type: 'accuse', ...wrongTrio(g) });
    expect(events.at(-1)).toEqual({ type: 'turnStarted', seat: 1, round: 1 });
    expect(after.turn).toBe(1);
  });

  test('a ghost can no longer accuse', async () => {
    const { theme, g } = await tinyGame();
    const s = ok(theme, g, 0, { type: 'accuse', ...wrongTrio(g) }).g;
    // the ghost is refused for being a ghost, before any turn check
    expect(applyIntent(s, 0, { type: 'accuse', ...g.envelope }, { theme })).toEqual({ error: 'ghosts cannot act' });
    expect(applyIntent(s, 0, { type: 'roll' }, { theme })).toEqual({ error: 'ghosts cannot act' });
  });

  test('when every seat has accused wrongly the game is over with no winner', async () => {
    const { theme, g } = await tinyGame();
    let s = g;
    for (const seat of [0, 1, 2]) s = ok(theme, s, seat, { type: 'accuse', ...wrongTrio(g) }).g;
    expect(s.stage).toBe('over');
    expect(s.winner).toBeUndefined();
  });
});
