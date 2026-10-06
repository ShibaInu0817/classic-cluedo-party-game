import { z } from 'zod';
import type { PublicEvent, PublicGame, PrivateView } from '@cluedo/engine';

/** Client → server. Every event is emitted with an ack callback that receives an `Ack`. */
export const C2S = {
  'room:create': z.object({
    name: z.string().trim().min(1).max(40),
    maxPlayers: z.number().int().min(2).max(12),
    mode: z.enum(['phones', 'tv']),
    bots: z.boolean(),
    themeId: z.string(),
    playerName: z.string().trim().min(1).max(20),
  }),
  'room:join': z.object({ code: z.string().regex(/^\d{4}$/), playerName: z.string().trim().min(1).max(20) }),
  'room:watch': z.object({ code: z.string().regex(/^\d{4}$/) }),
  /** Take your seat back after a refresh, with the token from create/join. */
  'room:resume': z.object({ code: z.string().regex(/^\d{4}$/), token: z.string().uuid() }),
  /** Leave the room (lobby: frees the seat). */
  'room:leave': z.object({}),
  'lobby:pickChar': z.object({ characterId: z.string() }),
  /** Host: remove a player from the lobby. */
  'lobby:kick': z.object({ seat: z.number().int().min(0) }),
  /** Host: pause or resume the game. */
  'game:pause': z.object({ paused: z.boolean() }),
  'lobby:fillBots': z.object({}),
  'lobby:start': z.object({}),
  /** I have read the story and checked my cards. */
  'intro:ready': z.object({}),
  /** Host: skip the intro for everyone. */
  'intro:skip': z.object({}),
  'game:intent': z.discriminatedUnion('type', [
    z.object({ type: z.literal('roll') }),
    z.object({ type: z.literal('move'), node: z.string() }),
    z.object({ type: z.literal('secretPassage') }),
    z.object({ type: z.literal('suggest'), sus: z.string(), obj: z.string() }),
    z.object({ type: z.literal('showCard'), card: z.string() }),
    z.object({ type: z.literal('accuse'), sus: z.string(), room: z.string(), obj: z.string() }),
    z.object({ type: z.literal('endTurn') }),
  ]),
  react: z.object({ stickerId: z.string() }),
  'end:vote': z.object({ rematch: z.boolean() }),
} as const;

export type C2SEvent = keyof typeof C2S;
export type C2SPayload<E extends C2SEvent> = z.infer<(typeof C2S)[E]>;
export type Ack<T = {}> = ({ ok: true } & T) | { ok: false; error: string };

/** lobby → intro (story, setup, private card check) → play → end (reveal, results, rematch vote). */
export type Phase = 'lobby' | 'intro' | 'play' | 'end';

export interface SeatInfo {
  seat: number;
  name: string;
  characterId?: string;
  isBot: boolean;
  connected: boolean;
}

/** The whole public picture of a room. Sent to every seat and to TVs. Never contains private data. */
export interface RoomState {
  code: string;
  name: string;
  themeId: string;
  mode: 'phones' | 'tv';
  maxPlayers: number;
  minPlayers: number;
  /** Empty seats are filled with bots at Start. */
  bots: boolean;
  phase: Phase;
  hostSeat: number;
  /** 1 for the first game in this room, 2 after a rematch… */
  gameNo: number;
  /** When the room was created (epoch ms): tells apart rooms that reuse a code. */
  createdAt: number;
  seats: SeatInfo[];
  game?: PublicGame;
  /** Squares/rooms the active seat may move to (stage 'move'). Public: anyone could work it out. */
  reach?: string[];
  /** Intro: which seats are ready (bots always are). */
  ready?: boolean[];
  paused?: boolean;
  /** Epoch ms when the current turn times out. */
  deadline?: number;
  log: PublicEvent[];
  /** Every suggestion this game: public, so phones can auto-mark notes (never which card was shown). */
  suggestions?: SuggestionRecord[];
  /** End: every public event of the game, for the case timeline. */
  history?: PublicEvent[];
  /** End: rematch votes per seat (null = not voted; bots never vote). */
  votes?: (boolean | null)[];
}

export interface SuggestionRecord {
  by: number;
  trio: { sus: string; room: string; obj: string };
  /** Seats that had none of the three cards. */
  passed: number[];
  /** The seat that showed the suggester a card, if any. */
  shownBy?: number;
}

/** Server → client messages. */
export interface S2C {
  'room:state': RoomState;
  /** Public events as they happen (dice, moves, suggestions, "A showed B"…). */
  'game:events': PublicEvent[];
  /** PRIVATE to one seat: hand, cards shown to you, and the envelope after a wrong accusation. */
  'game:private': PrivateView;
  /** PRIVATE: you hold a match for the current suggestion; pick one of these to show. */
  'game:showRequest': { by: number; cards: string[] };
  /** PRIVATE: the card shown to you. */
  'game:shown': { card: string; from: number };
  reaction: { seat: number; stickerId: string };
  /** Your seat number changed (someone before you left the lobby). */
  'room:you': { seat: number };
  /** The host removed you from the lobby. */
  'room:kicked': {};
}
export const PRIVATE_EVENTS = ['game:private', 'game:showRequest', 'game:shown'] as const;
