import { describe, expect, test } from 'vitest';
import { TINY_DIR, createRoom, startServer } from './helpers.ts';

describe('the TV', () => {
  test('watches a room by code: it sees the lobby but never takes a seat', async () => {
    const { client } = await startServer();
    const host = client();
    const { code } = await createRoom(host);
    const tv = client();
    expect(await tv.ask('room:watch', { code })).toEqual({ ok: true });
    const s = await tv.waitFor('room:state', (st) => st.code === code);
    expect(s.seats).toHaveLength(1);

    const guest = client();
    await guest.ask('room:join', { code, playerName: 'G' });
    await tv.waitFor('room:state', (st) => st.seats.length === 2);
  });

  test('cannot act as a player', async () => {
    const { client } = await startServer();
    const { code } = await createRoom(client());
    const tv = client();
    await tv.ask('room:watch', { code });
    expect(await tv.ask('lobby:pickChar', { characterId: 'S01' })).toEqual({ ok: false, error: 'not in a room' });
  });

  test('an unknown code is refused', async () => {
    const { client } = await startServer();
    expect(await client().ask('room:watch', { code: '9999' })).toEqual({ ok: false, error: 'room not found' });
  });
});

describe('theme packs over HTTP', () => {
  test('GET /themes lists the loaded packs with their title and languages', async () => {
    const { url } = await startServer();
    const list = await (await fetch(`${url}/themes`)).json();
    expect(list.map((t: any) => t.id).sort()).toEqual(['cny-guest', 'tiny-manor']);
    expect(list.find((t: any) => t.id === 'cny-guest')).toMatchObject({ languages: ['zh', 'en'], players: { min: 3, max: 6 } });
  });

  test('pack files are served, and paths outside the pack are not', async () => {
    const { url } = await startServer();
    const manifest = await (await fetch(`${url}/themes/cny-guest/theme.json`)).json();
    expect(manifest.meta.id).toBe('cny-guest');
    const svg = await fetch(`${url}/themes/cny-guest/assets/suspects/S01.svg`);
    expect(svg.headers.get('content-type')).toMatch(/svg/);
    expect((await fetch(`${url}/themes/cny-guest/..%2F..%2Fpackage.json`)).status).toBe(404);
  });

  test('GET /homepage/ serves the homepage of the first pack that ships one', async () => {
    const { url } = await startServer();
    const page = await fetch(`${url}/homepage/`);
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('<title>Who Killed the Guest?</title>');
    expect((await fetch(`${url}/homepage/media/tv-en.jpg`)).headers.get('content-type')).toMatch(/jpeg/);
  });

  test('GET /homepage/ is not found when no pack ships a homepage', async () => {
    const { url } = await startServer({ themeDirs: [TINY_DIR] });
    expect((await fetch(`${url}/homepage/`)).status).toBe(404);
  });
});

describe('health check', () => {
  test('GET /healthz answers 200 with the number of loaded themes and live rooms', async () => {
    const { url, client } = await startServer();
    await createRoom(client());
    const res = await fetch(`${url}/healthz`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, themes: 2, rooms: 1 });
  });
});
