import { describe, expect, test } from 'vitest';
import { createRoom, startServer } from './helpers.ts';

describe('starting the game', () => {
  test('below the minimum number of seats the host cannot start', async () => {
    const { client } = await startServer();
    const host = client();
    await createRoom(host);
    expect(await host.ask('lobby:start')).toEqual({ ok: false, error: 'need at least 3 players' });
  });

  test('only the host can start or fill bots', async () => {
    const { client } = await startServer();
    const host = client();
    const { code } = await createRoom(host);
    const guest = client();
    await guest.ask('room:join', { code, playerName: 'G' });
    expect(await guest.ask('lobby:fillBots')).toEqual({ ok: false, error: 'only the host can do that' });
    expect(await guest.ask('lobby:start')).toEqual({ ok: false, error: 'only the host can do that' });
  });

  test('bots fill the empty seats with free characters, then the game starts', async () => {
    const { client } = await startServer();
    const host = client();
    await createRoom(host, { maxPlayers: 6 });
    await host.ask('lobby:pickChar', { characterId: 'S02' });
    expect(await host.ask('lobby:fillBots')).toEqual({ ok: true });
    const lobby = await host.waitFor('room:state', (s) => s.seats.length === 6);
    expect(lobby.seats.filter((s: any) => s.isBot)).toHaveLength(5);

    expect(await host.ask('lobby:start')).toEqual({ ok: true });
    const playing = await host.waitFor('room:state', (s) => s.phase === 'intro');
    expect(playing.seats[0].characterId).toBe('S02');
    expect(new Set(playing.seats.map((s: any) => s.characterId)).size).toBe(6);
    expect(playing.game.seats.map((s: any) => s.characterId)).toEqual(playing.seats.map((s: any) => s.characterId));
  });

  test('each human receives their own hand and nobody else\'s', async () => {
    const { client } = await startServer();
    const host = client();
    const { code } = await createRoom(host, { themeId: 'tiny-manor', maxPlayers: 3 });
    const [g1, g2] = [client(), client()];
    await g1.ask('room:join', { code, playerName: 'G1' });
    await g2.ask('room:join', { code, playerName: 'G2' });
    await host.ask('lobby:start'); // characters are auto-assigned to seats that did not pick

    const hands = await Promise.all([host, g1, g2].map((c) => c.waitFor('game:private').then((p) => p.hand as string[])));
    const all = hands.flat();
    expect(new Set(all).size).toBe(all.length); // disjoint
    const state = await host.waitFor('room:state', (s) => s.phase === 'intro');
    expect(hands.map((h) => h.length)).toEqual(state.game.handSizes);
    for (const c of [host, g1, g2]) expect(new Set(c.events('game:private').map((p) => p.hand.join())).size).toBe(1);
  });
});
