import { cp, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { loadThemePack } from '@cluedo/theme-sdk';
import { applyIntent, createGame, privateView, reachable } from '../src/index.ts';
import { ok } from './helpers.ts';

const TINY = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../themes/_fixtures/tiny-manor');

/** tiny-manor with one edit to its manifest. */
async function tinyWith(edit: (m: any) => void) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'pack-'));
  await cp(TINY, dir, { recursive: true });
  const m = JSON.parse(await readFile(path.join(dir, 'theme.json'), 'utf8'));
  edit(m);
  await writeFile(path.join(dir, 'theme.json'), JSON.stringify(m));
  return (await loadThemePack(dir)).theme;
}
const seats = [{ characterId: 'P1' }, { characterId: 'P2' }, { characterId: 'P3' }];

describe('a room reachable only by secret passage', () => {
  test('rolling there with nowhere to go ends the move instead of stranding the turn', async () => {
    // The Library (H2) loses its door; the Cellar (H3) still has its passage to it.
    const theme = await tinyWith((m) => { m.board.doors = m.board.doors.filter((d: any) => d.room !== 'H2'); });
    let g = createGame(theme, seats, 'trap');
    // seat 0 walks to the Cellar door is not needed: put P1 in the Library via the passage from the Cellar.
    // P3 starts at 0,3 next to the Cellar door (1,3); play seat 0 and 1 quickly, then seat 2 walks in and passes through.
    for (const seat of [0, 1]) {
      g = ok(theme, g, seat, { type: 'roll' }).g;
      g = ok(theme, g, seat, { type: 'move', node: reachable(g, theme).find((n) => !n.startsWith('R:'))! }).g;
      g = ok(theme, g, seat, { type: 'endTurn' }).g;
    }
    g = ok(theme, g, 2, { type: 'roll' }).g;
    if (!reachable(g, theme).includes('R:H3')) return; // this seed cannot reach the Cellar; the next assertion needs it
    g = ok(theme, g, 2, { type: 'move', node: 'R:H3' }).g;
    g = ok(theme, g, 2, { type: 'suggest', sus: 'P3', obj: 'W1' }).g;
    if (g.stage === 'disprove') {
      const p = g.pending!;
      const card = privateView(g, p.asked).hand.find((c) => [p.trio.sus, p.trio.room, p.trio.obj].includes(c))!;
      g = ok(theme, g, p.asked, { type: 'showCard', card }).g;
    }
    g = ok(theme, g, 2, { type: 'endTurn' }).g;
    for (const seat of [0, 1]) {
      g = ok(theme, g, seat, { type: 'roll' }).g;
      const sq = reachable(g, theme).find((n) => !n.startsWith('R:'));
      g = sq ? ok(theme, g, seat, { type: 'move', node: sq }).g : g;
      g = ok(theme, g, seat, { type: 'endTurn' }).g;
    }
    g = ok(theme, g, 2, { type: 'secretPassage' }).g; // now in the doorless Library
    g = ok(theme, g, 2, { type: 'suggest', sus: 'P3', obj: 'W1' }).g;
    if (g.stage === 'disprove') {
      const p = g.pending!;
      const card = privateView(g, p.asked).hand.find((c) => [p.trio.sus, p.trio.room, p.trio.obj].includes(c))!;
      g = ok(theme, g, p.asked, { type: 'showCard', card }).g;
    }
    g = ok(theme, g, 2, { type: 'endTurn' }).g;
    for (const seat of [0, 1]) {
      g = ok(theme, g, seat, { type: 'roll' }).g;
      const sq = reachable(g, theme).find((n) => !n.startsWith('R:'));
      g = sq ? ok(theme, g, seat, { type: 'move', node: sq }).g : g;
      g = ok(theme, g, seat, { type: 'endTurn' }).g;
    }
    const rolled = ok(theme, g, 2, { type: 'roll' }).g;
    expect(reachable(rolled, theme)).toEqual([]);
    expect(rolled.stage).toBe('end');
    expect(applyIntent(rolled, 2, { type: 'endTurn' }, { theme })).not.toHaveProperty('error');
  });
});

describe('more than one accusation per player', () => {
  test('a wrong guess costs a chance; you only become a ghost when you run out', async () => {
    const theme = await tinyWith((m) => { m.rules.accusationsPerPlayer = 2; });
    const g = createGame(theme, seats, 'two-tries');
    const wrong = { ...g.envelope, obj: ['W1', 'W2', 'W3'].find((o) => o !== g.envelope.obj)! };
    const { g: after, events } = ok(theme, g, 0, { type: 'accuse', ...wrong });
    expect(after.out[0]).toBe(false);
    expect(events).not.toContainEqual({ type: 'becameGhost', seat: 0 });
    expect(after.turn).toBe(1); // a wrong accusation still ends your turn
    expect(privateView(after, 0).envelope).toBeUndefined();
  });
});
