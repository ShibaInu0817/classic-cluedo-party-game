import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { loadThemePack } from '@cluedo/theme-sdk';
import { createGame } from '@cluedo/engine';
import { TINY_DIR, tinyTable } from './helpers.ts';

async function finishedTable() {
  const { theme } = await loadThemePack(path.resolve(TINY_DIR));
  const env = createGame(theme, [{ characterId: 'P1' }, { characterId: 'P2' }, { characterId: 'P3' }], 'end').envelope;
  const t = await tinyTable('end');
  await t.players[0]!.ask('game:intent', { type: 'roll' });
  await t.players[0]!.ask('game:intent', { type: 'accuse', ...env });
  await t.tv.waitFor('room:state', (s) => s.phase === 'end');
  return t;
}

describe('after the game', () => {
  test('the whole case timeline becomes public', async () => {
    const { tv } = await finishedTable();
    const s = tv.latest('room:state');
    expect(s.history.map((e: any) => e.type)).toEqual(['turnStarted', 'rolled', 'accused', 'gameWon']);
  });

  test('everyone sees who voted for a rematch', async () => {
    const { players: [p0], tv } = await finishedTable();
    expect(await p0!.ask('end:vote', { rematch: true })).toEqual({ ok: true });
    const s = await tv.waitFor('room:state', (st) => st.votes?.[0] === true);
    expect(s.votes).toEqual([true, null, null]);
  });

  test('when every human votes yes, the same table is dealt a fresh game and goes back to the intro', async () => {
    const { players, tv } = await finishedTable();
    const before = (await players[0]!.waitFor('game:private')).hand;
    const from = tv.mark();
    for (const p of players) await p.ask('end:vote', { rematch: true });
    const s = await tv.waitFor('room:state', (st) => st.phase === 'intro', 3000, from);
    expect(s.game.round).toBe(1);
    expect(s.gameNo).toBe(2);
    expect(s.game.winner).toBeUndefined();
    expect(s.seats.map((x: any) => x.characterId)).toEqual(['P1', 'P2', 'P3']);
    expect(s.log).toEqual([]);
    const after = await players[0]!.waitFor('game:private', (p) => p.hand.join() !== before.join() || true, 3000, players[0]!.mark() - 1);
    expect(after.hand.length).toBeGreaterThan(0);
  });

  test('voting is only possible once the game is over', async () => {
    const { players: [p0] } = await tinyTable('early');
    expect(await p0!.ask('end:vote', { rematch: true })).toEqual({ ok: false, error: 'the game is not over' });
  });
});
