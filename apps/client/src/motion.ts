import { local } from './storage.ts';

/** "Fast animations" (Settings) halves every staged beat: banners, the suggestion scene, the asking round. */
export const motionScale = () => (local.get('motion') === 'fast' ? 0.5 : 1);

/** A beat length in ms, scaled by the player's animation speed. */
export const beat = (ms: number) => Math.round(ms * motionScale());

/** Publishes the speed to CSS as --speed, so staged animations scale with it. */
export function applyMotion() {
  document.documentElement.style.setProperty('--speed', String(motionScale()));
}
