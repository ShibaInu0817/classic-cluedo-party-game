import type { CompiledTheme } from '@cluedo/theme-sdk';
import { Rng, seedFrom } from './rng.ts';
import type { CardId, GameState, SeatIndex } from './types.ts';

export function createGame(theme: CompiledTheme, seats: { characterId: CardId }[], seed: string): GameState {
  const rng = new Rng(seedFrom(seed));
  const { suspects, rooms, objects } = theme.deck;
  const envelope = {
    sus: rng.pick(suspects).id,
    room: rng.pick(rooms).id,
    obj: rng.pick(objects).id,
  };
  const inEnvelope = new Set([envelope.sus, envelope.room, envelope.obj]);
  const rest = rng.shuffle([...suspects, ...rooms, ...objects].map((c) => c.id).filter((id) => !inEnvelope.has(id)));
  const hands: CardId[][] = seats.map(() => []);
  rest.forEach((card, i) => hands[i % seats.length]!.push(card));

  const n = seats.length;
  return {
    seats: seats.map((s) => ({ characterId: s.characterId })),
    hands,
    envelope,
    pos: Object.fromEntries(suspects.map((s) => [s.id, s.start])),
    turn: 0,
    stage: 'roll',
    round: 1,
    shown: seats.map(() => []),
    out: Array(n).fill(false),
    accusations: Array(n).fill(0),
    stats: { suspCount: Array(n).fill(0), showCount: Array(n).fill(0), reactCount: Array(n).fill(0) },
    rng: rng.state,
  };
}

export interface PrivateView {
  hand: CardId[];
  shown: { card: CardId; from: SeatIndex }[];
  /** Only for a seat that accused wrongly. */
  envelope?: GameState['envelope'];
}

export function privateView(g: GameState, seat: SeatIndex): PrivateView {
  const view: PrivateView = { hand: [...g.hands[seat]!], shown: [...g.shown[seat]!] };
  if (g.out[seat]) view.envelope = { ...g.envelope }; // a wrong accuser sees the answer
  return view;
}

/** A reaction sticker was sent; counted for the "life of the party" award. */
export function recordReaction(g: GameState, seat: SeatIndex): GameState {
  const reactCount = g.stats.reactCount.map((v, i) => (i === seat ? v + 1 : v));
  return { ...g, stats: { ...g.stats, reactCount } };
}
