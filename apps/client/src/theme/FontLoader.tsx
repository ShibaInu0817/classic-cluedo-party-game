import { useEffect } from 'react';
import { useTheme } from './ThemeProvider.tsx';

/** Loads the theme's font families from Google Fonts. Families Google doesn't have fall back to the CSS stack. */
export function FontLoader() {
  const { manifest } = useTheme();
  const { display, ui, glyph } = manifest.ui.tokens.font;
  useEffect(() => {
    const families = [...new Set([display, ui, glyph])]
      .map((f) => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@400;500;600;700;900`)
      .join('&');
    const href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link = Object.assign(document.createElement('link'), { rel: 'stylesheet', href });
    document.head.appendChild(link);
  }, [display, ui, glyph]);
  return null;
}
