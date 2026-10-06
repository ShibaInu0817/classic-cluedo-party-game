import { useGame } from '../state/store.ts';

export function ErrorBanner() {
  const error = useGame((s) => s.error);
  return error ? <p role="alert" className="error">{error}</p> : null;
}
