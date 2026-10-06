import type { NodeId } from '@cluedo/theme-sdk';

export type CardId = string;
export type SeatIndex = number;
export interface Trio { sus: CardId; room: CardId; obj: CardId }

export type Stage = 'roll' | 'move' | 'suggest' | 'disprove' | 'end' | 'over';

export interface GameState {
  /** Seats in clockwise order; each seat plays one suspect. */
  seats: { characterId: CardId }[];
  /** PRIVATE: one hand per seat. */
  hands: CardId[][];
  /** SERVER ONLY. */
  envelope: Trio;
  /** Token position of every suspect in the deck, seated or not. */
  pos: Record<CardId, NodeId>;
  turn: SeatIndex;
  stage: Stage;
  round: number;
  /** Current roll (stage move). */
  dice?: number;
  /** Where the active seat started its turn (to forbid ending there). */
  turnStart?: NodeId;
  /** Suggestion being disproved. `asked` is the seat that must show a card. */
  pending?: { by: SeatIndex; trio: Trio; asked: SeatIndex };
  /** PRIVATE per seat: cards shown to that seat. */
  shown: { card: CardId; from: SeatIndex }[][];
  /** Ghosts: wrong accusers. */
  out: boolean[];
  accusations: number[];
  winner?: SeatIndex;
  stats: { suspCount: number[]; showCount: number[]; reactCount: number[] };
  rng: number;
}
