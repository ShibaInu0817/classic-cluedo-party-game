import { useGame } from '../../state/store.ts';
import { seatName } from '../../state/selectors.ts';
import { useTheme } from '../../theme/ThemeProvider.tsx';
import { Board } from '../../components/Board.tsx';
import { PlayerBar } from '../../components/PlayerBar.tsx';
import { Card } from '../../components/Card.tsx';
import { FloatingReactions } from '../../components/Reactions.tsx';
import { describe } from '../../components/describe.ts';
import { Dice } from '../../components/Dice.tsx';
import { Moment } from '../../components/Moment.tsx';

/** The spectator view: public state only. It has no seat, so it can never act. */
export function TvPlay() {
  const theme = useTheme();
  const { t } = theme;
  const room = useGame((s) => s.room);
  const feed = useGame((s) => s.feed);
  const g = room?.game;
  if (!room || !g) return null;
  const lines = feed.map((e) => describe(e, room, theme)).filter(Boolean).slice(-8);
  return (
    <main className="tv tv-play">
      <PlayerBar />
      <div className="tv-grid">
        <Board />
        <aside>
          <p className="card waiting">{t('play.waiting', { name: seatName(room, g.turn, theme) })}</p>
          {g.pending && (
            <div className="trio">
              <Card id={g.pending.trio.sus} small /><Card id={g.pending.trio.room} small /><Card id={g.pending.trio.obj} small />
            </div>
          )}
          <ol className="tv-log">{lines.map((l, i) => <li key={i}>{l}</li>)}</ol>
        </aside>
      </div>
      <Moment />
      <Dice />
      <FloatingReactions />
    </main>
  );
}
