import { useState } from 'react';
import { useGame } from '../state/store.ts';
import { useTheme } from '../theme/ThemeProvider.tsx';

/** Leave mid-game, after a confirm: a bot plays your character from then on, and this phone goes home. */
export function LeaveGame() {
  const { t, cardName } = useTheme();
  const leave = useGame((s) => s.leave);
  const character = useGame((s) => (s.me ? s.room?.seats[s.me.seat]?.characterId : undefined));
  const [asking, setAsking] = useState(false);
  return (
    <>
      <button className="btn small leave" onClick={() => setAsking(true)}>{t('leave.button')}</button>
      {asking && (
        <div className="sheet" role="dialog" aria-label={t('leave.title')}>
          <h2>{t('leave.title')}</h2>
          <p>{t('leave.body', { character: character ? cardName(character) : '' })}</p>
          <button className="btn danger big" onClick={() => void leave()}>{t('leave.confirm')}</button>
          <button className="btn" onClick={() => setAsking(false)}>{t('leave.stay')}</button>
        </div>
      )}
    </>
  );
}
