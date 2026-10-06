import { useTheme } from '../theme/ThemeProvider.tsx';
import { langName } from '../i18n/langName.ts';

/** A compact language switch (the TV has no Settings screen). */
export function LangToggle({ onChange }: { onChange: (lang: string) => void }) {
  const { manifest, lang } = useTheme();
  return (
    <div className="lang-toggle segmented">
      {manifest.meta.languages.map((l) => (
        <button key={l} lang={l} aria-pressed={l === lang} onClick={() => onChange(l)}>{langName(l)}</button>
      ))}
    </div>
  );
}
