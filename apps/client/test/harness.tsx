import { act, render } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { RoomState } from '@cluedo/protocol';
import type { GameSocket } from '../src/net/socket.ts';
import { createGameStore, GameProvider, type GameStore } from '../src/state/store.ts';
import { ThemeProvider } from '../src/theme/ThemeProvider.tsx';
import { tinyBundle } from './fixtures.ts';

/** Stands in for the server at the network boundary: records what the UI asks, lets tests push messages. */
export class FakeSocket implements GameSocket {
  asked: { event: string; payload: any }[] = [];
  replies: Record<string, any> = {};
  private handlers = new Map<string, Set<(d: any) => void>>();
  async ask(event: string, payload: unknown = {}) {
    this.asked.push({ event, payload });
    return this.replies[event] ?? { ok: true };
  }
  on(event: string, cb: (d: any) => void) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(cb);
    return () => this.handlers.get(event)!.delete(cb);
  }
  push(event: string, data: unknown) {
    act(() => this.handlers.get(event)?.forEach((h) => h(data)));
  }
  last(event: string) {
    return [...this.asked].reverse().find((a) => a.event === event)?.payload;
  }
}

export function renderGame(ui: ReactNode, opts: { seat?: number; lang?: string; bundle?: ReturnType<typeof tinyBundle> } = {}) {
  const socket = new FakeSocket();
  const store: GameStore = createGameStore(socket);
  if (opts.seat !== undefined) store.setState({ me: { seat: opts.seat, code: '4821' } });
  const utils = render(
    <ThemeProvider bundle={opts.bundle ?? tinyBundle()} lang={opts.lang ?? 'en'}>
      <GameProvider store={store}>{ui}</GameProvider>
    </ThemeProvider>,
  );
  return { ...utils, socket, store };
}

export function lobbyState(over: Partial<RoomState> = {}): RoomState {
  return {
    code: '4821',
    name: 'Test',
    themeId: 'tiny-manor',
    mode: 'tv',
    maxPlayers: 3,
    minPlayers: 3,
    bots: false,
    phase: 'lobby',
    hostSeat: 0,
    gameNo: 1,
    createdAt: 1,
    seats: [{ seat: 0, name: 'Host', isBot: false, connected: true }],
    log: [],
    ...over,
  };
}

import type { PublicGame } from '@cluedo/engine';

/** A tiny-manor game in progress: seats play P1, P2, P3 (Baron, Cook, Maid). */
export function playState(game: Partial<PublicGame> = {}, over: Partial<RoomState> = {}): RoomState {
  return lobbyState({
    phase: 'play',
    seats: [
      { seat: 0, name: 'Host', characterId: 'P1', isBot: false, connected: true },
      { seat: 1, name: 'Ah Beng', characterId: 'P2', isBot: false, connected: true },
      { seat: 2, name: 'Bot 1', characterId: 'P3', isBot: true, connected: true },
    ],
    game: {
      seats: [{ characterId: 'P1' }, { characterId: 'P2' }, { characterId: 'P3' }],
      pos: { P1: '3,0', P2: '6,3', P3: '0,3' },
      turn: 0,
      stage: 'roll',
      round: 1,
      out: [false, false, false],
      accusations: [0, 0, 0],
      handSizes: [2, 2, 2],
      stats: { suspCount: [0, 0, 0], showCount: [0, 0, 0], reactCount: [0, 0, 0] },
      ...game,
    },
    deadline: Date.now() + 60_000,
    ...over,
  });
}
