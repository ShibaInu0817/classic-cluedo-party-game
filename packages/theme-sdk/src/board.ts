/** Node ids: corridor cells are "c,r"; rooms are "R:<roomId>". */
export type NodeId = string;

export const ENVELOPE = '@envelope';
export const roomNode = (roomId: string): NodeId => `R:${roomId}`;
export const isRoomNode = (n: NodeId) => n.startsWith('R:');
export const roomOf = (n: NodeId) => (isRoomNode(n) ? n.slice(2) : undefined);

export interface BoardInput {
  map: string[];
  legend: Record<string, string>;
  doors: { room: string; cell: string }[];
  secretPassages: [string, string][];
}

export interface CompiledBoard {
  width: number;
  height: number;
  /** Per cell, row-major: '.' corridor, a room id, '@envelope', or '' (void). */
  cells: string[][];
  corridors: NodeId[];
  /** Movement graph: corridor 4-neighbours plus door cell <-> room node. */
  adj: Record<NodeId, NodeId[]>;
  doors: { room: string; cell: NodeId }[];
  passages: Record<string, string>;
  /** Steps from each node to the nearest room (rooms are 0). */
  roomDist: Record<NodeId, number>;
  /** Bounding box of each room in cells, for rendering. */
  roomRects: Record<string, { c: number; r: number; w: number; h: number }>;
}

const key = (c: number, r: number) => `${c},${r}`;

export function compileBoard(input: BoardInput): CompiledBoard {
  const height = input.map.length;
  const width = Math.max(...input.map.map((row) => row.length));
  const cells: string[][] = [];
  const corridors: NodeId[] = [];
  const roomRects: CompiledBoard['roomRects'] = {};

  for (let r = 0; r < height; r++) {
    const row: string[] = [];
    for (let c = 0; c < width; c++) {
      const ch = input.map[r]![c] ?? ' ';
      let v = '';
      if (ch === '.') {
        v = '.';
        corridors.push(key(c, r));
      } else if (input.legend[ch] !== undefined) {
        v = input.legend[ch]!;
        if (v !== ENVELOPE) {
          const b = roomRects[v];
          if (!b) roomRects[v] = { c, r, w: 1, h: 1 };
          else {
            const c2 = Math.max(b.c + b.w, c + 1), r2 = Math.max(b.r + b.h, r + 1);
            b.c = Math.min(b.c, c); b.r = Math.min(b.r, r);
            b.w = c2 - b.c; b.h = r2 - b.r;
          }
        }
      }
      row.push(v);
    }
    cells.push(row);
  }

  const isCor = (c: number, r: number) => cells[r]?.[c] === '.';
  const adj: Record<NodeId, NodeId[]> = {};
  for (const k of corridors) {
    const [c, r] = k.split(',').map(Number) as [number, number];
    adj[k] = [[1, 0], [-1, 0], [0, 1], [0, -1]]
      .map(([a, b]) => [c + a!, r + b!] as const)
      .filter(([x, y]) => isCor(x, y))
      .map(([x, y]) => key(x, y));
  }
  for (const room of Object.keys(roomRects)) adj[roomNode(room)] = [];
  for (const d of input.doors) {
    const rn = roomNode(d.room);
    adj[rn]?.push(d.cell);
    adj[d.cell]?.push(rn);
  }

  const passages: Record<string, string> = {};
  for (const [a, b] of input.secretPassages) {
    passages[a] = b;
    passages[b] = a;
  }

  const roomDist: Record<NodeId, number> = {};
  const q: NodeId[] = [];
  for (const room of Object.keys(roomRects)) {
    roomDist[roomNode(room)] = 0;
    q.push(roomNode(room));
  }
  while (q.length) {
    const u = q.shift()!;
    for (const v of adj[u] ?? []) if (roomDist[v] === undefined) { roomDist[v] = roomDist[u]! + 1; q.push(v); }
  }

  return { width, height, cells, corridors, adj, doors: input.doors, passages, roomDist, roomRects };
}
