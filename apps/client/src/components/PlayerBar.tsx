import { useEffect, useState } from 'react';
import { useGame } from '../state/store.ts';
import { useTheme } from '../theme/ThemeProvider.tsx';
import { Portrait } from './Portrait.tsx';
import { seatName } from '../state/selectors.ts';

export function useSecondsLeft(deadline?: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const h = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(h);
  }, []);
  return deadline ? Math.max(0, Math.ceil((deadline - now) / 1000)) : undefined;
}

export function PlayerBar({ onReact }: { onReact?: () => void }) {
  const theme = useTheme();
  const { t, manifest } = theme;
  const room = useGame((s) => s.room);
  const me = useGame((s) => s.me);
  const left = useSecondsLeft(room?.deadline);
  const g = room?.game;
  if (!g) return null;
  const total = manifest.rules?.turnSeconds ?? 60;
  const secs = left === undefined ? undefined : Math.min(left, total);
  return (
    <header className="player-bar">
      <span className="chip">{t('play.round', { n: g.round })}</span>
      <ol className="avatars">
        {g.seats.map((s, i) => {
          const active = i === g.turn;
          return (
            <li key={i} className={`${active ? 'active' : ''} ${g.out[i] ? 'ghost' : ''}`} title={seatName(room, i, theme)}>
              {active && secs !== undefined && (
                <svg className={`ring ${secs <= 10 ? 'low' : ''}`} viewBox="0 0 36 36" aria-hidden="true">
                  <circle cx="18" cy="18" r="16" pathLength="100" strokeDasharray={`${(secs / total) * 100} 100`} />
                </svg>
              )}
              <Portrait id={s.characterId} size={active ? 40 : 26} grey={g.out[i]} />
              {i === me?.seat && <span className="you-tag">{t('play.you')}</span>}
            </li>
          );
        })}
      </ol>
      {secs !== undefined && <span className={`chip secs ${secs <= 10 ? 'low' : ''}`}>{secs}s</span>}
      {onReact && <button className="react-btn" data-tut="reactions" aria-label="reactions" onClick={onReact}>😀</button>}
    </header>
  );
}
