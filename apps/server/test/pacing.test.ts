import { describe, expect, test } from 'vitest';
import { botDelay } from '../src/bots.ts';
import { createRoom, handOf, startServer, tinySeed, tinyTable } from './helpers.ts';

describe('the asked player has their own clock', () => {
  test('a player who stalls instead of showing a card is the one who times out; the suggester keeps the turn', async () => {
    const seed = await tinySeed((g, roll) => roll >= 2 && handOf(g, 1).some((c) => c.startsWith('P')));
    const { players: [p0, p1], tv } = await tinyTable(seed, { turnMs: 400 });
    await p0!.ask('game:intent', { type: 'roll' });
    await p0!.ask('game:intent', { type: 'move', node: 'R:H1' });
    const hand1: string[] = (await p1!.waitFor('game:private')).hand;
    const sus = hand1.find((c) => c.startsWith('P'))!;
    const before = Date.now();
    await p0!.ask('game:intent', { type: 'suggest', sus, obj: 'W1' });
    const asking = await tv.waitFor('room:state', (s) => s.game?.stage === 'disprove');
    expect(asking.deadline).toBeGreaterThanOrEqual(before + 350); // a fresh window for the asked player
    // p1 never answers
    const events = await tv.waitFor('game:events', (es) => es.some((e: any) => e.type === 'timedOut'), 2000);
    expect(events[0]).toEqual({ type: 'timedOut', seat: 1 });
    expect(await p0!.waitFor('game:shown')).toEqual({ card: sus, from: 1 });
    const after = await tv.waitFor('room:state', (s) => s.game?.stage === 'end');
    expect(after.game.turn).toBe(0);
    expect(after.deadline).toBeGreaterThan(Date.now()); // and the suggester gets time to finish the turn
  });
});

describe('the intro does not wait forever', () => {
  test('after the intro time limit, play begins even if someone is still reading', async () => {
    const srv = await startServer({ introMs: 200 });
    const host = srv.client();
    await createRoom(host, { themeId: 'tiny-manor', maxPlayers: 3, bots: true });
    await host.ask('lobby:start');
    const intro = await host.waitFor('room:state', (s) => s.phase === 'intro');
    expect(intro.deadline).toBeGreaterThan(Date.now() - 50);
    await host.waitFor('room:state', (s) => s.phase === 'play', 2000);
  });
});

describe('the lobby knows whether bots will fill the table', () => {
  test('the room state carries the bots setting', async () => {
    const { client } = await startServer();
    const host = client();
    await createRoom(host, { bots: true });
    expect((await host.waitFor('room:state')).bots).toBe(true);
  });
});

describe('bots act at a pace people can follow', () => {
  const base = 1000;
  test('a bot waits for its dice to land before moving, and longest after a suggestion so everyone can read it', () => {
    const roll = botDelay({ stage: 'roll' }, [], base);
    const move = botDelay({ stage: 'move' }, [{ type: 'rolled', seat: 1, value: 3 }], base);
    const afterSuggestion = botDelay({ stage: 'end' }, [{ type: 'cardShown', from: 2, to: 1, card: 'P1' }], base);
    const show = botDelay({ stage: 'disprove' }, [{ type: 'asked', seat: 2, has: true }], base);
    expect(move).toBeGreaterThan(roll);
    expect(afterSuggestion).toBeGreaterThanOrEqual(3 * base);
    expect(show).toBeGreaterThan(roll);
    expect(botDelay({ stage: 'roll' }, [], 0)).toBe(0); // tests run bots instantly
  });
});
