import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { io as connect, type Socket } from 'socket.io-client';
import { afterEach } from 'vitest';
import { createGameServer, type GameServerOptions } from '../src/index.ts';

const THEMES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../themes');
export const CNY_DIR = path.join(THEMES, 'cny-guest');
export const TINY_DIR = path.join(THEMES, '_fixtures/tiny-manor');

const running: { close: () => Promise<void> }[] = [];
const sockets: Socket[] = [];
afterEach(async () => {
  sockets.splice(0).forEach((s) => s.disconnect());
  await Promise.all(running.splice(0).map((s) => s.close()));
});

/** Starts a real server on a free port and returns a factory for real socket.io clients. */
export async function startServer(opts: Partial<GameServerOptions> = {}) {
  const server = await createGameServer({ themeDirs: [CNY_DIR, TINY_DIR], botDelayMs: 0, ...opts });
  const port = await server.listen(0);
  running.push(server);
  const url = `http://localhost:${port}`;
  return {
    url,
    server,
    client(): Client {
      const s = connect(url, { transports: ['websocket'], forceNew: true });
      sockets.push(s);
      return new Client(s);
    },
  };
}

/** Thin test wrapper: emit-with-ack as a promise, and wait for messages. Everything it records was really received. */
export class Client {
  received: { event: string; data: any }[] = [];
  constructor(public socket: Socket) {
    socket.onAny((event, data) => this.received.push({ event, data }));
  }
  ask<T = any>(event: string, payload: unknown = {}): Promise<T> {
    return this.socket.timeout(3000).emitWithAck(event, payload);
  }
  /** Resolves with the first `event` (already received or upcoming) whose data satisfies `pred`. */
  /** A marker for `waitFor(..., from)`: only messages received after this point will match. */
  mark() {
    return this.received.length;
  }
  waitFor<T = any>(event: string, pred: (d: any) => boolean = () => true, ms = 3000, from = 0): Promise<T> {
    const hit = this.received.slice(from).find((m) => m.event === event && pred(m.data));
    if (hit) return Promise.resolve(hit.data);
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error(`timed out waiting for ${event}`)), ms);
      const h = (e: string, d: any) => {
        if (e === event && pred(d)) {
          clearTimeout(t);
          this.socket.offAny(h);
          resolve(d);
        }
      };
      this.socket.onAny(h);
    });
  }
  latest(event: string) {
    return [...this.received].reverse().find((m) => m.event === event)?.data;
  }
  events(event: string) {
    return this.received.filter((m) => m.event === event).map((m) => m.data);
  }
}

export const createRoom = (c: Client, over: Record<string, unknown> = {}) =>
  c.ask('room:create', { name: 'Test room', maxPlayers: 6, mode: 'tv', bots: false, themeId: 'cny-guest', playerName: 'Host', ...over });

import { loadThemePack } from '@cluedo/theme-sdk';
import { applyIntent, createGame, privateView, type GameState } from '@cluedo/engine';

/** Uses the engine as an oracle to find a seed whose tiny-manor deal satisfies `want` (seats play P1, P2, P3). */
export async function tinySeed(want: (g: GameState, firstRoll: number) => boolean): Promise<string> {
  const { theme } = await loadThemePack(TINY_DIR);
  for (let i = 0; i < 5000; i++) {
    const seed = `s-${i}`;
    const g = createGame(theme, [{ characterId: 'P1' }, { characterId: 'P2' }, { characterId: 'P3' }], seed);
    const r = applyIntent(g, 0, { type: 'roll' }, { theme });
    if ('state' in r && want(g, r.state.dice!)) return seed;
  }
  throw new Error('no seed found');
}
export const handOf = (g: GameState, seat: number) => privateView(g, seat).hand;

/** The envelope the server deals for this seed on tiny-manor (seats P1, P2, P3). */
export async function envelopeFor(seed: string) {
  const { theme } = await loadThemePack(TINY_DIR);
  return createGame(theme, [{ characterId: 'P1' }, { characterId: 'P2' }, { characterId: 'P3' }], seed).envelope;
}

/** Three humans in a tiny-manor room, started with a fixed seed. Seat i plays P(i+1). */
export async function tinyTable(seed: string, opts: Record<string, unknown> = {}) {
  const srv = await startServer({ seed: () => seed, ...opts });
  const [p0, p1, p2] = [srv.client(), srv.client(), srv.client()];
  const { code } = await createRoom(p0, { themeId: 'tiny-manor', maxPlayers: 3 });
  const tv = srv.client();
  await tv.ask('room:watch', { code });
  await p1.ask('room:join', { code, playerName: 'P1' });
  await p2.ask('room:join', { code, playerName: 'P2' });
  await p0.ask('lobby:start');
  await Promise.all([p0, p1, p2].map((c) => c.ask('intro:ready')));
  await Promise.all([p0, p1, p2, tv].map((c) => c.waitFor('room:state', (s) => s.phase === 'play')));
  return { ...srv, players: [p0, p1, p2], tv, code };
}

/** Makes a client answer every show-card request with its first allowed card, as a person would. */
export function autoShow(c: Client) {
  c.socket.on('game:showRequest', (r: { cards: string[] }) => {
    void c.ask('game:intent', { type: 'showCard', card: r.cards[0] });
  });
}

/** One human host and bots in the other seats, on tiny-manor. */
export async function soloWithBots(opts: Record<string, unknown> = {}) {
  const srv = await startServer(opts);
  const human = srv.client();
  autoShow(human);
  const { code } = await createRoom(human, { themeId: 'tiny-manor', maxPlayers: 3 });
  const tv = srv.client();
  await tv.ask('room:watch', { code });
  await human.ask('lobby:fillBots');
  await human.ask('lobby:start');
  await human.ask('intro:ready');
  await human.waitFor('room:state', (s) => s.phase === 'play');
  return { ...srv, human, tv, code };
}

/** The human rolls, steps onto a corridor square (or into a room and suggests), then ends the turn. */
export async function playHumanTurn(c: Client) {
  const from = c.mark();
  await c.ask('game:intent', { type: 'roll' });
  const s = await c.waitFor('room:state', (st) => st.game?.stage === 'move' && st.game.turn === 0, 3000, from);
  const square = (s.reach as string[]).find((n) => !n.startsWith('R:'));
  if (square) {
    await c.ask('game:intent', { type: 'move', node: square });
  } else {
    await c.ask('game:intent', { type: 'move', node: s.reach[0] });
    await c.ask('game:intent', { type: 'suggest', sus: 'P2', obj: 'W1' });
    await c.waitFor('room:state', (st) => st.game?.stage === 'end', 3000, from);
  }
  await c.ask('game:intent', { type: 'endTurn' });
}
