import { useEffect, useState } from 'react';
import type { PublicEvent } from '@cluedo/engine';
import { useGame } from '../state/store.ts';
import { seatName } from '../state/selectors.ts';
import { useTheme } from '../theme/ThemeProvider.tsx';

// Pip layout on a 3×3 grid, and the cube rotation that puts each value face-up (from the prototype).
const PIPS: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const FACE_ROT: Record<number, [number, number]> = { 1: [0, 0], 2: [-90, 0], 3: [0, -90], 4: [0, 90], 5: [90, 0], 6: [0, 180] };
const FACES: [number, string][] = [[1, 'translateZ(var(--h))'], [6, 'rotateY(180deg) translateZ(var(--h))'], [3, 'rotateY(90deg) translateZ(var(--h))'], [4, 'rotateY(-90deg) translateZ(var(--h))'], [2, 'rotateX(90deg) translateZ(var(--h))'], [5, 'rotateX(-90deg) translateZ(var(--h))']];

/** The last roll, as a 3D die that spins for ~1.3 s and lands on its value. Shown on every screen. */
export function Dice({ onBoard }: { onBoard?: boolean } = {}) {
  const theme = useTheme();
  const { t, manifest } = theme;
  const room = useGame((s) => s.room);
  const feed = useGame((s) => s.feed);
  const last = [...feed].reverse().find((e): e is Extract<PublicEvent, { type: 'rolled' }> => e.type === 'rolled');
  const [shown, setShown] = useState<typeof last>();
  useEffect(() => {
    if (!last) return;
    setShown(last);
    const h = setTimeout(() => setShown(undefined), 2200);
    return () => clearTimeout(h);
  }, [last]);
  if (!shown || !room) return null;
  const v = Math.min(6, Math.max(1, shown.value));
  const [x, y] = FACE_ROT[v]!;
  const accent = manifest.ui.dice?.accentFaces ?? [];
  return (
    <div className={`dice-overlay ${onBoard ? 'on-board' : ''}`} role="img" aria-label={t('log.rolled', { name: seatName(room, shown.seat, theme), n: shown.value })}>
      <div className="cube" style={{ ['--end' as string]: `rotateX(${720 + x}deg) rotateY(${720 + y}deg)` }}>
        {FACES.map(([n, tf]) => (
          <div key={n} className={`face ${accent.includes(n) ? 'accent' : ''}`} style={{ transform: tf }}>
            {Array.from({ length: 9 }, (_, i) => <i key={i} style={{ opacity: PIPS[n]!.includes(i) ? 1 : 0 }} />)}
          </div>
        ))}
      </div>
      {shown.value > 6 && <span className="dice-value">{shown.value}</span>}
    </div>
  );
}
