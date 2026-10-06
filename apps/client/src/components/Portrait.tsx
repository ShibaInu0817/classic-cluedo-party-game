import { useTheme } from '../theme/ThemeProvider.tsx';

/** A suspect's portrait cropped to the face, or their glyph on their colour while art loads. */
export function Portrait({ id, size = 56, grey = false }: { id: string; size?: number; grey?: boolean }) {
  const { manifest, asset } = useTheme();
  const s = manifest.deck.suspects.find((x) => x.id === id);
  if (!s) return null;
  return (
    <span className="portrait" style={{ width: size, height: size, background: s.color, filter: grey ? 'grayscale(1) opacity(.6)' : undefined }}>
      <img src={asset(s.art)} alt="" aria-hidden="true" />
    </span>
  );
}
