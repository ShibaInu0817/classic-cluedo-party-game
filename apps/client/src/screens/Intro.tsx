import { useState } from 'react';
import { useGame } from '../state/store.ts';
import { useTheme } from '../theme/ThemeProvider.tsx';
import { Card } from '../components/Card.tsx';
import { Portrait } from '../components/Portrait.tsx';
import { StoryPanel, useStory } from '../components/StoryPanel.tsx';

type Step = 'setup' | 'role' | 'hand';
const NONE: string[] = [];

/** Story → setup → my character → my cards → Ready. Each phone goes at its own pace; the host can skip for all. */
export function Intro() {
  const { t, cardName, manifest, asset } = useTheme();
  const room = useGame((s) => s.room);
  const me = useGame((s) => s.me);
  const hand = useGame((s) => s.priv?.hand) ?? NONE;
  const sendReady = useGame((s) => s.introReady);
  const skipAll = useGame((s) => s.introSkip);
  const story = useStory(false, 6000);
  const [step, setStep] = useState<Step>('setup');
  if (!room || !me) return null;

  const isHost = room.hostSeat === me.seat;
  const ready = room.ready ?? [];
  const mine = room.seats[me.seat]?.characterId;
  const hostBar = isHost && (
    <button className="btn small skip-all" onClick={() => skipAll()}>{t('intro.skipAll')}</button>
  );

  if (ready[me.seat]) {
    return (
      <main className="screen intro">
        <p className="card waiting">{t('intro.waiting', { n: ready.filter(Boolean).length, m: ready.length })}</p>
        {hostBar}
      </main>
    );
  }

  if (!story.done && story.panel) {
    return (
      <main className="screen intro story">
        <StoryPanel art={story.panel.art} captionKey={story.panel.captionKey} />
        <div className="row spread">
          <button className="btn" onClick={story.skip}>{t('intro.skipStory')}</button>
          <button className="btn primary" onClick={story.next}>{t('intro.next')}</button>
        </div>
        {hostBar}
      </main>
    );
  }

  return (
    <main className="screen intro">
      {step === 'setup' && (
        <section className="setup">
          <div className="felt">
            <img className="deal-back" src={asset(manifest.ui.cardBack)} alt="" />
            <span className="envelope-mini">✉</span>
          </div>
          {[1, 2, 3].map((n) => <p key={n} className="fade-up" style={{ animationDelay: `${n * 0.6}s` }}>{t(`setup.${n}`)}</p>)}
          <button className="btn primary" onClick={() => setStep('role')}>{t('intro.next')}</button>
        </section>
      )}
      {step === 'role' && mine && (
        <section className="role flip">
          <Portrait id={mine} size={160} />
          <h1>{t('intro.youAre', { name: cardName(mine) })}</h1>
          <button className="btn primary" onClick={() => setStep('hand')}>{t('intro.next')}</button>
        </section>
      )}
      {step === 'hand' && (
        <section className="hand-reveal">
          <h2>{t('intro.yourCards')}</h2>
          <div className="hand">
            {hand.map((c, i) => <span key={c} className="flip" style={{ animationDelay: `${i * 0.35}s` }}><Card id={c} /></span>)}
          </div>
          <p className="hint">{t('intro.cardsHint')}</p>
          <button className="btn primary big" onClick={() => sendReady()}>{t('intro.ready')}</button>
        </section>
      )}
      {hostBar}
    </main>
  );
}
