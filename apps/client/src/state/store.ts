import { createContext, createElement, useContext, type ReactNode } from 'react';
import { createStore, useStore, type StoreApi } from 'zustand';
import type { PrivateView, PublicEvent } from '@cluedo/engine';
import type { Ack, C2SPayload, RoomState } from '@cluedo/protocol';
import type { Intent } from '@cluedo/engine';
import type { GameSocket } from '../net/socket.ts';

export interface GameData {
  /** This device's seat in the room (undefined for a TV). */
  me?: { seat: number; code: string };
  room?: RoomState;
  priv?: PrivateView;
  showRequest?: { by: number; cards: string[] };
  /** Cards shown to me that I have not dismissed yet. */
  shownQueue: { card: string; from: number }[];
  reactions: { id: number; seat: number; stickerId: string }[];
  feed: PublicEvent[];
  /** The last accusation whose moment has finished on this screen. */
  accuseDone?: PublicEvent;
  /** The card this phone last showed, so it can say "You showed X" (the public event never names it). */
  myShown?: string;
  error?: string;
}

export interface GameActions {
  createRoom(p: C2SPayload<'room:create'>): Promise<Ack<{ code: string }>>;
  joinRoom(code: string, playerName: string): Promise<Ack>;
  watchRoom(code: string): Promise<Ack>;
  pickChar(characterId: string): Promise<Ack>;
  fillBots(): Promise<Ack>;
  start(): Promise<Ack>;
  introReady(): Promise<Ack>;
  introSkip(): Promise<Ack>;
  vote(rematch: boolean): Promise<Ack>;
  kick(seat: number): Promise<Ack>;
  pause(paused: boolean): Promise<Ack>;
  intent(i: Intent): Promise<Ack>;
  react(stickerId: string): Promise<Ack>;
  dismissShown(): void;
  doneAccusation(e: PublicEvent): void;
  leave(): Promise<void>;
}

export type GameStoreState = GameData & GameActions;
export type GameStore = StoreApi<GameStoreState>;

let reactionId = 0;

interface Session { code: string; seat: number; token: string }
/** Per tab, so several players can share one device's browser during testing. */
const session = {
  get(): Session | undefined {
    try { return JSON.parse(sessionStorage.getItem('session') ?? 'null') ?? undefined; } catch { return undefined; }
  },
  set(s: Session) {
    try { sessionStorage.setItem('session', JSON.stringify(s)); } catch { /* ignore */ }
  },
  clear() {
    try { sessionStorage.removeItem('session'); } catch { /* ignore */ }
  },
};

/** All client game state. Fed only by the server's messages; actions only send intents. */
export function createGameStore(socket: GameSocket): GameStore {
  const store = createStore<GameStoreState>()((set, get) => {
    const ask = async (event: string, payload: unknown = {}) => {
      const ack = await socket.ask(event, payload);
      set({ error: ack.ok ? undefined : ack.error });
      return ack;
    };
    return {
      shownQueue: [],
      reactions: [],
      feed: [],
      async createRoom(p) {
        const ack = await ask('room:create', p);
        if (ack.ok) seated((ack as any).code, (ack as any).seat, (ack as any).token);
        return ack as Ack<{ code: string }>;
      },
      async joinRoom(code, playerName) {
        const ack = await ask('room:join', { code, playerName });
        if (ack.ok) seated(code, (ack as any).seat, (ack as any).token);
        return ack;
      },
      async watchRoom(code) {
        watching = code;
        return ask('room:watch', { code });
      },
      pickChar: (characterId) => ask('lobby:pickChar', { characterId }),
      fillBots: () => ask('lobby:fillBots'),
      start: () => ask('lobby:start'),
      introReady: () => ask('intro:ready'),
      introSkip: () => ask('intro:skip'),
      vote: (rematch) => ask('end:vote', { rematch }),
      kick: (seat) => ask('lobby:kick', { seat }),
      pause: (paused) => ask('game:pause', { paused }),
      async intent(i) {
        if (i.type === 'showCard') set({ myShown: i.card });
        const ack = await ask('game:intent', i);
        if (ack.ok && i.type === 'showCard') set({ showRequest: undefined });
        return ack;
      },
      react: (stickerId) => ask('react', { stickerId }),
      dismissShown: () => set({ shownQueue: get().shownQueue.slice(1) }),
      doneAccusation: (e) => set({ accuseDone: e }),
      async leave() {
        if (get().me) await socket.ask('room:leave', {});
        reset();
      },
    };
  });

  function seated(code: string, seat: number, token: string) {
    session.set({ code, seat, token });
    store.setState({ me: { seat, code } });
  }
  function reset() {
    session.clear();
    store.setState({ me: undefined, room: undefined, priv: undefined, showRequest: undefined, shownQueue: [], feed: [] });
  }
  /** Takes back a saved seat: at start-up and after every reconnect. */
  async function resume() {
    const saved = session.get();
    if (!saved) return;
    const ack = await socket.ask<{ seat: number }>('room:resume', { code: saved.code, token: saved.token });
    if (ack.ok) seated(saved.code, ack.seat, saved.token);
    else {
      reset();
      store.setState({ error: 'room.ended' }); // e.g. the server restarted and its rooms are gone
    }
  }
  /** A TV re-watches its room after every reconnect (it has no seat to resume). */
  let watching: string | undefined;
  void resume();
  socket.on('connect', () => {
    void resume();
    if (watching) void socket.ask('room:watch', { code: watching });
  });
  socket.on('room:you', ({ seat }: { seat: number }) => {
    const saved = session.get();
    if (saved) seated(saved.code, seat, saved.token);
  });
  socket.on('room:kicked', () => {
    reset();
    store.setState({ error: 'removed by the host' });
  });

  socket.on('room:state', (room: RoomState) => {
    const prev = store.getState();
    // A pending show request is over once nobody is waiting on this seat.
    const stillAsked = room.game?.pending?.asked === prev.me?.seat;
    const newGame = prev.room && prev.room.gameNo !== room.gameNo;
    store.setState({
      room,
      showRequest: stillAsked ? prev.showRequest : undefined,
      // A rematch starts clean: no replayed moves or dice, no leftover shown card.
      ...(newGame ? { feed: [], shownQueue: [] } : {}),
    });
  });
  socket.on('game:private', (priv: PrivateView) => store.setState({ priv }));
  socket.on('game:showRequest', (showRequest) => store.setState({ showRequest }));
  socket.on('game:shown', (s) => store.setState({ shownQueue: [...store.getState().shownQueue, s] }));
  socket.on('game:events', (events: PublicEvent[]) => store.setState({ feed: [...store.getState().feed, ...events].slice(-60) }));
  socket.on('reaction', (r) => {
    const id = ++reactionId;
    store.setState({ reactions: [...store.getState().reactions, { id, ...r }] });
    setTimeout(() => store.setState({ reactions: store.getState().reactions.filter((x) => x.id !== id) }), 2600);
  });
  return store;
}

const Ctx = createContext<GameStore | null>(null);

export function GameProvider({ store, children }: { store: GameStore; children: ReactNode }) {
  return createElement(Ctx.Provider, { value: store }, children);
}

export function useGame<T>(select: (s: GameStoreState) => T): T {
  const store = useContext(Ctx);
  if (!store) throw new Error('useGame outside GameProvider');
  return useStore(store, select);
}
