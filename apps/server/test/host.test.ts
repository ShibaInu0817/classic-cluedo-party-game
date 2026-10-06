import { describe, expect, test } from 'vitest';
import { createRoom, startServer, tinyTable } from './helpers.ts';

async function lobbyOf(n: number, opts: Record<string, unknown> = {}, roomOpts: Record<string, unknown> = {}) {
  const srv = await startServer(opts);
  const host = srv.client();
  const { code } = await createRoom(host, roomOpts);
  const guests = [];
  for (let i = 1; i < n; i++) {
    const g = srv.client();
    await g.ask('room:join', { code, playerName: `G${i}` });
    guests.push(g);
  }
  return { ...srv, host, guests, code };
}

describe('bots in the lobby', () => {
  test('bots do not take characters before the game starts, so people can still pick any of them', async () => {
    const { host, guests: [g1] } = await lobbyOf(2);
    await host.ask('lobby:fillBots');
    const s = await host.waitFor('room:state', (st) => st.seats.length === 6);
    expect(s.seats.filter((x: any) => x.isBot).every((x: any) => !x.characterId)).toBe(true);
    expect(await g1!.ask('lobby:pickChar', { characterId: 'S01' })).toEqual({ ok: true });
  });

  test('with "fill empty seats with bots" on, Start fills the table up to the room size', async () => {
    const { host } = await lobbyOf(1, {}, { bots: true, maxPlayers: 4 });
    expect(await host.ask('lobby:start')).toEqual({ ok: true });
    const s = await host.waitFor('room:state', (st) => st.phase === 'intro');
    expect(s.seats).toHaveLength(4);
  });

  test('with it off, Start needs enough people', async () => {
    const { host } = await lobbyOf(2, {}, { bots: false });
    expect(await host.ask('lobby:start')).toEqual({ ok: false, error: 'need at least 3 players' });
  });
});

describe('leaving and the host role', () => {
  test('leaving the lobby frees the seat; later seats move up and are told their new seat', async () => {
    const { host, guests: [g1, g2] } = await lobbyOf(3);
    const from = host.mark();
    expect(await g1!.ask('room:leave')).toEqual({ ok: true });
    const s = await host.waitFor('room:state', (st) => st.seats.length === 2, 3000, from);
    expect(s.seats.map((x: any) => x.name)).toEqual(['Host', 'G2']);
    expect(await g2!.waitFor('room:you')).toEqual({ seat: 1 });
    expect(await g2!.ask('lobby:pickChar', { characterId: 'S04' })).toEqual({ ok: true });
    const after = await host.waitFor('room:state', (st) => st.seats[1]?.characterId === 'S04');
    expect(after.seats[1].name).toBe('G2');
  });

  test('when the host leaves the lobby, the next player becomes host', async () => {
    const { host, guests: [g1, g2] } = await lobbyOf(3);
    await host.ask('room:leave');
    expect(await g1!.waitFor('room:you')).toEqual({ seat: 0 });
    const s = await g2!.waitFor('room:state', (st) => st.seats.length === 2);
    expect(s.hostSeat).toBe(0);
    expect(await g1!.ask('lobby:fillBots')).toEqual({ ok: true });
  });

  test('when the host drops, the first connected player can act as host', async () => {
    const { host, guests: [g1] } = await lobbyOf(3);
    host.socket.disconnect();
    const s = await g1!.waitFor('room:state', (st) => st.seats[0]?.connected === false);
    expect(s.hostSeat).toBe(1);
    expect(await g1!.ask('lobby:start')).toEqual({ ok: true });
  });

  test('the host can remove a player from the lobby', async () => {
    const { host, guests: [g1, g2] } = await lobbyOf(3);
    expect(await g1!.ask('lobby:kick', { seat: 2 })).toEqual({ ok: false, error: 'only the host can do that' });
    expect(await host.ask('lobby:kick', { seat: 2 })).toEqual({ ok: true });
    await g2!.waitFor('room:kicked');
    expect(await g2!.ask('lobby:pickChar', { characterId: 'S01' })).toEqual({ ok: false, error: 'not in a room' });
    expect(await host.ask('lobby:kick', { seat: 0 })).toEqual({ ok: false, error: 'cannot remove that seat' });
  });
});

describe('pausing', () => {
  test('the host can pause: the clock stops, nobody can act, and resuming restores the time left', async () => {
    const { players: [p0, p1], tv } = await tinyTable('pause', { turnMs: 400 });
    expect(await p1!.ask('game:pause', { paused: true })).toEqual({ ok: false, error: 'only the host can do that' });
    expect(await p0!.ask('game:pause', { paused: true })).toEqual({ ok: true });
    const paused = await tv.waitFor('room:state', (st) => st.paused === true);
    expect(paused.deadline).toBeUndefined();
    expect(await p0!.ask('game:intent', { type: 'roll' })).toEqual({ ok: false, error: 'the game is paused' });
    await new Promise((r) => setTimeout(r, 600)); // longer than the turn: no timeout while paused
    expect(tv.latest('room:state').game.turn).toBe(0);
    await p0!.ask('game:pause', { paused: false });
    const resumed = await tv.waitFor('room:state', (st) => st.paused === false && st.deadline);
    expect(resumed.deadline - Date.now()).toBeLessThanOrEqual(400);
    await tv.waitFor('room:state', (st) => st.game?.turn === 1, 2000);
  });
});

describe('rooms without a TV, and idle rooms', () => {
  test('a phones-only room has no TV to watch', async () => {
    const { client, code } = await lobbyOf(1, {}, { mode: 'phones' });
    expect(await client().ask('room:watch', { code })).toEqual({ ok: false, error: 'this room has no TV' });
  });

  test('a room nobody is connected to is closed after a while', async () => {
    const { host, client, code } = await lobbyOf(1, { idleRoomMs: 100 });
    host.socket.disconnect();
    await new Promise((r) => setTimeout(r, 400));
    expect(await client().ask('room:join', { code, playerName: 'Late' })).toEqual({ ok: false, error: 'room not found' });
  });

  test('a room with someone still connected stays open', async () => {
    const { guests: [g1], host, client, code } = await lobbyOf(2, { idleRoomMs: 100 });
    host.socket.disconnect();
    await new Promise((r) => setTimeout(r, 400));
    expect(g1).toBeDefined();
    expect(await client().ask('room:join', { code, playerName: 'Late' })).toMatchObject({ ok: true });
  });
});
