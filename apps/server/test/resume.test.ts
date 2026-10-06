import { describe, expect, test } from 'vitest';
import { createRoom, startServer, tinySeed, handOf } from './helpers.ts';

describe('coming back after a refresh or a dropped connection', () => {
  test('creating and joining hand out a secret seat token that is never broadcast', async () => {
    const { client } = await startServer();
    const host = client();
    const created = await createRoom(host);
    expect(created.token).toMatch(/^[0-9a-f-]{36}$/);
    const guest = client();
    const joined = await guest.ask('room:join', { code: created.code, playerName: 'G' });
    expect(joined.token).toMatch(/^[0-9a-f-]{36}$/);
    const s = await host.waitFor('room:state', (st) => st.seats.length === 2);
    expect(JSON.stringify(s)).not.toContain(created.token);
  });

  test('a new connection with the token takes the seat back and gets its private state again', async () => {
    const seed = await tinySeed(() => true);
    const srv = await startServer({ seed: () => seed });
    const host = srv.client();
    const { code } = await createRoom(host, { themeId: 'tiny-manor', maxPlayers: 3 });
    const guest = srv.client();
    const { token } = await guest.ask('room:join', { code, playerName: 'G' });
    await host.ask('lobby:fillBots');
    await host.ask('lobby:start');
    const hand = (await guest.waitFor('game:private')).hand;

    guest.socket.disconnect();
    await host.waitFor('room:state', (st) => st.seats[1]?.connected === false);
    const back = srv.client();
    expect(await back.ask('room:resume', { code, token })).toEqual({ ok: true, seat: 1 });
    expect((await back.waitFor('game:private')).hand).toEqual(hand);
    await host.waitFor('room:state', (st) => st.seats[1]?.connected === true);
    expect(await back.ask('intro:ready')).toEqual({ ok: true }); // acts as seat 1 again
  });

  test('a wrong token or code is refused', async () => {
    const { client } = await startServer();
    const { code } = await createRoom(client());
    expect(await client().ask('room:resume', { code, token: '00000000-0000-0000-0000-000000000000' })).toEqual({ ok: false, error: 'cannot resume' });
    expect(await client().ask('room:resume', { code: '9999', token: '00000000-0000-0000-0000-000000000000' })).toEqual({ ok: false, error: 'cannot resume' });
  });
});
