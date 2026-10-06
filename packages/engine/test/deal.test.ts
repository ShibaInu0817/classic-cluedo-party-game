import { beforeAll, describe, expect, test } from 'vitest';
import type { CompiledTheme } from '@cluedo/theme-sdk';
import { createGame, privateView } from '../src/index.ts';
import { loadCny } from './helpers.ts';

describe('dealing a new game', () => {
  let theme: CompiledTheme;
  beforeAll(async () => { theme = await loadCny(); });
  const seats = (n: number) => theme.deck.suspects.slice(0, n).map((s) => ({ characterId: s.id }));

  test('the envelope holds exactly one suspect, one room and one object', () => {
    const g = createGame(theme, seats(6), 'seed-1');
    expect(theme.deck.suspects.map((c) => c.id)).toContain(g.envelope.sus);
    expect(theme.deck.rooms.map((c) => c.id)).toContain(g.envelope.room);
    expect(theme.deck.objects.map((c) => c.id)).toContain(g.envelope.obj);
  });

  test('hands plus envelope are the whole deck, with no card twice, and hand sizes differ by at most one', () => {
    for (const n of [3, 4, 5, 6]) {
      const g = createGame(theme, seats(n), `seed-${n}`);
      const hands = g.seats.map((_, i) => privateView(g, i).hand);
      const all = [...hands.flat(), g.envelope.sus, g.envelope.room, g.envelope.obj].sort();
      const deck = [...theme.deck.suspects, ...theme.deck.rooms, ...theme.deck.objects].map((c) => c.id).sort();
      expect(all).toEqual(deck);
      const sizes = hands.map((h) => h.length);
      expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
    }
  });

  test('the same seed deals the same game; another seed deals a different one', () => {
    const a = createGame(theme, seats(6), 'same');
    const b = createGame(theme, seats(6), 'same');
    expect(b.envelope).toEqual(a.envelope);
    expect(privateView(b, 0).hand).toEqual(privateView(a, 0).hand);
    const deals = new Set(['x1', 'x2', 'x3', 'x4'].map((s) => JSON.stringify(createGame(theme, seats(6), s).envelope)));
    expect(deals.size).toBeGreaterThan(1);
  });
});
