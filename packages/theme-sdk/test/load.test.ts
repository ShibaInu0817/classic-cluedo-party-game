import { describe, expect, test } from 'vitest';
import { loadThemePack } from '../src/index.ts';
import { TINY } from './helpers.ts';

describe('loadThemePack', () => {
  test('a non-CNY pack loads, with board size and deck counts taken from its data', async () => {
    const { theme } = await loadThemePack(TINY);
    expect(theme.id).toBe('tiny-manor');
    expect(theme.board.width).toBe(7);
    expect(theme.board.height).toBe(7);
    expect(theme.deck.suspects.map((s) => s.id)).toEqual(['P1', 'P2', 'P3']);
    expect(theme.deck.rooms).toHaveLength(3);
  });
});
