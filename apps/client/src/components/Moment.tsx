import { useEffect, useState } from 'react';
import type { PublicEvent } from '@cluedo/engine';
import { useGame } from '../state/store.ts';
import { seatName } from '../state/selectors.ts';
import { useTheme } from '../theme/ThemeProvider.tsx';
import { Card } from './Card.tsx';

/**
 * The suggestion moment, on every screen: the three cards pop in, then each player asked in turn
 * (pass / has one), then who showed a card to whom — never which card.
 */
export function Moment() {
  const theme = useTheme();
  const { t } = theme;
  const room = useGame((s) => s.room);
  const feed = useGame((s) => s.feed);
  // My own sheets (a card to show, a card shown to me) always win over the shared overlay.
  const mineOpen = useGame((s) => !!s.showRequest || s.shownQueue.length > 0);
  const start = feed.map((e) => e.type).lastIndexOf('suggested');
  const sug = start >= 0 ? (feed[start] as Extract<PublicEvent, { type: 'suggested' }>) : undefined;
  const after = start >= 0 ? feed.slice(start + 1) : [];
  const end = after.findIndex((e) => e.type === 'turnStarted' || e.type === 'rolled' || e.type === 'suggested');
  const chain = end >= 0 ? after.slice(0, end) : after;
  const resolved = chain.find((e) => e.type === 'cardShown' || e.type === 'noDisprove');
  const [hidden, setHidden] = useState<object>();

  useEffect(() => {
    if (!resolved) return;
    const h = setTimeout(() => setHidden(sug), 3500);
    return () => clearTimeout(h);
  }, [resolved, sug]);

  if (!room || !sug || hidden === sug || end >= 0 || mineOpen) return null;
  const name = (s: number) => seatName(room, s, theme);
  const label = t('moment.title', { name: name(sug.seat) });
  return (
    <section className="moment" aria-label={label} onClick={() => setHidden(sug)}>
      <h2>{label}</h2>
      <div className="trio">
        {[sug.trio.sus, sug.trio.room, sug.trio.obj].map((c, i) => (
          <span key={c} className="pop" style={{ animationDelay: `${i * 0.15}s` }}><Card id={c} small /></span>
        ))}
      </div>
      <ul className="chain">
        {chain.filter((e) => e.type === 'asked').map((e) => e.type === 'asked' && (
          <li key={e.seat} className={e.has ? 'has' : 'pass'}>{t(e.has ? 'log.asked.has' : 'log.asked.pass', { name: name(e.seat) })}</li>
        ))}
      </ul>
      {resolved && (
        <p className="status">
          {resolved.type === 'cardShown' ? t('log.cardShown', { from: name(resolved.from), to: name(resolved.to) }) : t('log.noDisprove')}
        </p>
      )}
    </section>
  );
}
