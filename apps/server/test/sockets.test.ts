import { describe, expect, test } from 'vitest';
import { createRoom, envelopeFor, startServer, tinyTable } from './helpers.ts';

describe('only the socket that currently holds a seat can act for it', () => {
  test('resuming a seat from another tab retires the old connection', async () => {
    const srv = await startServer();
    const host = srv.client();
    const { code } = await createRoom(host);
    const tabA = srv.client();
    const { token } = await tabA.ask('room:join', { code, playerName: 'Alice' });
    const tabB = srv.client();
    expect(await tabB.ask('room:resume', { code, token })).toEqual({ ok: true, seat: 1 });
    await tabA.waitFor('room:kicked');
    expect(await tabA.ask('lobby:pickChar', { characterId: 'S01' })).toEqual({ ok: false, error: 'not in a room' });
    expect(await tabB.ask('lobby:pickChar', { characterId: 'S01' })).toEqual({ ok: true });
  });

  test('a socket that no longer owns its seat number cannot act as whoever has it now', async () => {
    const srv = await startServer();
    const host = srv.client();
    const { code } = await createRoom(host);
    const alice = srv.client();
    const { token } = await alice.ask('room:join', { code, playerName: 'Alice' });
    const bob = srv.client();
    await bob.ask('room:join', { code, playerName: 'Bob' });
    const ghostTab = srv.client();
    await ghostTab.ask('room:resume', { code, token }); // now owns seat 1; alice is retired
    await host.ask('lobby:kick', { seat: 1 }); // seat 1 is now Bob
    expect(await alice.ask('lobby:pickChar', { characterId: 'S06' })).toEqual({ ok: false, error: 'not in a room' });
    const s = await host.waitFor('room:state', (st) => st.seats.length === 2);
    expect(s.seats[1].characterId).toBeUndefined();
  });
});

describe('one room per connection', () => {
  test('joining another room leaves the first one', async () => {
    const srv = await startServer();
    const a = srv.client();
    const { code: codeA } = await createRoom(a);
    const b = srv.client();
    const { code: codeB } = await createRoom(b);
    const phone = srv.client();
    await phone.ask('room:watch', { code: codeA });
    await phone.ask('room:join', { code: codeB, playerName: 'P' });
    const from = phone.mark();
    await a.ask('lobby:pickChar', { characterId: 'S02' }); // room A changes
    await b.ask('lobby:pickChar', { characterId: 'S03' }); // room B changes
    await phone.waitFor('room:state', (st) => st.code === codeB && st.seats[0].characterId === 'S03', 3000, from);
    const seenA = phone.received.slice(from).some((m) => m.event === 'room:state' && m.data.code === codeA);
    expect(seenA).toBe(false);
  });
});

describe('leaving mid-game', () => {
  test('a player who leaves is replaced by a bot, so nobody waits for them', async () => {
    const { players: [p0, p1], tv } = await tinyTable('leave', { botDelayMs: 0 });
    await p1!.ask('room:leave');
    const s = await tv.waitFor('room:state', (st) => st.seats[1]?.isBot === true);
    expect(s.seats[1].characterId).toBe('P2');
    await p0!.ask('game:intent', { type: 'accuse', sus: 'P1', room: 'H1', obj: 'W1' }).catch(() => {});
    // whatever happened to seat 0, the bot in seat 1 takes its turn on its own
    await tv.waitFor('room:state', (st) => st.game?.turn !== 1 || st.phase === 'end', 3000);
  });

  test('a rematch needs the yes of everyone still connected, not of players who are gone', async () => {
    const { players: [p0, p1, p2], tv } = await tinyTable('gone');
    const env = await envelopeFor('gone');
    await p0!.ask('game:intent', { type: 'accuse', ...env });
    await tv.waitFor('room:state', (st) => st.phase === 'end');
    p2!.socket.disconnect(); // phone died
    await tv.waitFor('room:state', (st) => st.seats[2]?.connected === false);
    const from = tv.mark();
    await p0!.ask('end:vote', { rematch: true });
    await p1!.ask('end:vote', { rematch: true });
    await tv.waitFor('room:state', (st) => st.phase === 'intro', 3000, from);
  });
});
