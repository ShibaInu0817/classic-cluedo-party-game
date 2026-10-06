import { describe, expect, test } from 'vitest';
import { tinyTable } from './helpers.ts';

describe('the turn clock', () => {
  test('every turn has a public deadline, rules.turnSeconds from now', async () => {
    const before = Date.now();
    const { tv } = await tinyTable('clock');
    const s = tv.latest('room:state');
    expect(s.deadline).toBeGreaterThanOrEqual(before + 60_000);
    expect(s.deadline).toBeLessThanOrEqual(Date.now() + 60_000);
  });

  test('when it runs out the turn passes on, and everyone is told it timed out', async () => {
    const { tv } = await tinyTable('clock', { turnMs: 150 });
    const s = await tv.waitFor('room:state', (st) => st.game?.turn === 1, 2000);
    expect(s.game.stage).toBe('roll');
    const events = tv.events('game:events').flat();
    expect(events).toContainEqual({ type: 'timedOut', seat: 0 });
  });

  test('acting resets nothing: the clock belongs to the turn, not the action', async () => {
    const { players: [p0], tv } = await tinyTable('clock', { turnMs: 300 });
    const first = tv.latest('room:state').deadline;
    await p0!.ask('game:intent', { type: 'roll' });
    const after = await tv.waitFor('room:state', (st) => st.game?.stage === 'move');
    expect(after.deadline).toBe(first);
  });
});
