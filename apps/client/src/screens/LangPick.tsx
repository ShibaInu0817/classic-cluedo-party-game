import { useTheme } from '../theme/ThemeProvider.tsx';
import { langName } from '../i18n/langName.ts';

export function LangPick({ onPick }: { onPick: (lang: string) => void }) {
  const { manifest, asset, t } = useTheme();
  const code = new URLSearchParams(location.search).get('code');
  return (
    <main className="screen lang-pick dotted">
      <img className="logo" src={asset(manifest.ui.logo)} alt={manifest.meta.id} />
      {code && <p className="card joining">{t('join.joining', { code })}</p>}
      <div className="stack">
        {manifest.meta.languages.map((l) => (
          <button key={l} className="btn big" onClick={() => onPick(l)} lang={l}>
            {langName(l)}
          </button>
        ))}
      </div>
    </main>
  );
}
