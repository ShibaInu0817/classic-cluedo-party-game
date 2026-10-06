import { useEffect, useMemo, useState } from 'react';
import { useGame } from '../state/store.ts';
import { seatName } from '../state/selectors.ts';
import { useTheme } from '../theme/ThemeProvider.tsx';
import { local } from '../storage.ts';

const CYCLE = ['', '✕', '✓', '?'];
type Marks = Record<string, string>; // `${card}|${seat}` → mark

/**
 * Detective notes: one mark per card × player, kept on this device. Marks fill in automatically from
 * what this seat knows (own hand, cards shown to it, players who passed on a suggestion);
 * a mark set by hand always wins.
 */
export function Notes() {
  const theme = useTheme();
  const { manifest, cardName, t } = theme;
  const room = useGame((s) => s.room);
  const me = useGame((s) => s.me);
  const priv = useGame((s) => s.priv);
  const key = `notes:${room?.code}:${room?.createdAt}:${room?.gameNo}`;
  const [manual, setManual] = useState<Marks>(() => {
    try { return JSON.parse(local.get(key) ?? '{}'); } catch { return {}; }
  });
  useEffect(() => local.set(key, JSON.stringify(manual)), [key, manual]);

  const seats = room?.seats ?? [];
  const auto = useMemo(() => {
    const m: Marks = {};
    const holds = (card: string, seat: number) => seats.forEach((_, i) => (m[`${card}|${i}`] = i === seat ? '✓' : '✕'));
    for (const s of room?.suggestions ?? []) {
      for (const seat of s.passed) for (const c of [s.trio.sus, s.trio.room, s.trio.obj]) m[`${c}|${seat}`] = '✕';
    }
    for (const c of priv?.hand ?? []) holds(c, me!.seat);
    for (const s of priv?.shown ?? []) holds(s.card, s.from);
    return m;
  }, [room?.suggestions, priv, seats, me]);

  if (!room || !me) return null;
  const groups = [manifest.deck.suspects, manifest.deck.rooms, manifest.deck.objects];
  return (
    <div className="notes">
      <table>
        <thead>
          <tr>
            <th />
            {seats.map((s) => <th key={s.seat} title={seatName(room, s.seat, theme)}>{seatName(room, s.seat, theme).slice(0, 3)}</th>)}
          </tr>
        </thead>
        {groups.map((cards, gi) => (
          <tbody key={gi}>
            {cards.map((c) => (
              <tr key={c.id}>
                <th scope="row">{cardName(c.id)}</th>
                {seats.map((s) => {
                  const k = `${c.id}|${s.seat}`;
                  const mark = manual[k] ?? auto[k] ?? '';
                  return (
                    <td key={s.seat}>
                      <button
                        className={`mark ${manual[k] === undefined && auto[k] ? 'auto' : ''}`}
                        aria-label={`${cardName(c.id)} · ${seatName(room, s.seat, theme)}: ${mark}`}
                        onClick={() => setManual({ ...manual, [k]: CYCLE[(CYCLE.indexOf(mark) + 1) % CYCLE.length]! })}
                      >{mark}</button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        ))}
      </table>
      <ol className="history" aria-label={t('notes.history')}>
        {(room.suggestions ?? []).map((s, i) => (
          <li key={i}>
            <span>{t('log.suggested', { name: seatName(room, s.by, theme), sus: cardName(s.trio.sus), room: cardName(s.trio.room), obj: cardName(s.trio.obj) })}</span>
            {s.passed.length > 0 && <span> · {t('notes.passed', { names: s.passed.map((p) => seatName(room, p, theme)).join(', ') })}</span>}
            {s.shownBy !== undefined && <span> · {t('notes.showed', { name: seatName(room, s.shownBy, theme) })}</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}
