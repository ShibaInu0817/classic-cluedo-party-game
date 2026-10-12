import type { CSSProperties } from 'react';
import { useGame } from '../state/store.ts';
import { seatName } from '../state/selectors.ts';
import { useTheme } from '../theme/ThemeProvider.tsx';
import { Card } from './Card.tsx';
import { Portrait } from './Portrait.tsx';
import { useSecondsLeft } from './PlayerBar.tsx';
import type { SuggestionBeat } from './useSuggestion.ts';

/** The players down the side of the TV: whose turn it is, and each one's answer while a suggestion goes round. */
export function SeatRail({ beat }: { beat?: SuggestionBeat }) {
  const theme = useTheme();
  const { t, cardName, manifest, asset } = theme;
  const room = useGame((s) => s.room);
  const left = useSecondsLeft(room?.deadline);
  const g = room?.game;
  if (!room || !g) return null;
  const status = (s: number) => {
    const a = beat?.answered.find((x) => x.seat === s);
    if (a) return a.has ? ['has', t('chain.has')] : ['pass', t('chain.pass')];
    if (beat?.asking === s) return ['think', t('chain.thinking')];
    return undefined;
  };
  const shown = beat?.resolved?.type === 'cardShown' ? beat.resolved : undefined;
  return (
    <aside className="seat-rail" aria-label={t('tv.players')}>
      <div className="rail-top">
        <span className="chip">{t('play.round', { n: g.round })}</span>
        {left !== undefined && <span className={`chip secs ${left <= 10 ? 'low' : ''}`}>{left}s</span>}
      </div>
      <ol className="rail-seats">
        {g.seats.map((s, i) => {
          const st = status(i);
          return (
            <li key={i} className={`${i === g.turn ? 'turn' : ''} ${g.out[i] ? 'ghost' : ''}`} aria-current={i === g.turn ? 'step' : undefined}>
              <Portrait id={s.characterId} size={52} grey={g.out[i]} />
              <span className="who"><b>{seatName(room, i, theme)}</b><small>{cardName(s.characterId)}</small></span>
              {st && <em className={`st ${st[0]}`}>{st[1]}</em>}
            </li>
          );
        })}
        {shown && (
          <img
            className="rail-card"
            src={asset(manifest.ui.cardBack)}
            alt=""
            aria-hidden="true"
            style={{ '--from': shown.from, '--to': shown.to } as CSSProperties}
          />
        )}
      </ol>
    </aside>
  );
}

/** The suggestion, staged over the board: the room becomes the backdrop and the three cards land in it. */
export function SuggestionScene({ beat }: { beat?: SuggestionBeat }) {
  const theme = useTheme();
  const { t, cardName, cardArt } = theme;
  const room = useGame((s) => s.room);
  if (!beat || !room) return null;
  const { sug, asking, resolved } = beat;
  const name = (s: number) => seatName(room, s, theme);
  const art = cardArt(sug.trio.room);
  const label = t('moment.title', { name: name(sug.seat) });
  return (
    <section className="scene" aria-label={label}>
      {art && <div className="scene-bg" style={{ backgroundImage: `url("${art}")` }} />}
      <div className="trio">
        {[sug.trio.sus, sug.trio.room, sug.trio.obj].map((c, i) => (
          <span key={c} className="slam" style={{ animationDelay: `${0.5 + i * 0.3}s`, '--tilt': `${(i - 1) * 4}deg` } as CSSProperties}>
            <Card id={c} />
          </span>
        ))}
      </div>
      <h2>{t('log.suggested', { name: name(sug.seat), sus: cardName(sug.trio.sus), room: cardName(sug.trio.room), obj: cardName(sug.trio.obj) })}</h2>
      <p className="askline" aria-live="polite">
        {resolved
          ? resolved.type === 'cardShown' ? t('log.cardShown', { from: name(resolved.from), to: name(resolved.to) }) : t('log.noDisprove')
          : asking !== undefined ? t('scene.asking', { name: name(asking) }) : ''}
      </p>
    </section>
  );
}

/** The theme's ambient art hung along the top of the TV, swaying while the game waits. */
export function Ambient() {
  const { manifest, asset } = useTheme();
  const hanging = manifest.ui.ambient?.hanging;
  if (!hanging) return null;
  return (
    <div className="ambient" aria-hidden="true">
      {Array.from({ length: hanging.count }, (_, i) => (
        <img key={i} src={asset(hanging.art)} alt="" style={{ left: `${((i + 0.5) / hanging.count) * 100}%`, animationDelay: `${-i * 0.55}s` }} />
      ))}
    </div>
  );
}
