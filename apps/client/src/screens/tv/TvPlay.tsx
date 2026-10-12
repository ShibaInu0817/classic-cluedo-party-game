import { useEffect, useState } from 'react';
import { useGame } from '../../state/store.ts';
import { useTheme } from '../../theme/ThemeProvider.tsx';
import { Board } from '../../components/Board.tsx';
import { FloatingReactions } from '../../components/Reactions.tsx';
import { describe } from '../../components/describe.ts';
import { Dice } from '../../components/Dice.tsx';
import { useAnswerCues } from '../../components/Moment.tsx';
import { useSuggestion } from '../../components/useSuggestion.ts';
import { TurnBanner } from '../../components/TurnBanner.tsx';
import { Ambient, SeatRail, SuggestionScene } from '../../components/TvStage.tsx';

/**
 * The spectator view: public state only. It has no seat, so it can never act.
 * One stage: the board never leaves; dice, the suggestion scene and the turn banner play over it.
 */
export function TvPlay() {
  const theme = useTheme();
  const room = useGame((s) => s.room);
  const feed = useGame((s) => s.feed);
  const beat = useSuggestion();
  useAnswerCues(beat?.answered, beat?.sug);
  const entering = useOpening();
  const g = room?.game;
  if (!room || !g) return null;
  const line = [...feed].reverse().map((e) => describe(e, room, theme)).find(Boolean);
  return (
    <main className="tv tv-play">
      <Ambient />
      <div className="tv-stage">
        <div className="tv-board">
          <Board zoom={beat ? beat.sug.trio.room : undefined} entering={entering}>
            <Dice onBoard />
          </Board>
          <SuggestionScene beat={beat} />
        </div>
        <div className="tv-side">
          <SeatRail beat={beat} />
          {line && <p className="ticker" key={line}>{line}</p>}
        </div>
      </div>
      <TurnBanner big />
      <FloatingReactions />
    </main>
  );
}

/** The first moments of a game: pieces drop in and the answer is dealt into the envelope. */
function useOpening() {
  const fresh = useGame((s) => s.room?.game?.round === 1 && !s.feed.some((e) => e.type === 'rolled'));
  const [on, setOn] = useState(fresh);
  useEffect(() => {
    if (!on) return;
    const h = setTimeout(() => setOn(false), 3000);
    return () => clearTimeout(h);
  }, [on]);
  return on;
}
