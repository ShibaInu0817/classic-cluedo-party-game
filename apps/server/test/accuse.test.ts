import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { loadThemePack } from '@cluedo/theme-sdk';
import { createGame } from '@cluedo/engine';
import { PRIVATE_EVENTS } from '@cluedo/protocol';
import { playHumanTurn, soloWithBots, TINY_DIR, tinyTable } from './helpers.ts';

/** The envelope the server will deal for this seed (seats P1, P2, P3), via the engine as oracle. */
async function envelopeFor(seed: string) {
  const { theme } = await loadThemePack(path.resolve(TINY_DIR));
  return createGame(theme, [{ characterId: 'P1' }, { characterId: 'P2' }, { characterId: 'P3' }], seed).envelope;
}

describe('accusations over the network', () => {
  test('a wrong accuser privately sees the envelope; everyone else only hears "wrong accusation"', async () => {
    const env = await envelopeFor('acc');
    const { players: [p0, p1, p2], tv } = await tinyTable('acc');
    const wrong = { ...env, obj: ['W1', 'W2', 'W3'].find((o) => o !== env.obj)! };
    expect(await p0!.ask('game:intent', { type: 'accuse', ...wrong })).toEqual({ ok: true });

    const mine = await p0!.waitFor('game:private', (p) => !!p.envelope);
    expect(mine.envelope).toEqual(env);
    const announced = await tv.waitFor('game:events', (es) => es.some((e: any) => e.type === 'accused'));
    expect(announced).toContainEqual({ type: 'accused', seat: 0, correct: false });
    expect(JSON.stringify(announced)).not.toContain(wrong.obj);
    for (const c of [p1!, p2!]) expect(c.events('game:private').some((p) => p.envelope)).toBe(false);
    const s = await tv.waitFor('room:state', (st) => st.game?.out[0] === true);
    expect(s.game.turn).toBe(1);
  });

  test('a ghost is skipped as the turns go round', async () => {
    const env = await envelopeFor('ghost');
    const { players: [p0], tv } = await tinyTable('ghost', { turnMs: 80 });
    await p0!.ask('game:intent', { type: 'accuse', ...env, obj: ['W1', 'W2', 'W3'].find((o) => o !== env.obj)! });
    const from = tv.mark();
    await tv.waitFor('room:state', (st) => st.game?.round >= 3, 3000, from);
    const turns = tv.received.slice(from).filter((m) => m.event === 'room:state').map((m) => m.data.game.turn);
    expect(turns).not.toContain(0);
  });

  test('a correct accusation ends the game and makes the answer public', async () => {
    const env = await envelopeFor('win');
    const { players: [p0], tv } = await tinyTable('win');
    await p0!.ask('game:intent', { type: 'accuse', ...env });
    const s = await tv.waitFor('room:state', (st) => st.phase === 'end');
    expect(s.game.winner).toBe(0);
    expect(s.game.answer).toEqual(env);
    expect(s.deadline).toBeUndefined();
  });
});

describe('the TV never receives private data', () => {
  test('across several rounds of bots suggesting and showing cards', async () => {
    const { human, tv } = await soloWithBots();
    for (let round = 2; round <= 4; round++) {
      await playHumanTurn(human);
      await tv.waitFor('room:state', (s) => s.game?.turn === 0 && s.game.round === round, 5000);
    }
    for (const e of PRIVATE_EVENTS) expect(tv.events(e)).toEqual([]);
    const events = tv.events('game:events').flat();
    for (const e of events.filter((x: any) => x.type === 'cardShown')) expect(e).not.toHaveProperty('card');
    for (const st of tv.events('room:state')) {
      const json = JSON.stringify(st);
      expect(json).not.toMatch(/"hands"|"envelope"|"shown"|"rng"/);
      expect(st.game?.answer).toBeUndefined();
    }
  });
});
