import { useState } from 'react';
import { useGame } from '../state/store.ts';
import { seatName } from '../state/selectors.ts';
import { useTheme } from '../theme/ThemeProvider.tsx';
import { Portrait } from '../components/Portrait.tsx';
import { Reveal } from '../components/Reveal.tsx';
import { Answer, Awards, Timeline, useEndInfo } from '../components/Results.tsx';

/** Reveal, then results: the answer, what happened, the timeline, awards, stats and the rematch vote. */
export function End({ onHome }: { onHome?: () => void }) {
  const theme = useTheme();
  const { t } = theme;
  const me = useGame((s) => s.me);
  const vote = useGame((s) => s.vote);
  const info = useEndInfo();
  const [revealed, setRevealed] = useState(false);
  if (!info) return null;
  if (!revealed) return <main className="screen end"><Reveal onDone={() => setRevealed(true)} /></main>;
  const { room, g, votes } = info;
  const won = g.winner !== undefined;
  const voted = me ? room.votes?.[me.seat] === true : false;

  return (
    <main className="screen end">
      {won && <Portrait id={g.seats[g.winner!]!.characterId} size={110} />}
      <h1>{won ? t('end.winner', { name: seatName(room, g.winner!, theme) }) : t('end.noWinner')}</h1>
      <Answer />
      <Awards />
      <p className="hint">{t('end.stats', { rounds: g.round, sugs: info.suggestions })}</p>
      <h2>{t('end.timeline')}</h2>
      <Timeline />
      <div className="votes">
        <ul className="vote-avatars">
          {room.seats.filter((s) => !s.isBot).map((s) => (
            <li key={s.seat}>{s.characterId && <Portrait id={s.characterId} size={36} />}{room.votes?.[s.seat] ? '✓' : ''}</li>
          ))}
        </ul>
        <span>{t('end.votes', votes)}</span>
      </div>
      {me && <button className="btn primary big" disabled={voted} onClick={() => vote(true)}>{t('end.again')}</button>}
      {onHome && <button className="btn" onClick={onHome}>{t('end.leave')}</button>}
    </main>
  );
}
