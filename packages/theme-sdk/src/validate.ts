import type { Manifest } from './schema.ts';
import { ENVELOPE, compileBoard, roomNode } from './board.ts';

export class ThemeValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Theme pack is invalid:\n- ${issues.join('\n- ')}`);
    this.name = 'ThemeValidationError';
  }
}

/** Cross-reference checks that a schema alone cannot express. Returns issues (errors). */
export function crossCheck(m: Manifest): string[] {
  const issues: string[] = [];
  const rooms = new Set(m.deck.rooms.map((r) => r.id));
  const roomRef = (where: string, id: string) => {
    if (!rooms.has(id)) issues.push(`${where} refers to unknown room "${id}"`);
  };

  for (const [ch, id] of Object.entries(m.board.legend)) if (id !== ENVELOPE) roomRef(`board.legend["${ch}"]`, id);
  m.board.doors.forEach((d, i) => roomRef(`board.doors[${i}]`, d.room));
  m.board.secretPassages.forEach(([a, b], i) => {
    roomRef(`board.secretPassages[${i}]`, a);
    roomRef(`board.secretPassages[${i}]`, b);
  });
  const { min, max } = m.meta.players;
  if (min > max) issues.push(`meta.players.min ${min} is above max ${max}`);
  if (m.deck.suspects.length < max) {
    issues.push(`meta.players.max ${max} needs at least ${max} suspects, found ${m.deck.suspects.length} suspects`);
  }
  for (const cat of ['suspects', 'rooms', 'objects'] as const) {
    if (m.deck[cat].length < 2) issues.push(`deck.${cat} needs at least 2 cards`);
  }
  const ids = [...m.deck.suspects, ...m.deck.rooms, ...m.deck.objects].map((c) => c.id);
  for (const dup of new Set(ids.filter((x, i) => ids.indexOf(x) !== i))) issues.push(`card id "${dup}" is used twice`);
  if (!m.meta.languages.includes(m.meta.defaultLanguage)) {
    issues.push(`meta.defaultLanguage "${m.meta.defaultLanguage}" is not in meta.languages`);
  }

  if (issues.length) return issues; // geometry checks need valid references

  const board = compileBoard(m.board);
  const corridor = new Set(board.corridors);
  for (const s of m.deck.suspects) {
    if (!corridor.has(s.start)) issues.push(`suspect ${s.id} start ${s.start} is not a corridor cell`);
  }
  for (const d of m.board.doors) {
    const [c, r] = d.cell.split(',').map(Number) as [number, number];
    const touchesRoom = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => board.cells[r + b!]?.[c + a!] === d.room);
    if (!corridor.has(d.cell) || !touchesRoom) {
      issues.push(`door of ${d.room} at ${d.cell} must be a corridor cell next to that room`);
    }
  }
  for (const room of m.deck.rooms) {
    if (!board.roomRects[room.id]) issues.push(`room ${room.id} is not drawn on board.map`);
    else if ((board.adj[roomNode(room.id)] ?? []).length === 0 && !board.passages[room.id]) {
      issues.push(`room ${room.id} cannot be entered: it has no door and no secret passage`);
    }
  }
  return issues;
}
