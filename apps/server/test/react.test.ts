import { describe, expect, test } from 'vitest';
import { tinyTable } from './helpers.ts';

describe('reactions', () => {
  test('a sticker from any seat floats up on every phone and the TV, and counts toward the award', async () => {
    const { players: [, p1, p2], tv } = await tinyTable('react');
    expect(await p1!.ask('react', { stickerId: 'wave' })).toEqual({ ok: true });
    for (const c of [p2!, tv]) expect(await c.waitFor('reaction')).toEqual({ seat: 1, stickerId: 'wave' });
    const s = await tv.waitFor('room:state', (st) => st.game?.stats.reactCount[1] === 1);
    expect(s.game.stats.reactCount).toEqual([0, 1, 0]);
  });

  test('a sticker the theme does not define is refused', async () => {
    const { players: [p0] } = await tinyTable('react');
    expect(await p0!.ask('react', { stickerId: 'nope' })).toEqual({ ok: false, error: 'unknown sticker' });
  });

  test('spamming is throttled', async () => {
    const { players: [p0] } = await tinyTable('react');
    const acks = await Promise.all(Array.from({ length: 8 }, () => p0!.ask('react', { stickerId: 'wave' })));
    expect(acks.filter((a) => !a.ok).length).toBeGreaterThan(0);
  });
});
