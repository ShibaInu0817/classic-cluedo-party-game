import { useGame } from '../../state/store.ts';
import { useTheme } from '../../theme/ThemeProvider.tsx';
import { Portrait } from '../../components/Portrait.tsx';
import { StoryPanel, useStory } from '../../components/StoryPanel.tsx';
import { seatName } from '../../state/selectors.ts';
import { Board } from '../../components/Board.tsx';
import { Ambient } from '../../components/TvStage.tsx';

/** The story, big, while the phones check their cards; then who is ready. */
export function TvIntro() {
  const theme = useTheme();
  const { t } = theme;
  const room = useGame((s) => s.room);
  const story = useStory(true, 6000);
  if (!room) return null;
  const ready = room.ready ?? [];
  return (
    <main className="tv tv-intro">
      <div className="tv-backdrop"><Board backdrop /></div>
      <Ambient />
      {story.panel && <StoryPanel art={story.panel.art} captionKey={story.panel.captionKey} big />}
      <ul className="tv-seats">
        {room.seats.map((s) => (
          <li key={s.seat} className={ready[s.seat] ? 'ready' : 'checking'}>
            {s.characterId && <Portrait id={s.characterId} size={64} />}
            <span>{seatName(room, s.seat, theme)} · {ready[s.seat] ? t('tv.ready') : t('tv.checking')}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
