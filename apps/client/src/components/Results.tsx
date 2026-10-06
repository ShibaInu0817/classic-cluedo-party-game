import { awardWinners } from '@cluedo/engine';
import { useGame } from '../state/store.ts';
import { seatName } from '../state/selectors.ts';
import { useTheme } from '../theme/ThemeProvider.tsx';
import { Card } from './Card.tsx';
import { Portrait } from './Portrait.tsx';
import { describe } from './describe.ts';

export function useEndInfo() {
  const theme = useTheme();
  const room = useGame((s) => s.room);
  const g = room?.game;
  if (!room || !g) return undefined;
  const humans = room.seats.filter((s) => !s.isBot).map((s) => s.seat);
  const yes = humans.filter((i) => room.votes?.[i] === true).length;
  return {
    room,
    g,
    awards: awardWinners(g, theme.manifest.ui.awards),
    votes: { n: yes, m: humans.length },
    suggestions: (room.history ?? []).filter((e) => e.type === 'suggested').length,
  };
}

export function Awards() {
  const theme = useTheme();
  const { t, manifest } = theme;
  const info = useEndInfo();
  if (!info) return null;
  return (
    <ul className="awards" aria-label={t('end.awards')}>
      {info.awards.map((a) => {
        const color = manifest.ui.awards.find((d) => d.stat === a.stat)?.color;
        return (
          <li key={a.stat} style={{ background: color }}>
            <Portrait id={info.g.seats[a.seat]!.characterId} size={44} />
            <strong>{t(a.labelKey)}</strong>
            <span>{seatName(info.room, a.seat, theme)}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function Answer() {
  const { t, cardName } = useTheme();
  const info = useEndInfo();
  const a = info?.g.answer;
  if (!a) return null;
  return (
    <>
      <div className="trio"><Card id={a.sus} /><Card id={a.room} /><Card id={a.obj} /></div>
      <h2>{t('end.happenedTitle')}</h2>
      <p>{t('end.happened', { sus: cardName(a.sus), room: cardName(a.room), obj: cardName(a.obj) })}</p>
    </>
  );
}

export function Timeline() {
  const theme = useTheme();
  const info = useEndInfo();
  if (!info) return null;
  const lines = (info.room.history ?? []).map((e) => describe(e, info.room, theme)).filter((l): l is string => !!l);
  return (
    <ol className="timeline" aria-label={theme.t('end.timeline')}>
      {lines.map((l, i) => <li key={i}>{l}</li>)}
    </ol>
  );
}
