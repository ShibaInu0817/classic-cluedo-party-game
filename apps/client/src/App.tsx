import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { BrowserRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { connectSocket, type GameSocket } from './net/socket.ts';
import { createGameStore, GameProvider, useGame, type GameStore } from './state/store.ts';
import { fetchThemeBundle, ThemeProvider, useTheme, type ThemeBundle } from './theme/ThemeProvider.tsx';
import { FontLoader } from './theme/FontLoader.tsx';
import { local } from './storage.ts';
import { LangPick } from './screens/LangPick.tsx';
import { Home, type ThemeSummary } from './screens/Home.tsx';
import { Settings } from './screens/Settings.tsx';
import { Lobby } from './screens/Lobby.tsx';
import { Play } from './screens/Play.tsx';
import { End } from './screens/End.tsx';
import { TvLobby } from './screens/tv/TvLobby.tsx';
import { TvPlay } from './screens/tv/TvPlay.tsx';
import { Intro } from './screens/Intro.tsx';
import { TvIntro } from './screens/tv/TvIntro.tsx';
import { TvEnd } from './screens/tv/TvEnd.tsx';
import { LangToggle } from './components/LangToggle.tsx';
import { AccuseMoment } from './components/AccuseMoment.tsx';
import { useMusic } from './feedback.ts';

/** Loads the theme list, then the chosen (or the room's) theme, and provides it. */
function useThemes() {
  const [themes, setThemes] = useState<ThemeSummary[]>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    fetch('/themes').then((r) => r.json()).then(setThemes, () => setError('Cannot reach the game server.'));
  }, []);
  return { themes, error };
}

function ThemeGate({ themeId, lang, children }: { themeId: string; lang: string; children: ReactNode }) {
  const [bundle, setBundle] = useState<ThemeBundle>();
  useEffect(() => {
    let live = true;
    fetchThemeBundle(themeId, [lang]).then((b) => live && setBundle(b));
    return () => { live = false; };
  }, [themeId, lang]);
  if (!bundle || bundle.id !== themeId || (!bundle.i18n[lang] && bundle.manifest.meta.languages.includes(lang))) {
    return <div className="loading">…</div>;
  }
  return (
    <ThemeProvider bundle={bundle} lang={lang}>
      <FontLoader />
      <Music />
      {children}
    </ThemeProvider>
  );
}

function Music() {
  useMusic();
  return null;
}

function PhoneApp({ themes }: { themes: ThemeSummary[] }) {
  const navigate = useNavigate();
  const room = useGame((s) => s.room);
  const me = useGame((s) => s.me);
  const leave = useGame((s) => s.leave);
  const [lang, setLang] = useState(() => local.get('lang'));
  const [themeId, setThemeId] = useState(() => {
    const saved = local.get('themeId');
    return themes.some((t) => t.id === saved) ? saved! : themes[0]!.id;
  });
  const [settings, setSettings] = useState(false);
  const activeTheme = room?.themeId ?? themeId; // inside a room, its board wins
  const pickLang = (l: string) => { local.set('lang', l); setLang(l); };
  const pickTheme = (id: string) => { local.set('themeId', id); setThemeId(id); };
  const langFor = (id: string) => {
    const t = themes.find((x) => x.id === id)!;
    return lang && t.languages.includes(lang) ? lang : t.languages[0]!;
  };

  let screen: ReactNode;
  if (!lang) screen = <LangPick onPick={pickLang} />;
  else if (settings) screen = <Settings onLang={pickLang} onBack={() => setSettings(false)} />;
  else if (!room || !me) screen = <Home themes={themes} onThemeChange={pickTheme} onWatch={() => navigate('/tv')} onSettings={() => setSettings(true)} />;
  else if (room.phase === 'lobby') screen = <Lobby />;
  else if (room.phase === 'intro') screen = <Intro />;
  else if (room.phase === 'play') screen = <Play />;
  else screen = <End onHome={leave} />;

  return (
    <ThemeGate themeId={activeTheme} lang={langFor(activeTheme)}>
      {screen}
      {room && me && <AccuseMoment />}
    </ThemeGate>
  );
}

function TvApp({ themes }: { themes: ThemeSummary[] }) {
  const room = useGame((s) => s.room);
  const watchRoom = useGame((s) => s.watchRoom);
  const error = useGame((s) => s.error);
  const [code, setCode] = useState(() => new URLSearchParams(location.search).get('code') ?? '');
  const [lang, setLang] = useState(() => local.get('tvLang') ?? local.get('lang') ?? undefined);
  const pickLang = (l: string) => { local.set('tvLang', l); setLang(l); };
  useEffect(() => {
    if (/^\d{4}$/.test(code)) void watchRoom(code);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [board, setBoard] = useState(themes[0]!.id);
  const themeId = room?.themeId ?? board;
  const t = themes.find((x) => x.id === themeId)!;
  const tvLang = lang && t.languages.includes(lang) ? lang : t.languages[0]!;
  return (
    <ThemeGate themeId={themeId} lang={tvLang}>
      {!room ? (
        <TvHome themes={themes} board={board} onBoard={setBoard} code={code} setCode={setCode} onWatch={() => watchRoom(code)} error={error} />
      ) : room.phase === 'lobby' ? <TvLobby /> : room.phase === 'intro' ? <TvIntro /> : room.phase === 'play' ? <TvPlay /> : <TvEnd />}
      {room && <AccuseMoment />}
      <LangToggle onChange={pickLang} />
    </ThemeGate>
  );
}

/** The TV's start screen: host a new room here (the main way), or watch an existing one by its code. */
export function TvHome({ themes, board, onBoard, code, setCode, onWatch, error }: {
  themes: ThemeSummary[]; board: string; onBoard: (id: string) => void;
  code: string; setCode: (c: string) => void; onWatch: () => void; error?: string;
}) {
  const { t, manifest, asset, lang } = useTheme();
  const hostRoom = useGame((s) => s.hostRoom);
  const { min, max } = manifest.meta.players;
  const [setup, setSetup] = useState(false);
  const [players, setPlayers] = useState(max);
  const [bots, setBots] = useState(true);
  const count = Math.min(max, Math.max(min, players));
  return (
    <main className="tv tv-idle dotted">
      <img className="logo" src={asset(manifest.ui.logo)} alt={t(manifest.meta.titleKey)} />
      {!setup ? (
        <button className="btn primary big" onClick={() => setSetup(true)}>{t('tv.host')}</button>
      ) : (
        <form
          className="card tv-setup"
          aria-label={t('tv.setup')}
          onSubmit={(e) => { e.preventDefault(); void hostRoom({ name: t('create.defaultName'), maxPlayers: count, bots, themeId: board }); }}
        >
          <h2>{t('tv.setup')}</h2>
          {themes.length > 1 && (
            <label className="field">
              <span>{t('create.theme')}</span>
              <select value={board} onChange={(e) => onBoard(e.target.value)}>
                {themes.map((th) => <option key={th.id} value={th.id}>{th.title[lang] ?? th.title[th.languages[0]!] ?? th.id}</option>)}
              </select>
            </label>
          )}
          <div className="field">
            <span>{t('create.max')}</span>
            <div className="stepper">
              <button type="button" aria-label="−" onClick={() => setPlayers(Math.max(min, count - 1))}>−</button>
              <output aria-label={t('create.max')}>{count}</output>
              <button type="button" aria-label="+" onClick={() => setPlayers(Math.min(max, count + 1))}>+</button>
            </div>
          </div>
          <label className="toggle"><input type="checkbox" checked={bots} onChange={(e) => setBots(e.target.checked)} />{t('create.bots')}</label>
          <div className="row">
            <button type="button" className="btn" onClick={() => setSetup(false)}>{t('cancel')}</button>
            <button type="submit" className="btn primary">{t('tv.open')}</button>
          </div>
        </form>
      )}
      <form onSubmit={(e) => { e.preventDefault(); onWatch(); }} className="row" aria-label={t('tv.orWatch')}>
        <span className="hint">{t('tv.orWatch')}</span>
        <label className="field"><span>{t('tv.enterCode')}</span>
          <input inputMode="numeric" maxLength={4} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
        </label>
        <button className="btn" disabled={code.length !== 4}>{t('tv.watch')}</button>
      </form>
      {error && <p role="alert" className="error">{error}</p>}
    </main>
  );
}

export function App({ socket }: { socket?: GameSocket }) {
  const store: GameStore = useMemo(() => createGameStore(socket ?? connectSocket()), [socket]);
  const { themes, error } = useThemes();
  if (error) return <p className="fatal">{error}</p>;
  if (!themes) return <div className="loading">…</div>;
  if (!themes.length) return <p className="fatal">No theme packs installed.</p>;
  return (
    <GameProvider store={store}>
      <BrowserRouter>
        <Routes>
          <Route path="/tv" element={<TvApp themes={themes} />} />
          <Route path="*" element={<PhoneApp themes={themes} />} />
        </Routes>
      </BrowserRouter>
    </GameProvider>
  );
}
