import { useEffect, useState } from 'react';
import type { PublicEvent } from '@cluedo/engine';
import { useGame } from '../state/store.ts';
import { seatName } from '../state/selectors.ts';
import { useTheme } from '../theme/ThemeProvider.tsx';
import { cue } from '../feedback.ts';
import { beat } from '../motion.ts';
import { Portrait } from './Portrait.tsx';

type TurnStarted = Extract<PublicEvent, { type: 'turnStarted' }>;

/**
 * Whose turn it is, announced as it changes: on the TV a band sweeps across with the player's face;
 * on a phone a toast drops in for other players' turns (your own turn has the YOUR TURN ribbon).
 */
export function TurnBanner({ big }: { big?: boolean }) {
  const theme = useTheme();
  const room = useGame((s) => s.room);
  const me = useGame((s) => s.me);
  const feed = useGame((s) => s.feed);
  const last = [...feed].reverse().find((e): e is TurnStarted => e.type === 'turnStarted');
  const [shown, setShown] = useState<TurnStarted>();
  useEffect(() => {
    if (!last || (!big && last.seat === me?.seat)) return;
    setShown(last);
    cue(theme, 'turn');
    const h = setTimeout(() => setShown(undefined), beat(big ? 1900 : 2200));
    return () => clearTimeout(h);
  }, [last]); // eslint-disable-line react-hooks/exhaustive-deps
  const charId = shown && room?.game?.seats[shown.seat]?.characterId;
  if (!shown || !room) return null;
  const text = theme.t('banner.turn', { name: seatName(room, shown.seat, theme) });
  return (
    <div className={big ? 'turn-banner' : 'turn-toast'} role="status">
      {charId && <Portrait id={charId} size={big ? 120 : 40} />}
      <b>{text}</b>
    </div>
  );
}
