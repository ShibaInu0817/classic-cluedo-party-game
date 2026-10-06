import { isRoomNode, type CompiledTheme, type NodeId } from '@cluedo/theme-sdk';
import type { GameState } from './types.ts';

/** BFS up to `max` steps. A room is a dead end (entering it ends movement), except the start node. */
export function bfs(adj: Record<NodeId, NodeId[]>, start: NodeId, max: number) {
  const dist: Record<NodeId, number> = { [start]: 0 };
  const parent: Record<NodeId, NodeId> = {};
  const q = [start];
  while (q.length) {
    const u = q.shift()!;
    if (u !== start && isRoomNode(u)) continue;
    if (dist[u]! >= max) continue;
    for (const v of adj[u] ?? []) {
      if (dist[v] === undefined) {
        dist[v] = dist[u]! + 1;
        parent[v] = u;
        q.push(v);
      }
    }
  }
  return { dist, parent };
}

export function pathTo(parent: Record<NodeId, NodeId>, start: NodeId, target: NodeId): NodeId[] {
  const p = [target];
  while (p[0] !== start) p.unshift(parent[p[0]!]!);
  return p;
}

const activeChar = (g: GameState) => g.seats[g.turn]!.characterId;

/** Squares and rooms the active seat may move to with its current roll. Empty unless stage is 'move'. */
export function reachable(g: GameState, theme: CompiledTheme): NodeId[] {
  if (g.stage !== 'move' || !g.dice) return [];
  const from = g.pos[activeChar(g)]!;
  const { dist } = bfs(theme.board.adj, from, g.dice);
  return Object.keys(dist).filter((n) => n !== from && n !== g.turnStart);
}

export function movePath(g: GameState, theme: CompiledTheme, node: NodeId): NodeId[] | undefined {
  if (!reachable(g, theme).includes(node)) return undefined;
  const from = g.pos[activeChar(g)]!;
  return pathTo(bfs(theme.board.adj, from, g.dice!).parent, from, node);
}
