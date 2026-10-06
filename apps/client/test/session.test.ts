import { describe, expect, test } from 'vitest';
import { createGameStore } from '../src/state/store.ts';
import { FakeSocket } from './harness.tsx';

const TOKEN = '11111111-2222-3333-4444-555555555555';
const tick = () => new Promise((r) => setTimeout(r, 0));

describe('the session survives a refresh', () => {
  test('after creating a room, a fresh page load takes the same seat back', async () => {
    const s1 = new FakeSocket();
    s1.replies['room:create'] = { ok: true, code: '4821', seat: 0, token: TOKEN };
    await createGameStore(s1).getState().createRoom({ name: 'x', maxPlayers: 3, mode: 'tv', bots: true, themeId: 't', playerName: 'Mei' });

    const s2 = new FakeSocket();
    s2.replies['room:resume'] = { ok: true, seat: 0 };
    const store = createGameStore(s2);
    await tick();
    expect(s2.last('room:resume')).toEqual({ code: '4821', token: TOKEN });
    expect(store.getState().me).toEqual({ seat: 0, code: '4821' });
  });

  test('a session the server no longer knows is forgotten', async () => {
    sessionStorage.setItem('session', JSON.stringify({ code: '4821', seat: 1, token: TOKEN }));
    const s = new FakeSocket();
    s.replies['room:resume'] = { ok: false, error: 'cannot resume' };
    const store = createGameStore(s);
    await tick();
    expect(store.getState().me).toBeUndefined();
    expect(sessionStorage.getItem('session')).toBeNull();
  });

  test('when someone before me leaves the lobby, my seat number follows', async () => {
    const s = new FakeSocket();
    s.replies['room:join'] = { ok: true, seat: 2, token: TOKEN };
    const store = createGameStore(s);
    await store.getState().joinRoom('4821', 'Ah Beng');
    s.push('room:you', { seat: 1 });
    expect(store.getState().me).toEqual({ seat: 1, code: '4821' });
    expect(JSON.parse(sessionStorage.getItem('session')!).seat).toBe(1);
  });

  test('being removed by the host, or leaving, clears the room and the session', async () => {
    const s = new FakeSocket();
    s.replies['room:join'] = { ok: true, seat: 1, token: TOKEN };
    const store = createGameStore(s);
    await store.getState().joinRoom('4821', 'Ah Beng');
    s.push('room:kicked', {});
    expect(store.getState().me).toBeUndefined();
    expect(sessionStorage.getItem('session')).toBeNull();

    await store.getState().joinRoom('4821', 'Ah Beng');
    await store.getState().leave();
    expect(s.last('room:leave')).toEqual({});
    expect(store.getState().me).toBeUndefined();
  });

  test('a TV that reconnects starts watching its room again', async () => {
    const s = new FakeSocket();
    const store = createGameStore(s);
    await store.getState().watchRoom('4821');
    s.asked = [];
    s.push('connect', undefined);
    await tick();
    expect(s.last('room:watch')).toEqual({ code: '4821' });
  });

  test('a new game in the same room starts with a clean feed and no leftover shown card', async () => {
    const s = new FakeSocket();
    const store = createGameStore(s);
    s.push('room:state', { code: '4821', gameNo: 1, seats: [], log: [] });
    s.push('game:events', [{ type: 'rolled', seat: 0, value: 3 }]);
    s.push('game:shown', { card: 'W1', from: 1 });
    s.push('room:state', { code: '4821', gameNo: 2, seats: [], log: [] });
    expect(store.getState().feed).toEqual([]);
    expect(store.getState().shownQueue).toEqual([]);
  });
});
