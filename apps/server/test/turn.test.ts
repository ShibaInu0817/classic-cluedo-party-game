import { describe, expect, test } from 'vitest';
import { PRIVATE_EVENTS } from '@cluedo/protocol';
import { handOf, tinySeed, tinyTable } from './helpers.ts';

describe('a turn over the network', () => {
  test('a player who is not on turn cannot roll, and nothing changes', async () => {
    const { players: [, p1], tv } = await tinyTable('any');
    expect(await p1!.ask('game:intent', { type: 'roll' })).toEqual({ ok: false, error: 'not your turn' });
    expect(tv.latest('room:state').game.stage).toBe('roll');
  });

  test('roll → walk into a room → suggest → the holder shows a card; only the suggester learns which', async () => {
    // seat 0 can reach the Hall (H1) on its first roll, and seat 1 holds a suspect card to show.
    const seed = await tinySeed((g, roll) => roll >= 2 && handOf(g, 1).some((c) => c.startsWith('P')));
    const { players: [p0, p1, p2], tv } = await tinyTable(seed);

    expect(await p0!.ask('game:intent', { type: 'roll' })).toEqual({ ok: true });
    const rolled = await p0!.waitFor('room:state', (s) => s.game?.stage === 'move');
    expect(rolled.reach).toContain('R:H1');
    expect(await p0!.ask('game:intent', { type: 'move', node: 'R:H1' })).toEqual({ ok: true });

    const hand1: string[] = (await p1!.waitFor('game:private')).hand;
    const sus = hand1.find((c) => c.startsWith('P'))!;
    const obj = ['W1', 'W2', 'W3'].find((o) => !hand1.includes(o))!;
    expect(await p0!.ask('game:intent', { type: 'suggest', sus, obj })).toEqual({ ok: true });

    const request = await p1!.waitFor('game:showRequest');
    expect(request.by).toBe(0);
    expect(request.cards).toContain(sus);
    expect(await p1!.ask('game:intent', { type: 'showCard', card: sus })).toEqual({ ok: true });

    expect(await p0!.waitFor('game:shown')).toEqual({ card: sus, from: 1 });
    const publicShown = await tv.waitFor('game:events', (es) => es.some((e: any) => e.type === 'cardShown'));
    expect(publicShown.find((e: any) => e.type === 'cardShown')).toEqual({ type: 'cardShown', from: 1, to: 0 });

    for (const other of [p2!, tv]) {
      for (const e of PRIVATE_EVENTS) if (e !== 'game:private') expect(other.events(e)).toEqual([]);
    }
    expect(tv.events('game:private')).toEqual([]);
  });

  test('every suggestion is kept as public history: who asked what, who passed, who showed', async () => {
    // seat 1 holds none of (X, H1, W1) and passes; seat 2 holds suspect X and must show.
    const xOf = (g: any) => handOf(g, 2).find((c) => c.startsWith('P'));
    const seed = await tinySeed((g, roll) => {
      const x = xOf(g);
      return roll >= 2 && !!x && ![x, 'H1', 'W1'].some((c) => handOf(g, 1).includes(c));
    });
    const { players: [p0, , p2], tv } = await tinyTable(seed);
    await p0!.ask('game:intent', { type: 'roll' });
    await p0!.ask('game:intent', { type: 'move', node: 'R:H1' });
    const sus = ((await p2!.waitFor('game:private')).hand as string[]).find((c) => c.startsWith('P'))!;
    await p0!.ask('game:intent', { type: 'suggest', sus, obj: 'W1' });
    const s = await tv.waitFor('room:state', (st) => st.suggestions?.[0]?.shownBy !== undefined);
    expect(s.suggestions).toEqual([{ by: 0, trio: { sus, room: 'H1', obj: 'W1' }, passed: [1], shownBy: 2 }]);
  });
});
