import { describe, expect, test } from 'vitest';
import { playHumanTurn, soloWithBots } from './helpers.ts';

describe('bots', () => {
  test('play their turns and hand the turn back to the human', async () => {
    const { human, tv } = await soloWithBots();
    await playHumanTurn(human);
    await tv.waitFor('room:state', (s) => s.game?.turn === 0 && s.game.round === 2, 5000);
    // each bot acted on its turn (a roll, or a secret passage if a suggestion dragged it into a room)
    const acted = tv.events('game:events').flat().filter((e: any) => e.type === 'rolled' || e.type === 'moved').map((e: any) => e.seat);
    expect(acted).toEqual(expect.arrayContaining([1, 2]));
  });

  test('keep playing round after round without a human stalling them', async () => {
    const { human, tv } = await soloWithBots();
    for (let round = 2; round <= 4; round++) {
      await playHumanTurn(human);
      await tv.waitFor('room:state', (s) => s.game?.turn === 0 && s.game.round === round, 5000);
    }
  });
});

describe('bot deduction', () => {
  test('bots narrow the case down from the cards they are shown, and one of them eventually solves it', async () => {
    const { tv } = await soloWithBots({ turnMs: 40 }); // the human never acts; their turns just time out
    const s = await tv.waitFor('room:state', (st) => st.phase === 'end', 12_000);
    expect([1, 2]).toContain(s.game.winner);
    expect(s.game.out[s.game.winner]).toBe(false);
  }, 15_000);
});
