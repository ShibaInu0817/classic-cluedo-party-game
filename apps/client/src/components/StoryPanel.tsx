import { useEffect, useMemo, useState } from 'react';
import { useTheme } from '../theme/ThemeProvider.tsx';

/** All story panels of the theme, in order. */
export function useStoryPanels() {
  const { manifest } = useTheme();
  return useMemo(
    () => manifest.story.chapters.flatMap((ch) => ch.panels.map((p) => ({ ...p, chapter: ch.id, autoplay: !!ch.autoplay }))),
    [manifest],
  );
}

/** Steps through the panels: autoplay chapters advance on their own (`ms`, default 2.5 s); others wait for `next()`. */
export function useStory(loop = false, defaultMs?: number) {
  const panels = useStoryPanels();
  const [i, setI] = useState(0);
  const panel = panels[i];
  const done = i >= panels.length;
  useEffect(() => {
    if (!panel || !(panel.autoplay || defaultMs)) return;
    const h = setTimeout(() => setI((n) => (loop && n + 1 >= panels.length ? n : n + 1)), panel.ms ?? defaultMs ?? 2500);
    return () => clearTimeout(h);
  }, [i, panel, loop, defaultMs, panels.length]);
  return { panel, done, next: () => setI((n) => n + 1), skip: () => setI(panels.length), index: i, total: panels.length };
}

export function StoryPanel({ art, captionKey, big }: { art: string; captionKey: string; big?: boolean }) {
  const { t, asset } = useTheme();
  return (
    <figure className={`story-panel ${big ? 'big' : ''}`}>
      <div className="story-art"><img src={asset(art)} alt="" /></div>
      <figcaption>{t(captionKey)}</figcaption>
    </figure>
  );
}
