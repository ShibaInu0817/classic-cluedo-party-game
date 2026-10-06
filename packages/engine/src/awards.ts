import type { PublicGame } from './views.ts';

export interface AwardDef { stat: string; labelKey: string; lowest?: boolean }

/**
 * Who earns each of the theme's awards. `correctAccuse` goes to the winner; any other stat is a per-seat
 * count in `stats`, won by the highest (or, with `lowest`, the lowest) count, first seat on a tie.
 * An award nobody earned (no winner, or a top count of 0) is left out.
 */
export function awardWinners(g: PublicGame, defs: AwardDef[]): (AwardDef & { seat: number })[] {
  const out: (AwardDef & { seat: number })[] = [];
  for (const d of defs) {
    if (d.stat === 'correctAccuse') {
      if (g.winner !== undefined) out.push({ ...d, seat: g.winner });
      continue;
    }
    const counts = (g.stats as Record<string, number[] | undefined>)[d.stat];
    if (!counts?.length) continue;
    const best = d.lowest ? Math.min(...counts) : Math.max(...counts);
    if (!d.lowest && best === 0) continue;
    out.push({ ...d, seat: counts.indexOf(best) });
  }
  return out;
}
