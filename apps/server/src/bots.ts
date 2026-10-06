import { isRoomNode, roomOf, type CompiledTheme } from '@cluedo/theme-sdk';
import { privateView, reachable, type GameEvent, type GameState, type Intent } from '@cluedo/engine';

/**
 * How long a bot waits before acting, so people can follow: it lets its dice land before moving,
 * and waits longest after a suggestion is settled so everyone can read who showed what.
 */
export function botDelay(g: Pick<GameState, 'stage'>, lastEvents: GameEvent[], base: number): number {
  const settled = lastEvents.some((e) => e.type === 'cardShown' || e.type === 'noDisprove');
  const factor =
    g.stage === 'move' ? 2.2 : g.stage === 'disprove' ? 2 : g.stage === 'suggest' ? 1.8 : g.stage === 'end' ? (settled ? 4 : 1.2) : 1;
  return Math.round(base * factor);
}

/** Cards a bot has not yet ruled out, per category: everything except its hand and the cards shown to it. */
export function candidates(g: GameState, theme: CompiledTheme, seat: number) {
  const v = privateView(g, seat);
  const known = new Set([...v.hand, ...v.shown.map((s) => s.card)]);
  const open = (cards: { id: string }[]) => cards.map((c) => c.id).filter((id) => !known.has(id));
  return { sus: open(theme.deck.suspects), room: open(theme.deck.rooms), obj: open(theme.deck.objects) };
}

/**
 * What a bot does next. It remembers its hand and every card shown to it:
 * it accuses as soon as one card is left in each category, walks towards rooms it has not ruled out,
 * suggests cards it has not ruled out, and shows its first matching card when asked.
 */
export function botIntent(g: GameState, theme: CompiledTheme, seat: number, random: () => number): Intent | undefined {
  const pick = <T>(xs: T[]) => xs[Math.floor(random() * xs.length)]!;

  if (g.stage === 'disprove' && g.pending?.asked === seat) {
    const t = g.pending.trio;
    const card = privateView(g, seat).hand.find((c) => c === t.sus || c === t.room || c === t.obj);
    return card ? { type: 'showCard', card } : undefined;
  }
  if (g.turn !== seat || g.out[seat]) return undefined;
  const c = candidates(g, theme, seat);

  if (g.stage !== 'disprove' && c.sus.length === 1 && c.room.length === 1 && c.obj.length === 1) {
    return { type: 'accuse', sus: c.sus[0]!, room: c.room[0]!, obj: c.obj[0]! };
  }

  switch (g.stage) {
    case 'roll': {
      const here = roomOf(g.pos[g.seats[seat]!.characterId]!);
      const through = here ? theme.board.passages[here] : undefined;
      if (through && c.room.includes(through)) return { type: 'secretPassage' };
      return { type: 'roll' };
    }
    case 'move': {
      const reach = reachable(g, theme);
      const rooms = reach.filter(isRoomNode);
      const wanted = rooms.filter((n) => c.room.includes(roomOf(n)!));
      if (wanted.length) return { type: 'move', node: pick(wanted) };
      // Head for the nearest square to a room; any room will do if none is wanted and one is in reach.
      const dist = (n: string) => theme.board.roomDist[n] ?? Infinity;
      const corridor = reach.filter((n) => !isRoomNode(n)).sort((a, b) => dist(a) - dist(b));
      if (corridor.length) return { type: 'move', node: corridor[0]! };
      return rooms.length ? { type: 'move', node: pick(rooms) } : { type: 'endTurn' };
    }
    case 'suggest':
      return {
        type: 'suggest',
        sus: c.sus.length ? pick(c.sus) : pick(theme.deck.suspects).id,
        obj: c.obj.length ? pick(c.obj) : pick(theme.deck.objects).id,
      };
    case 'end':
      return { type: 'endTurn' };
    default:
      return undefined;
  }
}
