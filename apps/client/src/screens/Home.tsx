import { useState } from 'react';
import { useGame } from '../state/store.ts';
import { useTheme } from '../theme/ThemeProvider.tsx';
import { ErrorBanner } from '../components/ErrorBanner.tsx';

export interface ThemeSummary {
  id: string;
  title: Record<string, string>;
  languages: string[];
  players: { min: number; max: number };
}

type Sheet = 'none' | 'create' | 'join';

export function Home({ themes, onThemeChange, onWatch, onSettings }: {
  themes: ThemeSummary[];
  onThemeChange?: (id: string) => void;
  onWatch?: () => void;
  onSettings?: () => void;
}) {
  const { t, manifest, asset, bundle, lang } = useTheme();
  const createRoom = useGame((s) => s.createRoom);
  const joinRoom = useGame((s) => s.joinRoom);
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('playerName') ?? '');
  const [sheet, setSheet] = useState<Sheet>(() => (new URLSearchParams(location.search).get('code') ? 'join' : 'none'));
  const { min, max } = manifest.meta.players;
  const [roomName, setRoomName] = useState(t('create.defaultName'));
  const [maxPlayers, setMaxPlayers] = useState(max);
  const [mode, setMode] = useState<'phones' | 'tv'>('tv');
  const [bots, setBots] = useState(true);
  const [code, setCode] = useState(() => new URLSearchParams(location.search).get('code') ?? '');

  const name = playerName.trim();
  const remember = () => localStorage.setItem('playerName', name);

  return (
    <main className="screen home dotted">
      {onSettings && <button className="gear" aria-label={t('home.settings')} onClick={onSettings}>⚙</button>}
      <div className="victim-polaroid">
        <img src={asset(manifest.meta.victim.art)} alt={t(manifest.meta.victim.nameKey)} />
      </div>
      <img className="logo" src={asset(manifest.ui.logo)} alt={t(manifest.meta.titleKey)} />

      <label className="field">
        <span>{t('home.name')}</span>
        <input value={playerName} maxLength={20} onChange={(e) => setPlayerName(e.target.value)} />
      </label>

      <div className="stack">
        <button className="btn primary big" disabled={!name} onClick={() => setSheet('create')}>{t('home.create')}</button>
        <button className="btn big" disabled={!name} onClick={() => setSheet('join')}>{t('home.join')}</button>
        {onWatch && <button className="btn" onClick={onWatch}>{t('home.watch')}</button>}
      </div>
      <ErrorBanner />

      {sheet === 'create' && (
        <form
          className="sheet"
          onSubmit={(e) => {
            e.preventDefault();
            remember();
            void createRoom({ name: roomName.trim() || t('create.defaultName'), maxPlayers, mode, bots, themeId: bundle.id, playerName: name });
          }}
        >
          <h2>{t('create.title')}</h2>
          {themes.length > 1 && (
            <label className="field">
              <span>{t('create.theme')}</span>
              <select value={bundle.id} onChange={(e) => onThemeChange?.(e.target.value)}>
                {themes.map((th) => <option key={th.id} value={th.id}>{th.title[lang] ?? th.title[th.languages[0]!] ?? th.id}</option>)}
              </select>
            </label>
          )}
          <label className="field">
            <span>{t('create.name')}</span>
            <input value={roomName} maxLength={40} onChange={(e) => setRoomName(e.target.value)} />
          </label>
          <div className="field">
            <span>{t('create.max')}</span>
            <div className="stepper">
              <button type="button" aria-label="−" onClick={() => setMaxPlayers((n) => Math.max(min, n - 1))}>−</button>
              <output aria-label={t('create.max')}>{maxPlayers}</output>
              <button type="button" aria-label="+" onClick={() => setMaxPlayers((n) => Math.min(max, n + 1))}>+</button>
            </div>
          </div>
          <fieldset className="field modes">
            <legend>{t('create.mode')}</legend>
            {(['phones', 'tv'] as const).map((m) => (
              <label key={m} className={`mode ${mode === m ? 'on' : ''}`}>
                <input type="radio" name="mode" checked={mode === m} onChange={() => setMode(m)} />
                {t(`create.mode.${m}`)}
              </label>
            ))}
          </fieldset>
          <label className="toggle">
            <input type="checkbox" checked={bots} onChange={(e) => setBots(e.target.checked)} />
            {t('create.bots')}
          </label>
          <div className="row">
            <button type="button" className="btn" onClick={() => setSheet('none')}>{t('cancel')}</button>
            <button type="submit" className="btn primary">{t('create.go')}</button>
          </div>
        </form>
      )}

      {sheet === 'join' && (
        <form
          className="sheet"
          onSubmit={(e) => {
            e.preventDefault();
            remember();
            void joinRoom(code, name);
          }}
        >
          <h2>{t('home.join')}</h2>
          <label className="field">
            <span>{t('home.code')}</span>
            <input inputMode="numeric" pattern="\d{4}" maxLength={4} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
          </label>
          <div className="row">
            <button type="button" className="btn" onClick={() => setSheet('none')}>{t('cancel')}</button>
            <button type="submit" className="btn primary" disabled={code.length !== 4 || !name}>{t('join.go')}</button>
          </div>
        </form>
      )}
    </main>
  );
}
