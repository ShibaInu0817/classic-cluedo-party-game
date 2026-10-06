import { describe, expect, test } from 'vitest';
import { awardWinners, type PublicGame } from '../src/index.ts';

const game = (over: Partial<PublicGame>): PublicGame => ({
  seats: [{ characterId: 'A' }, { characterId: 'B' }, { characterId: 'C' }],
  pos: {}, turn: 0, stage: 'over', round: 3, out: [false, false, false], accusations: [0, 0, 0], handSizes: [2, 2, 2],
  stats: { suspCount: [0, 0, 0], showCount: [0, 0, 0], reactCount: [0, 0, 0] },
  ...over,
});

describe('awards at the end of a game', () => {
  const defs = [
    { stat: 'correctAccuse', labelKey: 'a' },
    { stat: 'suspCount', labelKey: 'b' },
    { stat: 'showCount', labelKey: 'c', lowest: true },
    { stat: 'reactCount', labelKey: 'd' },
  ];

  test('each award goes to the seat with the highest (or lowest) count; the detective award goes to the winner', () => {
    const g = game({ winner: 2, stats: { suspCount: [1, 4, 0], showCount: [3, 1, 2], reactCount: [0, 0, 5] } });
    expect(awardWinners(g, defs).map((a) => a.seat)).toEqual([2, 1, 1, 2]);
  });

  test('an award nobody earned is left out (no winner, no reactions)', () => {
    const g = game({ stats: { suspCount: [0, 2, 0], showCount: [1, 1, 0], reactCount: [0, 0, 0] } });
    expect(awardWinners(g, defs).map((a) => [a.stat, a.seat])).toEqual([['suspCount', 1], ['showCount', 2]]);
  });

  test('an unknown stat in a theme is ignored rather than crashing', () => {
    expect(awardWinners(game({}), [{ stat: 'nope', labelKey: 'x' }])).toEqual([]);
  });
});
