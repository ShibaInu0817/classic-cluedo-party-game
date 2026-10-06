import { afterEach, describe, expect, test, vi } from 'vitest';
import { cue } from '../src/feedback.ts';
import { makeThemeApi } from '../src/theme/ThemeProvider.tsx';
import { tinyBundle } from './fixtures.ts';

function theme() {
  const b = tinyBundle();
  b.manifest.ui.haptics = { yourTurn: 'double', diceLand: 'hard' };
  b.manifest.ui.sfx = { yourTurn: 'assets/sfx/gong.mp3' };
  return makeThemeApi(b, 'en');
}

describe('sound and haptics cues', () => {
  const vibrate = vi.fn();
  const play = vi.fn(() => Promise.resolve());
  vi.stubGlobal('navigator', { ...navigator, vibrate });
  vi.stubGlobal('Audio', vi.fn(function (this: any, src: string) { this.src = src; this.play = play; }));
  afterEach(() => { vibrate.mockClear(); play.mockClear(); localStorage.clear(); });

  test('the theme decides the haptic pattern for each moment', () => {
    cue(theme(), 'yourTurn');
    expect(vibrate).toHaveBeenCalledWith([60, 80, 60]);
  });

  test('the theme can attach a sound file to a moment', () => {
    cue(theme(), 'yourTurn');
    expect(play).toHaveBeenCalled();
    expect((globalThis.Audio as any).mock.calls[0][0]).toBe('/themes/tiny-manor/assets/sfx/gong.mp3');
  });

  test('Settings can turn either off', () => {
    localStorage.setItem('haptics', 'off');
    localStorage.setItem('sound', 'off');
    cue(theme(), 'yourTurn');
    expect(vibrate).not.toHaveBeenCalled();
    expect(play).not.toHaveBeenCalled();
  });

  test('a moment the theme says nothing about is silent', () => {
    cue(theme(), 'killerReveal');
    expect(vibrate).not.toHaveBeenCalled();
    expect(play).not.toHaveBeenCalled();
  });
});
