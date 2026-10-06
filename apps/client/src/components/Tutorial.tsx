import { useLayoutEffect, useState } from 'react';
import { useTheme } from '../theme/ThemeProvider.tsx';
import { local } from '../storage.ts';

/**
 * First-game coach marks from theme.ui.tutorial. Each mark spotlights the element tagged
 * `data-tut="<target>"` and explains it. Finishing or skipping hides it for good on this device.
 */
export function Tutorial() {
  const { t, manifest, bundle } = useTheme();
  const key = `tutDone:${bundle.id}`;
  const steps = manifest.ui.tutorial;
  const [i, setI] = useState(() => (local.get(key) ? steps.length : 0));
  const [box, setBox] = useState<DOMRect>();
  const step = steps[i];

  useLayoutEffect(() => {
    if (!step) return;
    setBox(document.querySelector(`[data-tut="${step.target}"]`)?.getBoundingClientRect());
  }, [step]);

  if (!step) return null;
  const finish = () => { local.set(key, '1'); setI(steps.length); };
  const next = () => (i + 1 >= steps.length ? finish() : setI(i + 1));
  const pad = 6;
  return (
    <div className="tutorial" role="dialog" aria-label={t('tut.title')}>
      {box && (
        <div className="spot" style={{ left: box.left - pad, top: box.top - pad, width: box.width + pad * 2, height: box.height + pad * 2 }} />
      )}
      <div className="bubble" style={{ top: box && box.bottom + 12 < innerHeight - 160 ? box.bottom + 12 : 16 }}>
        <p>{t(step.textKey)}</p>
        <div className="row spread">
          <button className="btn small" onClick={finish}>{t('tut.skip')}</button>
          <span className="hint">{i + 1}/{steps.length}</span>
          <button className="btn small primary" onClick={next}>{t('intro.next')}</button>
        </div>
      </div>
    </div>
  );
}
