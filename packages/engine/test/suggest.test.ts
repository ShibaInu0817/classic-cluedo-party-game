import { describe, expect, test } from 'vitest';
import { applyIntent, privateView } from '../src/index.ts';
import { inHallWith, ok, OBJ, SUS } from './helpers.ts';

describe('suggesting and disproving', () => {
  test('the named suspect is pulled into the room and the first seat clockwise holding a match is asked', async () => {
    // seat 1 holds a suspect card, seat 2 holds an object card: seat 1 must be asked, not seat 2.
    const { theme, g, hands } = await inHallWith((h) => h[1]!.some((c) => SUS.includes(c)) && h[2]!.some((c) => OBJ.includes(c)));
    const sus = hands[1]!.find((c) => SUS.includes(c))!;
    const obj = hands[2]!.find((c) => OBJ.includes(c))!;
    const { g: after, events } = ok(theme, g, 0, { type: 'suggest', sus, obj });
    expect(after.pos[sus]).toBe('R:H1');
    expect(after.stage).toBe('disprove');
    expect(events).toContainEqual({ type: 'suggested', seat: 0, trio: { sus, room: 'H1', obj } });
    expect(events).toContainEqual({ type: 'asked', seat: 1, has: true });
    expect(events.find((e) => e.type === 'asked' && e.seat === 2)).toBeUndefined();
  });

  test('seats with no match pass in turn before the holder is asked', async () => {
    // seat 1 holds none of the trio; seat 2 holds the object.
    const { theme, g, hands } = await inHallWith((h) => !h[1]!.includes('H1') && h[2]!.some((c) => OBJ.includes(c)));
    const obj = hands[2]!.find((c) => OBJ.includes(c))!;
    const sus = SUS.find((c) => !hands[1]!.includes(c))!;
    const { events } = ok(theme, g, 0, { type: 'suggest', sus, obj });
    const asked = events.filter((e) => e.type === 'asked');
    expect(asked).toEqual([{ type: 'asked', seat: 1, has: false }, { type: 'asked', seat: 2, has: true }]);
  });

  test('when nobody holds a match the suggestion stands and the turn can end', async () => {
    const { theme, g, hands } = await inHallWith((h) => !h[1]!.includes('H1') && !h[2]!.includes('H1'));
    const sus = SUS.find((c) => !hands[1]!.includes(c) && !hands[2]!.includes(c));
    const obj = OBJ.find((c) => !hands[1]!.includes(c) && !hands[2]!.includes(c));
    if (!sus || !obj) return; // envelope always leaves one of each free; guarded for clarity
    const { g: after, events } = ok(theme, g, 0, { type: 'suggest', sus, obj });
    expect(events).toContainEqual({ type: 'noDisprove', seat: 0 });
    expect(after.stage).toBe('end');
  });

  test('the asked seat must show a matching card from its own hand; only the suggester learns which', async () => {
    const { theme, g, hands } = await inHallWith((h) => h[1]!.some((c) => SUS.includes(c)));
    const sus = hands[1]!.find((c) => SUS.includes(c))!;
    const obj = OBJ.find((c) => !hands[1]!.includes(c))!;
    const asking = ok(theme, g, 0, { type: 'suggest', sus, obj }).g;

    expect(applyIntent(asking, 2, { type: 'showCard', card: sus }, { theme })).toEqual({ error: 'you are not being asked' });
    const notMatching = hands[1]!.find((c) => c !== sus && c !== 'H1' && c !== obj);
    if (notMatching) {
      expect(applyIntent(asking, 1, { type: 'showCard', card: notMatching }, { theme })).toEqual({ error: 'that card does not match' });
    }

    const { g: after, events } = ok(theme, asking, 1, { type: 'showCard', card: sus });
    expect(events).toEqual([{ type: 'cardShown', from: 1, to: 0, card: sus }]);
    expect(privateView(after, 0).shown).toEqual([{ card: sus, from: 1 }]);
    expect(privateView(after, 2).shown).toEqual([]);
    expect(after.stage).toBe('end');
  });

  test('suggesting is only allowed inside a room, at the suggest stage', async () => {
    const { theme, g } = await inHallWith(() => true);
    const ended = ok(theme, g, 0, { type: 'suggest', sus: 'P1', obj: 'W1' }).g;
    expect(applyIntent(ended, 0, { type: 'suggest', sus: 'P1', obj: 'W1' }, { theme })).toEqual({ error: 'cannot suggest now' });
  });
});
