import { useEffect, useState, type CSSProperties } from 'react';
import type { PublicEvent } from '@cluedo/engine';
import { useGame } from '../state/store.ts';
import { seatName } from '../state/selectors.ts';
import { useTheme } from '../theme/ThemeProvider.tsx';
import { cue } from '../feedback.ts';
import { Portrait } from './Portrait.tsx';

type Accused = Extract<PublicEvent, { type: 'accused' }>;

/** When the build-up ends and the verdict lands, and when the moment closes (a correct one hands over to the reveal). */
export const ACCUSE_VERDICT_MS = 2200;
const CLOSE_MS = { right: 4400, wrong: 5200 };

/** The accusation still playing on this screen, if any. */
export function useAccusation() {
  const feed = useGame((s) => s.feed);
  const done = useGame((s) => s.accuseDone);
  const at = feed.map((e) => e.type).lastIndexOf('accused');
  const e = at >= 0 ? (feed[at] as Accused) : undefined;
  if (!e || e === done) return undefined;
  const ghost = feed.slice(at + 1).some((x) => x.type === 'becameGhost' && x.seat === e.seat);
  return { e, ghost };
}

/**
 * The accusation, on every screen and the TV, right or wrong: the accuser in the spotlight, the sealed envelope
 * shaking, then a stamp. The guess itself stays secret; only the accuser sees the envelope afterwards.
 */
export function AccuseMoment() {
  const theme = useTheme();
  const { t } = theme;
  const room = useGame((s) => s.room);
  const finish = useGame((s) => s.doneAccusation);
  const acc = useAccusation();
  const e = acc?.e;
  const [verdict, setVerdict] = useState<Accused>();

  useEffect(() => {
    if (!e) return;
    cue(theme, 'accuse');
    const v = setTimeout(() => {
      setVerdict(e);
      if (!e.correct) cue(theme, 'accuseWrong');
    }, ACCUSE_VERDICT_MS);
    const c = setTimeout(() => finish(e), e.correct ? CLOSE_MS.right : CLOSE_MS.wrong);
    return () => { clearTimeout(v); clearTimeout(c); };
  }, [e, finish, theme]);

  if (!room || !e) return null;
  const name = seatName(room, e.seat, theme);
  const charId = room.seats.find((s) => s.seat === e.seat)?.characterId;
  const landed = verdict === e;
  const label = t('accuse.title', { name });
  return (
    <section
      className={`accuse-moment${landed ? (e.correct ? ' right' : ' wrong') : ''}`}
      aria-label={label}
      aria-live="assertive"
      onClick={() => landed && finish(e)}
    >
      <div className="accuser">
        {charId && <Portrait id={charId} size={120} grey={landed && !e.correct} />}
        <h2>{label}</h2>
      </div>
      <div className="envelope-seal" aria-hidden="true">✉</div>
      {landed && <p className="stamp">{t(e.correct ? 'accuse.right' : 'accuse.wrong')}</p>}
      {landed && e.correct && <div className="burst" aria-hidden="true">{Array.from({ length: 14 }, (_, i) => <i key={i} style={{ '--a': `${(i / 14) * 360}deg` } as CSSProperties} />)}</div>}
      {landed && (
        <p className="verdict-line">
          {e.correct ? t('accuse.solved') : t(acc.ghost ? 'accuse.ghost' : 'accuse.again', { name })}
        </p>
      )}
    </section>
  );
}
