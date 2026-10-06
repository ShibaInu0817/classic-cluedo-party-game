import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { beforeAll, describe, expect, test } from 'vitest';
import { loadThemePack, type CompiledTheme } from '../src/index.ts';
import { CNY, ROOT } from './helpers.ts';

/** The prototype's own board module, used as the oracle for the compiled CNY board. */
function prototypeCore() {
  const file = path.join(ROOT, 'prototype/design_handoff_who_killed_the_guest/prototype/game-core.js');
  const window: any = {};
  vm.runInNewContext(readFileSync(file, 'utf8'), { window });
  return window.GC as { RB: Record<string, unknown>; ADJ: Record<string, string[]>; STARTS: Record<string, string>; SECRET: Record<string, string> };
}
const SUS_ZH = ['二叔', '大姑', '表哥', '大嫂', '姑丈', '伯母']; // S01..S06, as in the handoff's asset sheet

describe('the CNY theme pack', () => {
  let theme: CompiledTheme;
  let warnings: string[];
  const GC = prototypeCore();
  const roomId = Object.fromEntries(Object.keys(GC.RB).map((zh, i) => [zh, `R0${i + 1}`]));
  const toId = (node: string) => (node.startsWith('R:') ? `R:${roomId[node.slice(2)]}` : node);

  beforeAll(async () => ({ theme, warnings } = await loadThemePack(CNY)));

  test('loads with no warnings', () => {
    expect(theme.id).toBe('cny-guest');
    expect(warnings).toEqual([]);
  });

  test('compiles to exactly the prototype movement graph', () => {
    const expected = Object.fromEntries(Object.entries(GC.ADJ).map(([k, v]) => [toId(k), v.map(toId).sort()]));
    const actual = Object.fromEntries(Object.entries(theme.board.adj).map(([k, v]) => [k, [...v].sort()]));
    expect(actual).toEqual(expected);
  });

  test('keeps the prototype start squares and secret passages', () => {
    const starts = Object.fromEntries(theme.deck.suspects.map((s, i) => [SUS_ZH[i], s.start]));
    expect(starts).toEqual(GC.STARTS);
    const passages = Object.fromEntries(Object.entries(GC.SECRET).map(([a, b]) => [roomId[a], roomId[b]]));
    expect(theme.board.passages).toEqual(passages);
  });
});
