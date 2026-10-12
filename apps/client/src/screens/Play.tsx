import { useEffect, useRef, useState } from 'react';
import { roomOf } from '@cluedo/theme-sdk/board';
import { useGame } from '../state/store.ts';
import { isMyTurn, seatName } from '../state/selectors.ts';
import { useTheme } from '../theme/ThemeProvider.tsx';
import { Board } from '../components/Board.tsx';
import { PlayerBar } from '../components/PlayerBar.tsx';
import { Card } from '../components/Card.tsx';
import { Notes } from '../components/Notes.tsx';
import { AccuseSheet, ShowCardSheet, ShownDialog, SuggestSheet, WrongDialog } from '../components/Sheets.tsx';
import { FloatingReactions, ReactionTray } from '../components/Reactions.tsx';
import { describe } from '../components/describe.ts';
import { ErrorBanner } from '../components/ErrorBanner.tsx';
import { Tutorial } from '../components/Tutorial.tsx';
import { Dice } from '../components/Dice.tsx';
import { Moment } from '../components/Moment.tsx';
import { useAccusation } from '../components/AccuseMoment.tsx';
import { TurnBanner } from '../components/TurnBanner.tsx';
import { LeaveGame } from '../components/LeaveGame.tsx';
import { useFeedback } from '../feedback.ts';

type Tab = 'actions' | 'cards' | 'notes';
type Open = 'none' | 'suggest' | 'accuse' | 'react';

export function Play() {
  const theme = useTheme();
  const { t, board } = theme;
  const room = useGame((s) => s.room);
  const me = useGame((s) => s.me);
  const priv = useGame((s) => s.priv);
  const feed = useGame((s) => s.feed);
  const intent = useGame((s) => s.intent);
  const pause = useGame((s) => s.pause);
  const [tab, setTab] = useState<Tab>('actions');
  const [open, setOpen] = useState<Open>('none');
  const [ghostSeen, setGhostSeen] = useState(false);
  const [fromSuggest, setFromSuggest] = useState(false);
  const accusing = !!useAccusation();
  const ribbon = useYourTurnRibbon(room?.game?.turn === me?.seat);
  useFeedback();

  const g = room?.game;
  if (!room || !g || !me) return null;
  const mine = isMyTurn(room, me.seat) && !room.paused;
  const isHost = room.hostSeat === me.seat;
  const ghost = g.out[me.seat];
  const here = g.pos[g.seats[me.seat]!.characterId]!;
  const passage = board.passages[roomOf(here) ?? ''];
  const last = [...feed].reverse().map((e) => describe(e, room, theme)).find(Boolean);

  return (
    <main className="screen play">
      <div data-tut="players"><PlayerBar onReact={() => setOpen('react')} /></div>
      <div data-tut="board" className="board-wrap"><div data-tut="move"><Board /></div></div>
      <div className="log-strip" aria-live="polite">{last}</div>

      <div role="tablist" className="tabs">
        {(['actions', 'cards', 'notes'] as const).map((k) => (
          <button key={k} data-tut={k === 'notes' ? 'notes' : undefined} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{t(`play.tab.${k}`)}</button>
        ))}
      </div>
      <section role="tabpanel" className="panel">
        {tab === 'actions' && (
          <div className="actions" data-tut="roll">
            {ghost ? (
              <p className="card ghost-card">{t('play.ghost')}</p>
            ) : !mine ? (
              <p className="card waiting">{t('play.waiting', { name: seatName(room, g.turn, theme) })}</p>
            ) : (
              <>
                {g.stage === 'roll' && <button className="btn primary big pulse" onClick={() => intent({ type: 'roll' })}>{t('play.roll')}</button>}
                {g.stage === 'move' && <p className="hint">{t('play.moveUpTo', { n: g.dice ?? 0 })}</p>}
                {g.stage === 'suggest' && <button className="btn primary big" onClick={() => setOpen('suggest')}>{t('play.suggest')}</button>}
                {g.stage === 'end' && <button className="btn big" onClick={() => intent({ type: 'endTurn' })}>{t('play.endTurn')}</button>}
              </>
            )}
            <div className="row bottom">
              {mine && !ghost && g.stage === 'roll' && passage && (
                <button className="btn" onClick={() => intent({ type: 'secretPassage' })}>{t('play.passage')}</button>
              )}
              {mine && !ghost && g.stage !== 'disprove' && (
                <button className="btn danger" data-tut="accuse" onClick={() => setOpen('accuse')}>{t('play.accuse')}</button>
              )}
            </div>
            {isHost && !room.paused && <button className="btn small" onClick={() => pause(true)}>{t('play.pause')}</button>}
            <LeaveGame />
            <ErrorBanner />
          </div>
        )}
        {tab === 'cards' && (
          <div className="hand">
            {(priv?.hand ?? []).map((c) => <Card key={c} id={c} />)}
          </div>
        )}
        {tab === 'notes' && (
          <>
            {fromSuggest && (
              <button className="btn small" onClick={() => { setFromSuggest(false); setOpen('suggest'); }}>{t('sheet.backToSuggest')}</button>
            )}
            <Notes />
          </>
        )}
      </section>

      {open === 'suggest' && (
        <SuggestSheet
          onClose={() => setOpen('none')}
          onCheckNotes={() => { setOpen('none'); setTab('notes'); setFromSuggest(true); }}
        />
      )}
      {open === 'accuse' && <AccuseSheet onClose={() => setOpen('none')} />}
      {open === 'react' && <ReactionTray onClose={() => setOpen('none')} />}
      <ShowCardSheet />
      <ShownDialog />
      {ghost && !ghostSeen && !accusing && <WrongDialog onClose={() => setGhostSeen(true)} />}
      {ribbon && <div className="ribbon" aria-hidden="true">{t('play.yourTurn')}</div>}
      {room.paused && (
        <div className="paused" role="status">
          <h1>{t('play.paused')}</h1>
          {isHost && <button className="btn primary big" onClick={() => pause(false)}>{t('play.resume')}</button>}
        </div>
      )}
      <Moment />
      <TurnBanner />
      <Dice />
      <FloatingReactions />
      <Tutorial />
    </main>
  );
}

/** True for 1.8 s each time it becomes your turn. */
function useYourTurnRibbon(myTurn: boolean) {
  const [on, setOn] = useState(false);
  const prev = useRef(myTurn);
  useEffect(() => {
    if (myTurn && !prev.current) {
      setOn(true);
      const h = setTimeout(() => setOn(false), 1800);
      prev.current = myTurn;
      return () => clearTimeout(h);
    }
    prev.current = myTurn;
  }, [myTurn]);
  return on && myTurn; // never outlive the turn itself
}
