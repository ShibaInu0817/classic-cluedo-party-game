import { useGame } from '../state/store.ts';
import { useTheme } from '../theme/ThemeProvider.tsx';

/** The last error. Client-side errors are i18n keys and get translated; server errors show as sent. */
export function ErrorBanner() {
  const { t } = useTheme();
  const error = useGame((s) => s.error);
  return error ? <p role="alert" className="error">{t(error)}</p> : null;
}
