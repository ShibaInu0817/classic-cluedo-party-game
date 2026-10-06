import { useEffect } from 'react';
import { useGame } from '../state/store.ts';
import { seatName } from '../state/selectors.ts';
import { useTheme } from '../theme/ThemeProvider.tsx';
import { Card } from './Card.tsx';
import { Portrait } from './Portrait.tsx';

/** The envelope tears open, the three cards flip, then the spotlight finds the killer. Public on every screen. */
export function Reveal({ onDone }: { onDone: () => void }) {
  const theme = useTheme();
  const { t } = theme;
  const room = useGame((s) => s.room);
  const g = room?.game;
  useEffect(() => {
    const h = setTimeout(onDone, 9000);
    return () => clearTimeout(h);
  }, [onDone]);
  if (!room || !g?.answer) return null;
  const a = g.answer;
  return (
    <section className="reveal" aria-label={t('end.reveal')}>
      <div className="envelope-open shake">✉</div>
      <div className="trio">
        {[a.sus, a.room, a.obj].map((c, i) => (
          <span key={c} className="flip" style={{ animationDelay: `${0.8 + i * 0.5}s` }}><Card id={c} /></span>
        ))}
      </div>
      <div className="spotlight" style={{ animationDelay: '2.6s' }}><Portrait id={a.sus} size={140} /></div>
      <h1 className="pop" style={{ animationDelay: '4.6s' }}>
        {g.winner !== undefined ? t('end.winner', { name: seatName(room, g.winner, theme) }) : t('end.noWinner')}
      </h1>
      <button className="btn primary" onClick={onDone}>{t('end.continue')}</button>
    </section>
  );
}
