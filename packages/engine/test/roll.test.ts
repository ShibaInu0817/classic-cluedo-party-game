import { describe, expect, test } from 'vitest';
import { applyIntent } from '../src/index.ts';
import { ok, tinyGame } from './helpers.ts';

describe('rolling the die', () => {
  test('the active seat rolls 1..dieSides and moves on to the move stage', async () => {
    const { theme, g } = await tinyGame();
    const { g: after, events } = ok(theme, g, 0, { type: 'roll' });
    expect(after.stage).toBe('move');
    expect(after.dice).toBeGreaterThanOrEqual(1);
    expect(after.dice).toBeLessThanOrEqual(theme.rules.dieSides);
    expect(events).toEqual([{ type: 'rolled', seat: 0, value: after.dice }]);
  });

  test('another seat cannot roll, and rolling twice is refused', async () => {
    const { theme, g } = await tinyGame();
    expect(applyIntent(g, 1, { type: 'roll' }, { theme })).toEqual({ error: 'not your turn' });
    const { g: rolled } = ok(theme, g, 0, { type: 'roll' });
    expect(applyIntent(rolled, 0, { type: 'roll' }, { theme })).toEqual({ error: 'cannot roll now' });
  });

  test('rolls are reproducible from the seed', async () => {
    const a = await tinyGame('same');
    const b = await tinyGame('same');
    expect(ok(a.theme, a.g, 0, { type: 'roll' }).g.dice).toBe(ok(b.theme, b.g, 0, { type: 'roll' }).g.dice);
  });
});
