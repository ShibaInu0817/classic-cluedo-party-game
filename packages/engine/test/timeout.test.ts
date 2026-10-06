import { describe, expect, test } from 'vitest';
import { privateView, timeoutTurn } from '../src/index.ts';
import { inHallWith, ok, SUS, tinyGame } from './helpers.ts';

describe('when the turn timer runs out', () => {
  test('before rolling, the turn simply passes on', async () => {
    const { theme, g } = await tinyGame();
    const { state, events } = timeoutTurn(g, theme);
    expect(state.turn).toBe(1);
    expect(events).toEqual([{ type: 'timedOut', seat: 0 }, { type: 'turnStarted', seat: 1, round: 1 }]);
  });

  test('an owed suggestion is skipped', async () => {
    const { theme, g } = await inHallWith(() => true);
    expect(g.stage).toBe('suggest');
    expect(timeoutTurn(g, theme).state.turn).toBe(1);
  });

  test('a seat that stalls when asked is the one named, shows its first matching card, and the suggester keeps the turn', async () => {
    const { theme, g, hands } = await inHallWith((h) => h[1]!.some((c) => SUS.includes(c)));
    const sus = hands[1]!.find((c) => SUS.includes(c))!;
    const asking = ok(theme, g, 0, { type: 'suggest', sus, obj: 'W1' }).g;
    const { state, events } = timeoutTurn(asking, theme);
    expect(events[0]).toEqual({ type: 'timedOut', seat: 1 }); // the staller, not the suggester
    expect(events.find((e) => e.type === 'cardShown')).toMatchObject({ from: 1, to: 0 });
    expect(privateView(state, 0).shown).toHaveLength(1);
    expect(state.turn).toBe(0);
    expect(state.stage).toBe('end');
  });
});
