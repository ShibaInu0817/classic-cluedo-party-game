import { describe, expect, test } from 'vitest';
import { publicEvent, publicView } from '../src/index.ts';
import { inHallWith, ok, SUS, tinyGame } from './helpers.ts';

describe('what everyone (and the TV) may see', () => {
  test('the public view never contains hands, the envelope, shown cards or the RNG state', async () => {
    const { g } = await tinyGame();
    const v = publicView(g);
    for (const secret of ['hands', 'envelope', 'shown', 'rng']) expect(v).not.toHaveProperty(secret);
    expect(JSON.stringify(v)).not.toContain(JSON.stringify(g.hands[0]));
  });

  test('the answer becomes public only once the game is over', async () => {
    const { theme, g } = await tinyGame();
    expect(publicView(g)).not.toHaveProperty('answer');
    const over = ok(theme, g, 0, { type: 'accuse', ...g.envelope }).g;
    expect(publicView(over).answer).toEqual(g.envelope);
  });

  test('a shown card is public only as "from → to"', async () => {
    const { theme, g, hands } = await inHallWith((h) => h[1]!.some((c) => SUS.includes(c)));
    const sus = hands[1]!.find((c) => SUS.includes(c))!;
    const asking = ok(theme, g, 0, { type: 'suggest', sus, obj: 'W1' }).g;
    const [shown] = ok(theme, asking, 1, { type: 'showCard', card: sus }).events;
    expect(publicEvent(shown!)).toEqual({ type: 'cardShown', from: 1, to: 0 });
  });

  test('the suggestion being disproved and who is asked are public', async () => {
    const { theme, g, hands } = await inHallWith((h) => h[1]!.some((c) => SUS.includes(c)));
    const sus = hands[1]!.find((c) => SUS.includes(c))!;
    const asking = ok(theme, g, 0, { type: 'suggest', sus, obj: 'W1' }).g;
    expect(publicView(asking).pending).toEqual({ by: 0, trio: { sus, room: 'H1', obj: 'W1' }, asked: 1 });
  });
});
