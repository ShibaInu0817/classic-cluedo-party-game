import type { CompiledTheme, NodeId } from '@cluedo/theme-sdk';
import { isRoomNode, roomOf } from '@cluedo/theme-sdk';
import { Rng } from './rng.ts';
import { movePath, reachable } from './movement.ts';
import type { CardId, GameState, SeatIndex, Trio } from './types.ts';

export type Intent =
  | { type: 'roll' }
  | { type: 'move'; node: NodeId }
  | { type: 'secretPassage' }
  | { type: 'suggest'; sus: CardId; obj: CardId }
  | { type: 'showCard'; card: CardId }
  | { type: 'accuse'; sus: CardId; room: CardId; obj: CardId }
  | { type: 'endTurn' };

/** Everything that happened. Events marked PRIVATE are split out by the projection. */
export type GameEvent =
  | { type: 'rolled'; seat: SeatIndex; value: number }
  | { type: 'moved'; seat: SeatIndex; character: CardId; path: NodeId[]; passage?: true }
  | { type: 'suggested'; seat: SeatIndex; trio: Trio }
  | { type: 'asked'; seat: SeatIndex; has: boolean }
  | { type: 'noDisprove'; seat: SeatIndex }
  /** PRIVATE `card`: only the suggester may see it. */
  | { type: 'cardShown'; from: SeatIndex; to: SeatIndex; card: CardId }
  | { type: 'turnStarted'; seat: SeatIndex; round: number }
  /** Deliberately carries no guess: a wrong accusation is announced without it. */
  | { type: 'accused'; seat: SeatIndex; correct: boolean }
  | { type: 'becameGhost'; seat: SeatIndex }
  | { type: 'gameWon'; seat: SeatIndex; envelope: Trio }
  | { type: 'gameOver'; envelope: Trio }
  | { type: 'timedOut'; seat: SeatIndex };

export interface Ctx { theme: CompiledTheme }
export type Result = { state: GameState; events: GameEvent[] } | { error: string };

const matches = (hand: CardId[], t: Trio) => hand.filter((c) => c === t.sus || c === t.room || c === t.obj);
const seatOf = (g: GameState, character: CardId) => g.seats.findIndex((s) => s.characterId === character);

export function applyIntent(g: GameState, seat: SeatIndex, intent: Intent, ctx: Ctx): Result {
  if (g.stage === 'over') return { error: 'the game is over' };
  if (intent.type === 'showCard') return showCard(g, seat, intent.card);
  if (g.out[seat]) return { error: 'ghosts cannot act' };
  if (g.turn !== seat) return { error: 'not your turn' };
  switch (intent.type) {
    case 'roll': {
      if (g.stage !== 'roll') return { error: 'cannot roll now' };
      const rng = new Rng(g.rng);
      const value = 1 + rng.int(ctx.theme.rules.dieSides);
      const turnStart = g.pos[g.seats[seat]!.characterId];
      const rolled: GameState = { ...g, stage: 'move', dice: value, turnStart, rng: rng.state };
      // Nowhere to go (e.g. a room reachable only by secret passage): the move is over.
      if (reachable(rolled, ctx.theme).length === 0) rolled.stage = 'end';
      return { state: rolled, events: [{ type: 'rolled', seat, value }] };
    }
    case 'move': {
      if (g.stage !== 'move') return { error: 'cannot move now' };
      const path = movePath(g, ctx.theme, intent.node);
      if (!path) return { error: 'square not reachable' };
      const character = g.seats[seat]!.characterId;
      return {
        state: { ...g, pos: { ...g.pos, [character]: intent.node }, stage: isRoomNode(intent.node) ? 'suggest' : 'end' },
        events: [{ type: 'moved', seat, character, path }],
      };
    }
    case 'secretPassage': {
      const character = g.seats[seat]!.characterId;
      const from = g.pos[character]!;
      const to = ctx.theme.board.passages[roomOf(from) ?? ''];
      if (g.stage !== 'roll' || !to) return { error: 'no secret passage here' };
      const node = `R:${to}`;
      return {
        state: { ...g, pos: { ...g.pos, [character]: node }, stage: 'suggest', turnStart: from },
        events: [{ type: 'moved', seat, character, path: [from, node], passage: true }],
      };
    }
    case 'suggest':
      return suggest(g, seat, intent, ctx);
    case 'accuse':
      return accuse(g, seat, intent, ctx);
    case 'endTurn':
      if (g.stage !== 'end') return { error: 'cannot end turn now' };
      return advanceTurn(g);
    default:
      return { error: `unknown intent` };
  }
}

function suggest(g: GameState, seat: SeatIndex, intent: { sus: CardId; obj: CardId }, ctx: Ctx): Result {
  const room = roomOf(g.pos[g.seats[seat]!.characterId]!);
  if (g.stage !== 'suggest' || !room) return { error: 'cannot suggest now' };
  const { suspects, objects } = ctx.theme.deck;
  if (!suspects.some((c) => c.id === intent.sus) || !objects.some((c) => c.id === intent.obj)) {
    return { error: 'unknown card' };
  }
  const trio: Trio = { sus: intent.sus, room, obj: intent.obj };
  const events: GameEvent[] = [{ type: 'suggested', seat, trio }];
  const suspCount = [...g.stats.suspCount];
  const named = seatOf(g, trio.sus);
  if (named >= 0) suspCount[named]!++;
  const base: GameState = { ...g, pos: { ...g.pos, [trio.sus]: `R:${room}` }, stats: { ...g.stats, suspCount } };

  const n = g.seats.length;
  for (let k = 1; k < n; k++) {
    const other = (seat + k) % n;
    const has = matches(g.hands[other]!, trio).length > 0;
    events.push({ type: 'asked', seat: other, has });
    if (has) return { state: { ...base, stage: 'disprove', pending: { by: seat, trio, asked: other } }, events };
  }
  events.push({ type: 'noDisprove', seat });
  return { state: { ...base, stage: 'end' }, events };
}

function showCard(g: GameState, seat: SeatIndex, card: CardId): Result {
  const p = g.pending;
  if (g.stage !== 'disprove' || !p || p.asked !== seat) return { error: 'you are not being asked' };
  if (!matches(g.hands[seat]!, p.trio).includes(card)) return { error: 'that card does not match' };
  const shown = g.shown.map((list, i) => (i === p.by ? [...list, { card, from: seat }] : list));
  const showCount = g.stats.showCount.map((v, i) => (i === seat ? v + 1 : v));
  return {
    state: { ...g, stage: 'end', pending: undefined, shown, stats: { ...g.stats, showCount } },
    events: [{ type: 'cardShown', from: seat, to: p.by, card }],
  };
}

/** Next seat clockwise that is not a ghost; the round goes up when the turn passes seat 0. */
export function advanceTurn(g: GameState): { state: GameState; events: GameEvent[] } {
  const n = g.seats.length;
  let turn = g.turn;
  let round = g.round;
  do {
    turn = (turn + 1) % n;
    if (turn === 0) round++;
  } while (g.out[turn] && turn !== g.turn);
  return {
    state: { ...g, turn, round, stage: 'roll', dice: undefined, turnStart: undefined, pending: undefined },
    events: [{ type: 'turnStarted', seat: turn, round }],
  };
}

function accuse(g: GameState, seat: SeatIndex, t: Trio, ctx: Ctx): Result {
  if (g.stage === 'disprove') return { error: 'cannot accuse now' };
  if (g.accusations[seat]! >= ctx.theme.rules.accusationsPerPlayer) return { error: 'no accusations left' };
  const accusations = g.accusations.map((v, i) => (i === seat ? v + 1 : v));
  const e = g.envelope;
  if (t.sus === e.sus && t.room === e.room && t.obj === e.obj) {
    return {
      state: { ...g, accusations, stage: 'over', winner: seat },
      events: [{ type: 'accused', seat, correct: true }, { type: 'gameWon', seat, envelope: e }],
    };
  }
  const events: GameEvent[] = [{ type: 'accused', seat, correct: false }];
  if (accusations[seat]! < ctx.theme.rules.accusationsPerPlayer) {
    // Chances left: the wrong guess just ends the turn.
    const next = advanceTurn({ ...g, accusations });
    return { state: next.state, events: [...events, ...next.events] };
  }
  const out = g.out.map((v, i) => v || i === seat);
  events.push({ type: 'becameGhost', seat });
  const state: GameState = { ...g, accusations, out };
  if (out.every(Boolean)) {
    return { state: { ...state, stage: 'over' }, events: [...events, { type: 'gameOver', envelope: e }] };
  }
  const next = advanceTurn(state);
  return { state: next.state, events: [...events, ...next.events] };
}

/**
 * The clock ran out. If a seat was being asked to disprove, that seat is the one that timed out: its first
 * matching card is shown and the suggester keeps the turn (stage 'end'). Otherwise the turn passes on.
 */
export function timeoutTurn(g: GameState, theme: CompiledTheme): { state: GameState; events: GameEvent[] } {
  void theme;
  if (g.stage === 'over') return { state: g, events: [] };
  if (g.stage === 'disprove' && g.pending) {
    const asked = g.pending.asked;
    const card = matches(g.hands[asked]!, g.pending.trio)[0]!;
    const r = showCard(g, asked, card) as { state: GameState; events: GameEvent[] };
    return { state: r.state, events: [{ type: 'timedOut', seat: asked }, ...r.events] };
  }
  const next = advanceTurn(g);
  return { state: next.state, events: [{ type: 'timedOut', seat: g.turn }, ...next.events] };
}
