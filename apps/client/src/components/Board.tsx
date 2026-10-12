import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import type { PublicEvent } from '@cluedo/engine';
import { roomNode } from '@cluedo/theme-sdk/board';
import { useGame } from '../state/store.ts';
import { isMyTurn } from '../state/selectors.ts';
import { useTheme } from '../theme/ThemeProvider.tsx';

/** Spots for `n` tokens inside a room, as offsets from its centre (fractions of its size): a grid big enough for all. */
function slots(n: number): [number, number][] {
  const cols = Math.max(3, Math.ceil(Math.sqrt(n)));
  const rows = Math.ceil(n / cols);
  return Array.from({ length: n }, (_, i) => [((i % cols) - (cols - 1) / 2) * (0.84 / cols), (Math.floor(i / cols) - (rows - 1) / 2) * (0.6 / rows) + 0.06]);
}

type Moved = Extract<PublicEvent, { type: 'moved' }>;

/** Where a token is drawn while it walks the latest move, one square every 170 ms. */
function useWalk(): { character: string; node: string; i: number } | undefined {
  const feed = useGame((s) => s.feed);
  const last = [...feed].reverse().find((e): e is Moved => e.type === 'moved');
  const [step, setStep] = useState<{ move: Moved; i: number }>();
  useEffect(() => {
    if (!last) return;
    setStep({ move: last, i: 0 });
    let i = 0;
    const h = setInterval(() => {
      i++;
      if (i >= last.path.length - 1) clearInterval(h);
      setStep({ move: last, i });
    }, 170);
    return () => clearInterval(h);
  }, [last]);
  if (!step || step.i >= step.move.path.length - 1) return undefined;
  return { character: step.move.character, node: step.move.path[step.i]!, i: step.i };
}

/** The room a token has just walked into: it lights up once the walk is over. */
function useArrival(): string | undefined {
  const feed = useGame((s) => s.feed);
  const last = [...feed].reverse().find((e): e is Moved => e.type === 'moved');
  const [lit, setLit] = useState<string>();
  useEffect(() => {
    const to = last?.path.at(-1);
    if (!to?.startsWith('R:')) return;
    const on = setTimeout(() => setLit(to.slice(2)), (last!.path.length - 1) * 170);
    const off = setTimeout(() => setLit(undefined), (last!.path.length - 1) * 170 + 1600);
    return () => { clearTimeout(on); clearTimeout(off); setLit(undefined); };
  }, [last]);
  return lit;
}

interface BoardProps {
  /** Just the board, no pieces: what the lobby and the story sit on before play. */
  backdrop?: boolean;
  /** A room to zoom the camera into (the suggestion scene). */
  zoom?: string;
  /** The opening: pieces drop onto their squares and the answer is dealt into the envelope. */
  entering?: boolean;
  children?: ReactNode;
}

/** The board, drawn from the compiled theme board. Reachable squares become buttons on your move. */
export function Board({ backdrop, zoom, entering, children }: BoardProps = {}) {
  const { board, cardName, cardArt, colorOf, manifest, t, asset } = useTheme();
  const nearestRoom = useNearestRoom();
  const room = useGame((s) => s.room);
  const me = useGame((s) => s.me);
  const feed = useGame((s) => s.feed);
  const intent = useGame((s) => s.intent);
  const walk = useWalk();
  const lit = useArrival();
  const g = backdrop ? undefined : room?.game;
  if (!g && !backdrop) return null;
  const pos = !g ? {} : walk ? { ...g.pos, [walk.character]: walk.node } : g.pos;
  // A suspect named in the latest suggestion is pulled into the room: it flies rather than walks.
  const lastSug = [...feed].reverse().find((e) => e.type === 'suggested' || e.type === 'moved');
  const summoned = lastSug?.type === 'suggested' ? lastSug.trio.sus : undefined;
  const sparkle = new Set(manifest.ui.ambient?.sparkleRooms ?? []);

  const canMove = !!g && isMyTurn(room, me?.seat) && g.stage === 'move';
  const reach = new Set(canMove ? room?.reach ?? [] : []);
  const pct = (v: number, of: number) => `${(v / of) * 100}%`;
  const place = (c: number, r: number, w = 1, h = 1): CSSProperties => ({
    left: pct(c, board.width), top: pct(r, board.height), width: pct(w, board.width), height: pct(h, board.height),
  });

  // Token positions: corridor tokens sit on their square; room tokens spread over slots in the room.
  const inRoom: Record<string, string[]> = {};
  const tokens = Object.entries(pos).map(([id, node]) => {
    if (node.startsWith('R:')) {
      const rid = node.slice(2);
      (inRoom[rid] ??= []).push(id);
      const rect = board.roomRects[rid]!;
      const slot = slots(manifest.deck.suspects.length)[inRoom[rid]!.length - 1]!;
      return { id, node, x: rect.c + rect.w / 2 + slot[0] * rect.w, y: rect.r + rect.h / 2 + slot[1] * rect.h };
    }
    const [c, r] = node.split(',').map(Number) as [number, number];
    return { id, node, x: c + 0.5, y: r + 0.5 };
  });
  const seatOf = (id: string) => g?.seats.findIndex((s) => s.characterId === id) ?? -1;
  const envelope = board.cells.flatMap((row, r) => row.map((v, c) => (v === '@envelope' ? { c, r } : null))).filter(Boolean) as { c: number; r: number }[];

  const tokenLabel = (id: string, glyph: string) => (t(`glyph.${id}`) === `glyph.${id}` ? glyph : t(`glyph.${id}`));
  return (
    <div className="board-block">
    <div
      className={`board ${zoom ? 'zoomed' : ''} ${entering ? 'entering' : ''}`}
      data-testid={backdrop ? 'board-backdrop' : 'board'}
      style={{ aspectRatio: `${board.width} / ${board.height}`, ...zoomStyle(board, zoom) }}
    >
      {board.corridors.map((k) => {
        const [c, r] = k.split(',').map(Number) as [number, number];
        const style = place(c, r);
        return reach.has(k) ? (
          <button key={k} className="cell corridor reach" style={style} aria-label={t('board.square', { room: cardName(nearestRoom(k)), row: r + 1, col: c + 1 })} onClick={() => intent({ type: 'move', node: k })} />
        ) : (
          <div key={k} className="cell corridor" style={style} />
        );
      })}
      {Object.entries(board.roomRects).map(([rid, rect]) => {
        const node = roomNode(rid);
        const art = cardArt(rid);
        const inner = (
          <>
            {art && <img src={art} alt="" aria-hidden="true" />}
            {sparkle.has(rid) && [0, 1, 2, 3].map((i) => <i key={i} className="spark" aria-hidden="true" />)}
            <span className="room-name">{cardName(rid)}</span>
          </>
        );
        const style = place(rect.c, rect.r, rect.w, rect.h);
        return reach.has(node) ? (
          <button key={rid} className={`room reach ${lit === rid ? 'lit' : ''}`} style={style} aria-label={cardName(rid)} onClick={() => intent({ type: 'move', node })}>{inner}</button>
        ) : (
          <div key={rid} className={`room ${lit === rid ? 'lit' : ''}`} style={style}>{inner}</div>
        );
      })}
      {envelope.length > 0 && (() => {
        const c = Math.min(...envelope.map((e) => e.c)), r = Math.min(...envelope.map((e) => e.r));
        const w = Math.max(...envelope.map((e) => e.c)) - c + 1, h = Math.max(...envelope.map((e) => e.r)) - r + 1;
        return (
          <div className="envelope" style={place(c, r, w, h)}>
            <span>✉</span>
            {entering && [0, 1, 2].map((i) => (
              <img key={i} className="dealt" src={asset(manifest.ui.cardBack)} alt="" aria-hidden="true" style={{ animationDelay: `${1.4 + i * 0.3}s` }} />
            ))}
          </div>
        );
      })()}
      {g && tokens.map((tk, i) => {
        const seat = seatOf(tk.id);
        const s = manifest.deck.suspects.find((x) => x.id === tk.id)!;
        const cls = [
          'token', seat === g.turn ? 'active' : '', seat >= 0 && g.out[seat] ? 'ghost' : '', seat === me?.seat ? 'mine' : '',
          walk?.character === tk.id ? `hop${walk.i % 2}` : '', summoned === tk.id ? 'summoned' : '',
        ].join(' ');
        const style: CSSProperties = { left: pct(tk.x, board.width), top: pct(tk.y, board.height), background: colorOf(tk.id) };
        if (entering) style.animationDelay = `${i * 0.18}s`;
        return (
          <span key={tk.id} className={cls} style={style} title={cardName(tk.id)} data-node={tk.node}>
            {tokenLabel(s.id, s.glyph)}
            {seat === me?.seat && <span className="you-pin">{t('play.you')}</span>}
          </span>
        );
      })}
    </div>
    {children}
    {g && <ul className="legend" aria-label={t('board.legend')}>
      {g.seats.map((s) => {
        const sus = manifest.deck.suspects.find((x) => x.id === s.characterId)!;
        return (
          <li key={s.characterId}>
            <span className="dot" style={{ background: colorOf(sus.id) }}>{tokenLabel(sus.id, sus.glyph)}</span>
            <span>{cardName(sus.id)}</span>
          </li>
        );
      })}
    </ul>}
    </div>
  );
}

/** Scale the board up around one room, like a camera moving in. */
function zoomStyle(board: { width: number; height: number; roomRects: Record<string, { c: number; r: number; w: number; h: number }> }, zoom?: string): CSSProperties {
  const rect = zoom ? board.roomRects[zoom] : undefined;
  if (!rect) return {};
  const x = ((rect.c + rect.w / 2) / board.width) * 100, y = ((rect.r + rect.h / 2) / board.height) * 100;
  return { transformOrigin: `${x}% ${y}%`, transform: 'scale(1.9)' };
}

/** For a corridor square, the room it is closest to (by walking), to describe it in words. */
function useNearestRoom() {
  const { board } = useTheme();
  return (node: string): string => {
    const seen = new Set([node]);
    const q = [node];
    while (q.length) {
      const u = q.shift()!;
      if (u.startsWith('R:')) return u.slice(2);
      for (const v of board.adj[u] ?? []) if (!seen.has(v)) { seen.add(v); q.push(v); }
    }
    return '';
  };
}
