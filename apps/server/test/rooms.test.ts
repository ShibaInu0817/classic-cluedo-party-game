import { describe, expect, test } from 'vitest';
import { createRoom, startServer } from './helpers.ts';

describe('creating and joining a room', () => {
  test('the host gets a 4-digit code and seat 0; a second player joins by that code', async () => {
    const { client } = await startServer();
    const host = client();
    const created = await createRoom(host);
    expect(created).toMatchObject({ ok: true, seat: 0 });
    expect(created.code).toMatch(/^\d{4}$/);

    const guest = client();
    expect(await guest.ask('room:join', { code: created.code, playerName: 'Ah Beng' })).toMatchObject({ ok: true, seat: 1 });
    const state = await host.waitFor('room:state', (s) => s.seats.length === 2);
    expect(state.seats.map((s: any) => s.name)).toEqual(['Host', 'Ah Beng']);
  });

  test('an unknown code is refused', async () => {
    const { client } = await startServer();
    expect(await client().ask('room:join', { code: '0000', playerName: 'X' })).toEqual({ ok: false, error: 'room not found' });
  });

  test('a full room is refused', async () => {
    const { client } = await startServer();
    const { code } = await createRoom(client(), { maxPlayers: 3, themeId: 'tiny-manor' });
    await client().ask('room:join', { code, playerName: 'B' });
    await client().ask('room:join', { code, playerName: 'C' });
    expect(await client().ask('room:join', { code, playerName: 'D' })).toEqual({ ok: false, error: 'room is full' });
  });

  test('a room for an unknown theme is refused', async () => {
    const { client } = await startServer();
    expect(await createRoom(client(), { themeId: 'nope' })).toEqual({ ok: false, error: 'unknown theme' });
  });
});
