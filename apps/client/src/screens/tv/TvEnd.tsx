import { useState } from 'react';
import { seatName } from '../../state/selectors.ts';
import { useTheme } from '../../theme/ThemeProvider.tsx';
import { Reveal } from '../../components/Reveal.tsx';
import { Answer, Awards, useEndInfo } from '../../components/Results.tsx';

export function TvEnd() {
  const theme = useTheme();
  const { t } = theme;
  const info = useEndInfo();
  const [revealed, setRevealed] = useState(false);
  if (!info) return null;
  if (!revealed) return <main className="tv tv-end"><Reveal onDone={() => setRevealed(true)} /></main>;
  const { room, g, votes } = info;
  return (
    <main className="tv tv-end">
      <h1>{g.winner !== undefined ? t('end.winner', { name: seatName(room, g.winner, theme) }) : t('end.noWinner')}</h1>
      <Answer />
      <Awards />
      <p className="big-count">{t('end.votes', votes)}</p>
    </main>
  );
}
