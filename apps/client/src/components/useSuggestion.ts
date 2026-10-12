import { useEffect, useState } from 'react';
import type { PublicEvent } from '@cluedo/engine';
import { useGame } from '../state/store.ts';
import { beat } from '../motion.ts';

type Suggested = Extract<PublicEvent, { type: 'suggested' }>;
type Asked = Extract<PublicEvent, { type: 'asked' }>;
type Resolved = Extract<PublicEvent, { type: 'cardShown' } | { type: 'noDisprove' }>;

/** How long the three cards hold the stage before anyone is asked, and how long each answer takes. */
export const SCENE_MS = 1600;
export const ASK_MS = 1000;
const HOLD_MS = 3500;

export interface SuggestionBeat {
  sug: Suggested;
  /** Answers revealed so far, in order around the table. */
  answered: Asked[];
  /** The seat being asked right now, if any. */
  asking?: number;
  /** "A showed B a card" or "nobody could disprove", once every answer before it is out. */
  resolved?: Resolved;
}

/**
 * The latest suggestion, paced for the table. The server sends the suggestion and every pass at once;
 * here the cards get the stage first, then each player answers in turn, then the outcome lands.
 * Ends a few seconds after the outcome, or at once when the next turn starts.
 */
export function useSuggestion(): SuggestionBeat | undefined {
  const feed = useGame((s) => s.feed);
  const start = feed.map((e) => e.type).lastIndexOf('suggested');
  const sug = start >= 0 ? (feed[start] as Suggested) : undefined;
  const after = start >= 0 ? feed.slice(start + 1) : [];
  const end = after.findIndex((e) => e.type === 'turnStarted' || e.type === 'rolled' || e.type === 'suggested');
  const chain = end >= 0 ? after.slice(0, end) : after;
  const asked = chain.filter((e): e is Asked => e.type === 'asked');
  const resolved = chain.find((e): e is Resolved => e.type === 'cardShown' || e.type === 'noDisprove');

  // How far the round has got on this screen: 0 = cards on stage, k = k answers out.
  const [step, setStep] = useState<{ of?: Suggested; n: number }>({ n: 0 });
  const [over, setOver] = useState<Suggested>();
  const n = step.of === sug ? step.n : 0;
  const total = asked.length;

  useEffect(() => {
    if (!sug || n > total) return;
    const h = setTimeout(() => setStep({ of: sug, n: n + 1 }), beat(n === 0 ? SCENE_MS : ASK_MS));
    return () => clearTimeout(h);
  }, [sug, n, total]);

  const shown = Math.max(0, Math.min(n - 1, total));
  const landed = resolved && n > total;
  useEffect(() => {
    if (!landed || !sug) return;
    const h = setTimeout(() => setOver(sug), beat(HOLD_MS));
    return () => clearTimeout(h);
  }, [landed, sug]);

  if (!sug || end >= 0 || over === sug) return undefined;
  const answered = asked.slice(0, shown);
  const next = n >= 1 && shown < total ? asked[shown]!.seat : undefined;
  return { sug, answered, asking: next, resolved: landed ? resolved : undefined };
}
