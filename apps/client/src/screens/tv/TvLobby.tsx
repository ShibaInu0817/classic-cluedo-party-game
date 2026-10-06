import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useGame } from '../../state/store.ts';
import { useTheme } from '../../theme/ThemeProvider.tsx';
import { Portrait } from '../../components/Portrait.tsx';
import { seatName } from '../../state/selectors.ts';

export const joinUrl = (code: string) => `${location.origin}/?code=${code}`;

export function TvLobby() {
  const theme = useTheme();
  const { t, manifest, asset, cardName } = theme;
  const room = useGame((s) => s.room);
  const [qr, setQr] = useState<string>();
  const url = room ? joinUrl(room.code) : undefined;

  useEffect(() => {
    if (url) void QRCode.toDataURL(url, { margin: 1, width: 360 }).then(setQr);
  }, [url]);

  if (!room) return null;
  return (
    <main className="tv tv-lobby">
      <img className="logo" src={asset(manifest.ui.logo)} alt={t(manifest.meta.titleKey)} />
      <div className="tv-join">
        {qr && <img className="qr" src={qr} data-url={url} alt={t('tv.scan')} />}
        <div>
          <div className="label">{t('tv.scan')}</div>
          <div className="code big">{room.code}</div>
        </div>
      </div>
      <ul className="tv-seats">
        {room.seats.map((s) => (
          <li key={s.seat} className="pop">
            {s.characterId ? <Portrait id={s.characterId} size={96} /> : <span className="portrait empty" />}
            <strong>{seatName(room, s.seat, theme)}</strong>
            {s.characterId && <span>{cardName(s.characterId)}</span>}
          </li>
        ))}
      </ul>
    </main>
  );
}
