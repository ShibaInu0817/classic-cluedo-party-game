import { describe, expect, test } from 'vitest';
import { startServer, tinyTable } from './helpers.ts';

const hostOnTv = (over: Record<string, unknown> = {}) => ({ name: 'Living room', maxPlayers: 3, bots: true, themeId: 'tiny-manor', ...over });

describe('a TV can host the room', () => {
  test('the TV opens an empty room it watches; the first phone in is the host and can start', async () => {
    const srv = await startServer();
    const tv = srv.client();
    const ack = await tv.ask('room:host', hostOnTv());
    expect(ack).toEqual({ ok: true, code: expect.stringMatching(/^\d{4}$/) });
    const open = await tv.waitFor('room:state', (s) => s.code === ack.code);
    expect(open.seats).toEqual([]);
    expect(open.mode).toBe('tv');

    const mei = srv.client(), beng = srv.client();
    expect(await mei.ask('room:join', { code: ack.code, playerName: 'Mei' })).toMatchObject({ ok: true, seat: 0 });
    await beng.ask('room:join', { code: ack.code, playerName: 'Ah Beng' });
    const lobby = await tv.waitFor('room:state', (s) => s.seats.length === 2);
    expect(lobby.hostSeat).toBe(0);
    expect(await beng.ask('lobby:start')).toMatchObject({ ok: false });
    expect(await mei.ask('lobby:start')).toEqual({ ok: true });
    const intro = await tv.waitFor('room:state', (s) => s.phase === 'intro');
    expect(intro.seats).toHaveLength(3); // bots filled the rest
  });

  test('the TV never gets a seat, so it cannot act', async () => {
    const srv = await startServer();
    const tv = srv.client();
    await tv.ask('room:host', hostOnTv());
    expect(await tv.ask('lobby:start')).toMatchObject({ ok: false });
    expect(await tv.ask('lobby:fillBots')).toMatchObject({ ok: false });
  });

  test('an unknown board is refused', async () => {
    const srv = await startServer();
    expect(await srv.client().ask('room:host', hostOnTv({ themeId: 'nope' }))).toEqual({ ok: false, error: 'unknown theme' });
  });
});

describe('leaving mid-game', () => {
  test('everyone is told who left, and a bot plays their character from then on', async () => {
    const { players: [p0, p1], tv } = await tinyTable('s-1');
    const from = tv.mark();
    expect(await p1!.ask('room:leave')).toEqual({ ok: true });
    const events = await tv.waitFor('game:events', (es) => es.some((e: any) => e.type === 'seatLeft'), 3000, from);
    expect(events).toContainEqual({ type: 'seatLeft', seat: 1 });
    const s = await p0!.waitFor('room:state', (st) => st.seats[1]?.isBot === true, 3000, from);
    expect(s.seats[1].name).toBe('P1');
    expect(s.phase).toBe('play');
  });
});
