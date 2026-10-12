import { useEffect, useRef } from 'react';
import { useGame } from '../state/store.ts';
import { seatName } from '../state/selectors.ts';
import { useTheme } from '../theme/ThemeProvider.tsx';
import { cue } from '../feedback.ts';
import { Card } from './Card.tsx';
import { Portrait } from './Portrait.tsx';
import { useSuggestion } from './useSuggestion.ts';

/**
 * The suggestion on a phone, over the lower half so the board stays in view: the three cards, then each
 * player asked in turn (pass / has one), then who showed a card to whom. Each phone words it for its owner:
 * the one who showed sees which card they gave, the suggester gets the card in their own sheet, everyone
 * else learns only that a card changed hands.
 */
export function Moment() {
  const theme = useTheme();
  const { t, cardName, asset, manifest } = theme;
  const room = useGame((s) => s.room);
  const me = useGame((s) => s.me);
  const myShown = useGame((s) => s.myShown);
  // My own sheets (a card to show, a card shown to me) always win over the shared overlay.
  const mineOpen = useGame((s) => !!s.showRequest || s.shownQueue.length > 0);
  const beat = useSuggestion();
  useAnswerCues(beat?.answered, beat?.sug);

  if (!room || !beat || mineOpen) return null;
  const { sug, answered, asking, resolved } = beat;
  const g = room.game;
  const name = (s: number) => seatName(room, s, theme);
  const charOf = (s: number) => g?.seats[s]?.characterId;
  const mine = (s: number) => s === me?.seat;
  const label = t('moment.title', { name: name(sug.seat) });
  const order = Array.from({ length: (g?.seats.length ?? 1) - 1 }, (_, k) => (sug.seat + k + 1) % (g?.seats.length ?? 1));
  const status = (s: number) => {
    const a = answered.find((x) => x.seat === s);
    if (a) return a.has ? ['has', t(mine(s) ? 'chain.youHas' : 'chain.has')] : ['pass', t(mine(s) ? 'chain.youPass' : 'chain.pass')];
    if (asking === s) return ['think', t(mine(s) ? 'chain.yourAnswer' : 'chain.thinking')];
    return ['', t('chain.waiting')];
  };
  // Only seats up to the one who has a card get asked; the rest never come into it.
  const asked = new Set(answered.map((a) => a.seat).concat(asking ?? []));
  const lastAsked = order.findIndex((s) => s === [...asked].at(-1));
  const rows = order.filter((s, i) => asked.has(s) || i > lastAsked);
  const shown = resolved?.type === 'cardShown' ? resolved : undefined;

  return (
    <section className="moment chain-panel" aria-label={label}>
      <div className="asker">
        {charOf(sug.seat) && <Portrait id={charOf(sug.seat)!} size={30} />}
        <span><b>{mine(sug.seat) ? t('chain.youAsked') : t('chain.asked', { name: name(sug.seat) })}</b></span>
      </div>
      <div className="trio">
        {[sug.trio.sus, sug.trio.room, sug.trio.obj].map((c, i) => (
          <span key={c} className="pop" style={{ animationDelay: `${i * 0.15}s` }}><Card id={c} small /></span>
        ))}
      </div>
      <ul className="chain">
        {rows.map((s) => {
          const [cls, text] = status(s);
          return (
            <li key={s} className={`crow ${mine(s) ? 'me' : ''} ${cls === 'think' ? 'now' : ''}`}>
              {charOf(s) && <Portrait id={charOf(s)!} size={26} />}
              <span>{mine(s) ? t('chain.you', { name: name(s) }) : name(s)}</span>
              <em className={`st ${cls}`}>{text}</em>
            </li>
          );
        })}
      </ul>
      {shown && (
        <div className="handoff">
          <span className="end">{charOf(shown.from) && <Portrait id={charOf(shown.from)!} size={40} />}</span>
          <span className="lane"><span className="fly" aria-hidden="true" style={{ backgroundImage: `url("${asset(manifest.ui.cardBack)}")` }} /></span>
          <span className="end">{charOf(shown.to) && <Portrait id={charOf(shown.to)!} size={40} />}</span>
        </div>
      )}
      {resolved && (
        <p className="status">
          {shown && mine(shown.from) && myShown
            ? <><span>{t('chain.youShowed', { card: cardName(myShown), to: name(shown.to) })}</span><small>{t('chain.onlyThey', { name: name(shown.to) })}</small></>
            : shown && mine(shown.to)
              ? t('chain.showedYou', { name: name(shown.from) })
              : shown
                ? <><span>{t('log.cardShown', { from: name(shown.from), to: name(shown.to) })}</span><small>{t('chain.cantSee')}</small></>
                : t('log.noDisprove')}
        </p>
      )}
    </section>
  );
}

/** A short cue as each answer comes in, so the round can be followed without looking. */
export function useAnswerCues(answered: { has: boolean }[] | undefined, key: unknown) {
  const theme = useTheme();
  const seen = useRef<{ key: unknown; n: number }>({ key: undefined, n: 0 });
  const count = answered?.length ?? 0;
  useEffect(() => {
    if (seen.current.key !== key) seen.current = { key, n: 0 };
    for (let i = seen.current.n; i < count; i++) cue(theme, answered![i]!.has ? 'hasOne' : 'pass');
    seen.current.n = count;
  }, [count, key, theme, answered]);
}
