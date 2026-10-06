import { useGame } from '../state/store.ts';
import { useTheme } from '../theme/ThemeProvider.tsx';

export function ReactionTray({ onClose }: { onClose: () => void }) {
  const { t, manifest } = useTheme();
  const react = useGame((s) => s.react);
  return (
    <div className="tray" role="dialog" aria-label="reactions">
      {manifest.ui.stickers.map((s) => (
        <button key={s.id} className="sticker" style={{ background: s.color, color: s.textColor }} onClick={() => { void react(s.id); onClose(); }}>
          {t(s.labelKey)}
        </button>
      ))}
    </div>
  );
}

/** Stickers floating up from whoever sent them. */
export function FloatingReactions() {
  const { t, manifest } = useTheme();
  const reactions = useGame((s) => s.reactions);
  return (
    <div className="floating" aria-hidden="true">
      {reactions.map((r) => {
        const s = manifest.ui.stickers.find((x) => x.id === r.stickerId);
        if (!s) return null;
        return (
          <span key={r.id} className="float-up sticker" style={{ background: s.color, color: s.textColor, left: `${10 + ((r.seat * 37) % 80)}%` }}>
            {t(s.labelKey)}
          </span>
        );
      })}
    </div>
  );
}
