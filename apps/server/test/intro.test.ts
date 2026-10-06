import { describe, expect, test } from 'vitest';
import { createRoom, startServer } from './helpers.ts';

/** Host + one guest on tiny-manor, bots in the last seat, started but not yet ready. */
async function startedTable() {
  const srv = await startServer();
  const host = srv.client();
  const { code } = await createRoom(host, { themeId: 'tiny-manor', maxPlayers: 3 });
  const guest = srv.client();
  await guest.ask('room:join', { code, playerName: 'G' });
  const tv = srv.client();
  await tv.ask('room:watch', { code });
  await host.ask('lobby:fillBots');
  await host.ask('lobby:start');
  return { ...srv, host, guest, tv };
}

describe('the intro between Start and the first turn', () => {
  test('the deal happens at Start, but the turn clock waits while everyone reads the story and checks their cards', async () => {
    const { host, tv } = await startedTable();
    const s = await tv.waitFor('room:state', (st) => st.phase === 'intro');
    expect(s.deadline - Date.now()).toBeGreaterThan(60_000); // the intro's own limit (2 min), not a 60 s turn
    expect(s.ready).toEqual([false, false, true]); // bots are always ready
    expect((await host.waitFor('game:private')).hand.length).toBeGreaterThan(0);
  });

  test('play begins once every human is ready, and the TV sees who is ready', async () => {
    const { host, guest, tv } = await startedTable();
    expect(await guest.ask('intro:ready')).toEqual({ ok: true });
    await tv.waitFor('room:state', (st) => st.ready?.[1] === true && st.phase === 'intro');
    await host.ask('intro:ready');
    const s = await tv.waitFor('room:state', (st) => st.phase === 'play');
    expect(s.deadline).toBeGreaterThan(Date.now());
  });

  test('the host can skip the intro for everyone', async () => {
    const { host, guest, tv } = await startedTable();
    expect(await guest.ask('intro:skip')).toEqual({ ok: false, error: 'only the host can do that' });
    expect(await host.ask('intro:skip')).toEqual({ ok: true });
    await tv.waitFor('room:state', (st) => st.phase === 'play');
  });

  test('nobody can act on the board before play begins', async () => {
    const { host } = await startedTable();
    expect(await host.ask('game:intent', { type: 'roll' })).toEqual({ ok: false, error: 'the game has not begun' });
  });
});
