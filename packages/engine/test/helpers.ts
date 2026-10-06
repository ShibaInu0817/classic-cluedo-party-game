import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadThemePack, type CompiledTheme } from '@cluedo/theme-sdk';

const THEMES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../themes');
export const loadTiny = async (): Promise<CompiledTheme> => (await loadThemePack(path.join(THEMES, '_fixtures/tiny-manor'))).theme;
export const loadCny = async (): Promise<CompiledTheme> => (await loadThemePack(path.join(THEMES, 'cny-guest'))).theme;

import { applyIntent, createGame, type GameState, type Intent, type GameEvent } from '../src/index.ts';

/** A tiny-manor game with all 3 suspects seated in deck order. */
export async function tinyGame(seed = 't') {
  const theme = await loadTiny();
  return { theme, g: createGame(theme, theme.deck.suspects.map((s) => ({ characterId: s.id })), seed) };
}

/** Applies an intent that must succeed. */
export function ok(theme: CompiledTheme, g: GameState, seat: number, intent: Intent): { g: GameState; events: GameEvent[] } {
  const r = applyIntent(g, seat, intent, { theme });
  if ('error' in r) throw new Error(`expected ${intent.type} to succeed, got: ${r.error}`);
  return { g: r.state, events: r.events };
}

/** A tiny-manor game whose first roll (seat 0) will be `n`. */
export async function tinyGameRolling(n: number) {
  for (let i = 0; i < 500; i++) {
    const t = await tinyGame(`roll-${n}-${i}`);
    if (ok(t.theme, t.g, 0, { type: 'roll' }).g.dice === n) return t;
  }
  throw new Error(`no seed rolls ${n}`);
}

import { privateView } from '../src/index.ts';

/**
 * A tiny-manor game where seat 0 has just walked into the Hall (R:H1) and must suggest,
 * found by searching seeds until `want(hands)` holds.
 */
export async function inHallWith(want: (hands: string[][]) => boolean) {
  for (let i = 0; i < 2000; i++) {
    const { theme, g } = await tinyGame(`hall-${i}`);
    const hands = g.seats.map((_, s) => privateView(g, s).hand);
    if (!want(hands)) continue;
    const rolled = ok(theme, g, 0, { type: 'roll' }).g;
    if (rolled.dice! < 2) continue;
    return { theme, hands, g: ok(theme, rolled, 0, { type: 'move', node: 'R:H1' }).g };
  }
  throw new Error('no seed matches');
}
export const SUS = ['P1', 'P2', 'P3'];
export const OBJ = ['W1', 'W2', 'W3'];

/** Seat makes a suggestion and, if someone must disprove, that seat shows its first matching card. */
export function suggestAndResolve(theme: CompiledTheme, g: GameState, seat: number, sus: string, obj: string): GameState {
  let s = ok(theme, g, seat, { type: 'suggest', sus, obj }).g;
  if (s.stage === 'disprove') {
    const p = s.pending!;
    const card = privateView(s, p.asked).hand.find((c) => [p.trio.sus, p.trio.room, p.trio.obj].includes(c))!;
    s = ok(theme, s, p.asked, { type: 'showCard', card }).g;
  }
  return s;
}

/**
 * Seat 0 (P1) rolls 6, walks into the Library (H2, which has a secret passage to the Cellar H3)
 * and names P2 there, so seat 1 (P2) starts its turn inside H2.
 */
export async function p2StartsInLibrary() {
  const { theme, g } = await tinyGameRolling(6);
  let s = ok(theme, ok(theme, g, 0, { type: 'roll' }).g, 0, { type: 'move', node: 'R:H2' }).g;
  s = suggestAndResolve(theme, s, 0, 'P2', 'W1');
  s = ok(theme, s, 0, { type: 'endTurn' }).g;
  return { theme, g: s };
}
