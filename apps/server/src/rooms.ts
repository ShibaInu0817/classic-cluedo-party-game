import type { CompiledTheme } from '@cluedo/theme-sdk';
import { reachable, type GameState, type PublicEvent } from '@cluedo/engine';
import type { Phase, RoomState, SuggestionRecord } from '@cluedo/protocol';
import { hostSeat } from './lobby.ts';

export interface Seat {
  name: string;
  characterId?: string;
  isBot: boolean;
  socketId?: string;
  /** Secret that lets this seat be resumed from a new connection. Never broadcast. */
  token?: string;
}

export interface Room {
  code: string;
  name: string;
  theme: CompiledTheme;
  mode: 'phones' | 'tv';
  maxPlayers: number;
  bots: boolean;
  phase: Phase;
  seats: Seat[];
  game?: GameState;
  deadline?: number;
  log: PublicEvent[];
  /** Intro: seats that are ready. */
  ready?: boolean[];
  suggestions: SuggestionRecord[];
  /** Every public event of the current game. */
  history: PublicEvent[];
  votes?: (boolean | null)[];
  paused?: boolean;
  gameNo: number;
  createdAt: number;
  /** TV sockets watching this room. */
  watchers: Set<string>;
  idleTimer?: ReturnType<typeof setTimeout>;
}

/** Owns every live room, in memory, keyed by its 4-digit code. */
export class RoomManager {
  private rooms = new Map<string, Room>();

  create(init: Omit<Room, 'code' | 'phase' | 'seats' | 'log' | 'history' | 'suggestions' | 'watchers' | 'gameNo' | 'createdAt'>, host: Seat): Room {
    let code: string;
    do code = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    while (this.rooms.has(code));
    const room: Room = { ...init, code, phase: 'lobby', seats: [host], log: [], history: [], suggestions: [], watchers: new Set(), gameNo: 0, createdAt: Date.now() };
    this.rooms.set(code, room);
    return room;
  }

  get(code: string) {
    return this.rooms.get(code);
  }

  delete(code: string) {
    this.rooms.delete(code);
  }

  all() {
    return [...this.rooms.values()];
  }
}

export function roomState(r: Room, publicGame?: RoomState['game']): RoomState {
  const m = r.theme.manifest.meta;
  return {
    code: r.code,
    name: r.name,
    themeId: r.theme.id,
    mode: r.mode,
    maxPlayers: r.maxPlayers,
    bots: r.bots,
    minPlayers: m.players.min,
    phase: r.phase,
    hostSeat: hostSeat(r),
    gameNo: r.gameNo,
    createdAt: r.createdAt,
    paused: r.phase === 'play' ? !!r.paused : undefined,
    seats: r.seats.map((s, seat) => ({
      seat,
      name: s.name,
      characterId: s.characterId,
      isBot: s.isBot,
      connected: s.isBot || !!s.socketId,
    })),
    ready: r.phase === 'intro' ? r.ready : undefined,
    game: publicGame,
    reach: r.game ? reachable(r.game, r.theme) : undefined,
    deadline: r.deadline,
    log: r.log.slice(-30),
    suggestions: r.game ? r.suggestions : undefined,
    history: r.phase === 'end' ? r.history : undefined,
    votes: r.phase === 'end' ? r.votes : undefined,
  };
}
