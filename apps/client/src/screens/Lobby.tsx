import { useGame } from '../state/store.ts';
import { useTheme } from '../theme/ThemeProvider.tsx';
import { Portrait } from '../components/Portrait.tsx';
import { seatName } from '../state/selectors.ts';

export function Lobby() {
  const theme = useTheme();
  const { t, manifest, cardName } = theme;
  const room = useGame((s) => s.room);
  const me = useGame((s) => s.me);
  const pickChar = useGame((s) => s.pickChar);
  const fillBots = useGame((s) => s.fillBots);
  const start = useGame((s) => s.start);
  const kick = useGame((s) => s.kick);
  const leave = useGame((s) => s.leave);
  if (!room || !me) return null;

  const isHost = me.seat === room.hostSeat;
  const owner = (id: string) => room.seats.find((s) => s.characterId === id);
  const enough = room.bots || room.seats.length >= room.minPlayers;

  const share = () => {
    const url = `${location.origin}/?code=${room.code}`;
    if (navigator.share) void navigator.share({ title: t('title'), text: `${t('lobby.code')}: ${room.code}`, url });
    else void navigator.clipboard?.writeText(url);
  };

  return (
    <main className="screen lobby">
      {isHost && <span className="host-badge">👑 {t('lobby.youHost')}</span>}
      <section className="card code-card">
        <div className="label">{t('lobby.code')}</div>
        <div className="code" data-testid="room-code">{room.code}</div>
        <button className="btn small" onClick={share}>{t('lobby.share')}</button>
      </section>

      <h2>{t('lobby.pick')}</h2>
      <div className="char-grid">
        {manifest.deck.suspects.map((s) => {
          const o = owner(s.id);
          const mine = o?.seat === me.seat;
          const taken = !!o && !mine;
          return (
            <button key={s.id} className={`char ${mine ? 'mine' : ''} ${taken ? 'taken' : ''}`} disabled={taken} onClick={() => pickChar(s.id)}>
              <Portrait id={s.id} size={64} grey={taken} />
              <span className="char-name">{cardName(s.id)}</span>
              {o && <span className="owner">{mine ? t('lobby.you') : seatName(room, o.seat, theme)}</span>}
            </button>
          );
        })}
      </div>

      <h2>{t('lobby.seats')} · {room.seats.length}/{room.maxPlayers}</h2>
      <ul className="seat-list">
        {room.seats.map((s) => (
          <li key={s.seat} className={s.connected ? '' : 'offline'}>
            {s.characterId ? <Portrait id={s.characterId} size={32} /> : <span className="portrait empty" />}
            <span>{seatName(room, s.seat, theme)}</span>
            {s.isBot && <span className="tag">{t('lobby.bot')}</span>}
            {s.seat === me.seat && <span className="tag you">{t('lobby.you')}</span>}
            {!s.connected && <span className="tag">{t('lobby.offline')}</span>}
            {isHost && s.seat !== me.seat && (
              <button className="remove" aria-label={t('lobby.remove', { name: seatName(room, s.seat, theme) })} onClick={() => kick(s.seat)}>✕</button>
            )}
          </li>
        ))}
      </ul>

      {isHost ? (
        <div className="actions">
          {room.seats.length < room.maxPlayers && (
            <button className="btn" onClick={() => fillBots()}>{t('lobby.fillBots')}</button>
          )}
          <button className="btn primary big" disabled={!enough} onClick={() => start()}>{t('lobby.start')}</button>
          {!enough && <p className="hint">{t('lobby.needPlayers', { n: room.minPlayers })}</p>}
          {room.bots && room.seats.length < room.maxPlayers && <p className="hint">{t('lobby.botsAtStart')}</p>}
        </div>
      ) : (
        <p className="hint">{t('lobby.waitHost')}</p>
      )}
      <button className="btn small" onClick={() => leave()}>{t('lobby.leave')}</button>
    </main>
  );
}
