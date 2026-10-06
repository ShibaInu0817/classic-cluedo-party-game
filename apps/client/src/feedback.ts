import { useEffect, useRef } from 'react';
import type { PublicEvent } from '@cluedo/engine';
import type { ThemeApi } from './theme/ThemeProvider.tsx';
import { useTheme } from './theme/ThemeProvider.tsx';
import { useGame } from './state/store.ts';
import { local } from './storage.ts';

/** Named vibration patterns a theme can use in ui.haptics; a theme may also give raw durations ("40,30,40"). */
const PATTERNS: Record<string, number[]> = {
  light: [10],
  soft: [15],
  hard: [30],
  double: [60, 80, 60],
  heavy: [120],
  celebrate: [40, 60, 40, 60, 120],
};

export const settingOn = (key: 'sound' | 'haptics' | 'music' | 'alerts') => local.get(key) !== 'off';

/** Plays the theme's sound and haptic for a moment (e.g. 'diceLand', 'yourTurn'), if it defines any and Settings allow. */
export function cue(theme: ThemeApi, key: string) {
  const { haptics, sfx } = theme.manifest.ui;
  const h = haptics?.[key];
  if (h && settingOn('haptics')) {
    const pattern = PATTERNS[h] ?? h.split(',').map(Number).filter((n) => n > 0);
    if (pattern.length) navigator.vibrate?.(pattern);
  }
  const file = sfx?.[key];
  if (file && settingOn('sound')) {
    try {
      void new Audio(theme.asset(file)).play().catch(() => {});
    } catch { /* no audio in this environment */ }
  }
}

/** Turns public game events into cues for this phone, and flags the tab title when it is your turn in the background. */
export function useFeedback() {
  const theme = useTheme();
  const feed = useGame((s) => s.feed);
  const me = useGame((s) => s.me);
  const seen = useRef<PublicEvent | undefined>(feed.at(-1));
  useEffect(() => {
    const from = seen.current ? feed.lastIndexOf(seen.current) + 1 : 0;
    seen.current = feed.at(-1);
    for (const e of feed.slice(from)) {
      if (e.type === 'rolled') setTimeout(() => cue(theme, 'diceLand'), 1300);
      else if (e.type === 'moved') cue(theme, 'step');
      else if (e.type === 'suggested') cue(theme, 'suggest');
      else if (e.type === 'cardShown' && e.to === me?.seat) cue(theme, 'cardShown');
      else if (e.type === 'gameWon' || e.type === 'gameOver') cue(theme, 'killerReveal');
      else if (e.type === 'turnStarted' && e.seat === me?.seat) {
        cue(theme, 'yourTurn');
        if (settingOn('alerts') && document.hidden) document.title = `● ${theme.t('play.yourTurn')}`;
      }
    }
  }, [feed, me, theme]);
  useEffect(() => {
    const clear = () => { if (!document.hidden) document.title = theme.t(theme.manifest.meta.titleKey); };
    document.addEventListener('visibilitychange', clear);
    return () => document.removeEventListener('visibilitychange', clear);
  }, [theme]);
}

/** Background music from theme.ui.sfx.music, looping, when Settings allow. Starts on the first tap (browser rule). */
export function useMusic() {
  const theme = useTheme();
  const file = theme.manifest.ui.sfx?.music;
  useEffect(() => {
    if (!file || !settingOn('music') || !settingOn('sound')) return;
    let audio: HTMLAudioElement | undefined;
    try {
      audio = new Audio(theme.asset(file));
      audio.loop = true;
      audio.volume = 0.3;
    } catch { return; }
    const start = () => void audio!.play().catch(() => {});
    document.addEventListener('pointerdown', start, { once: true });
    return () => { document.removeEventListener('pointerdown', start); audio!.pause(); };
  }, [file, theme]);
}
