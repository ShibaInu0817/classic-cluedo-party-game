import type { NodeId } from '@cluedo/theme-sdk';
import type { GameEvent } from './intents.ts';
import type { CardId, GameState, SeatIndex, Stage, Trio } from './types.ts';

/** Everything any player or the TV may see. Built field by field: a new GameState field stays private by default. */
export interface PublicGame {
  seats: { characterId: CardId }[];
  pos: Record<CardId, NodeId>;
  turn: SeatIndex;
  stage: Stage;
  round: number;
  dice?: number;
  pending?: { by: SeatIndex; trio: Trio; asked: SeatIndex };
  out: boolean[];
  /** Accusations each seat has made. */
  accusations: number[];
  handSizes: number[];
  winner?: SeatIndex;
  /** Only once the game is over. */
  answer?: Trio;
  stats: GameState['stats'];
}

export function publicView(g: GameState): PublicGame {
  const v: PublicGame = {
    seats: g.seats.map((s) => ({ characterId: s.characterId })),
    pos: { ...g.pos },
    turn: g.turn,
    stage: g.stage,
    round: g.round,
    out: [...g.out],
    accusations: [...g.accusations],
    handSizes: g.hands.map((h) => h.length),
    stats: {
      suspCount: [...g.stats.suspCount],
      showCount: [...g.stats.showCount],
      reactCount: [...g.stats.reactCount],
    },
  };
  if (g.dice !== undefined) v.dice = g.dice;
  if (g.pending) v.pending = { by: g.pending.by, trio: { ...g.pending.trio }, asked: g.pending.asked };
  if (g.winner !== undefined) v.winner = g.winner;
  if (g.stage === 'over') v.answer = { ...g.envelope };
  return v;
}

export type PublicEvent = Exclude<GameEvent, { type: 'cardShown' }> | { type: 'cardShown'; from: SeatIndex; to: SeatIndex };

/** Strips the private part of an event (the card in cardShown). */
export function publicEvent(e: GameEvent): PublicEvent {
  if (e.type === 'cardShown') return { type: 'cardShown', from: e.from, to: e.to };
  return e;
}
