import { describe, expect, test } from 'vitest';
import { createRoom, startServer } from './helpers.ts';

async function hostAndGuest() {
  const srv = await startServer();
  const host = srv.client();
  const { code } = await createRoom(host);
  const guest = srv.client();
  await guest.ask('room:join', { code, playerName: 'Guest' });
  return { ...srv, host, guest, code };
}

describe('the lobby', () => {
  test('a character can be owned by one seat only, and everyone sees who owns it', async () => {
    const { host, guest } = await hostAndGuest();
    expect(await host.ask('lobby:pickChar', { characterId: 'S03' })).toEqual({ ok: true });
    expect(await guest.ask('lobby:pickChar', { characterId: 'S03' })).toEqual({ ok: false, error: 'character taken' });
    const s = await guest.waitFor('room:state', (st) => st.seats[0].characterId === 'S03');
    expect(s.seats[1].characterId).toBeUndefined();
  });

  test('picking another character frees the first one', async () => {
    const { host, guest } = await hostAndGuest();
    await host.ask('lobby:pickChar', { characterId: 'S03' });
    await host.ask('lobby:pickChar', { characterId: 'S04' });
    expect(await guest.ask('lobby:pickChar', { characterId: 'S03' })).toEqual({ ok: true });
  });

  test('an id that is not a suspect in this theme is refused', async () => {
    const { host } = await hostAndGuest();
    expect(await host.ask('lobby:pickChar', { characterId: 'R01' })).toEqual({ ok: false, error: 'unknown character' });
  });

  test('a socket that is not in a room cannot pick', async () => {
    const { client } = await startServer();
    expect(await client().ask('lobby:pickChar', { characterId: 'S01' })).toEqual({ ok: false, error: 'not in a room' });
  });

  test('a player who disconnects is shown as disconnected to the others', async () => {
    const { host, guest } = await hostAndGuest();
    guest.socket.disconnect();
    const s = await host.waitFor('room:state', (st) => st.seats[1]?.connected === false);
    expect(s.seats[1].name).toBe('Guest');
  });
});
