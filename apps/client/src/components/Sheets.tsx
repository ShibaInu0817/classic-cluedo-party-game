import { useState } from 'react';
import { roomOf } from '@cluedo/theme-sdk/board';
import { useGame } from '../state/store.ts';
import { seatName } from '../state/selectors.ts';
import { useTheme } from '../theme/ThemeProvider.tsx';
import { Card } from './Card.tsx';

function Choice({ name, ids, value, onChange }: { name: string; ids: string[]; value?: string; onChange: (id: string) => void }) {
  const theme = useTheme();
  const { cardName } = theme;
  return (
    <div className="choice-grid" role="radiogroup" aria-label={name}>
      {ids.map((id) => (
        <label key={id} className={`choice ${value === id ? 'on' : ''}`}>
          <input type="radio" name={name} checked={value === id} onChange={() => onChange(id)} aria-label={cardName(id)} />
          <Card id={id} small />
        </label>
      ))}
    </div>
  );
}

export function SuggestSheet({ onClose, onCheckNotes }: { onClose: () => void; onCheckNotes?: () => void }) {
  const { t, manifest, cardName } = useTheme();
  const room = useGame((s) => s.room);
  const me = useGame((s) => s.me);
  const intent = useGame((s) => s.intent);
  const [sus, setSus] = useState<string>();
  const [obj, setObj] = useState<string>();
  const where = roomOf(room!.game!.pos[room!.game!.seats[me!.seat]!.characterId]!)!;
  return (
    <div className="sheet" role="dialog" aria-label={t('play.suggest')}>
      <h2>{t('sheet.suggest', { room: cardName(where) })}</h2>
      {onCheckNotes && <button className="btn small" onClick={onCheckNotes}>{t('sheet.checkNotes')}</button>}
      <h3>{t('sheet.who')}</h3>
      <Choice name="sus" ids={manifest.deck.suspects.map((c) => c.id)} value={sus} onChange={setSus} />
      <h3>{t('sheet.what')}</h3>
      <Choice name="obj" ids={manifest.deck.objects.map((c) => c.id)} value={obj} onChange={setObj} />
      <div className="row">
        <button className="btn" onClick={onClose}>{t('cancel')}</button>
        <button className="btn primary" disabled={!sus || !obj} onClick={() => { void intent({ type: 'suggest', sus: sus!, obj: obj! }); onClose(); }}>
          {t('sheet.confirm')}
        </button>
      </div>
    </div>
  );
}

export function AccuseSheet({ onClose }: { onClose: () => void }) {
  const { t, manifest } = useTheme();
  const intent = useGame((s) => s.intent);
  const used = useGame((s) => (s.me && s.room?.game?.accusations?.[s.me.seat]) ?? 0);
  const limit = manifest.rules?.accusationsPerPlayer ?? 1;
  const [sus, setSus] = useState<string>();
  const [room, setRoom] = useState<string>();
  const [obj, setObj] = useState<string>();
  const [confirming, setConfirming] = useState(false);
  const ready = sus && room && obj;
  return (
    <div className="sheet" role="dialog" aria-label={t('sheet.accuse')}>
      <h2>{t('sheet.accuse')}</h2>
      {!confirming ? (
        <>
          <h3>{t('sheet.who')}</h3>
          <Choice name="a-sus" ids={manifest.deck.suspects.map((c) => c.id)} value={sus} onChange={setSus} />
          <h3>{t('sheet.where')}</h3>
          <Choice name="a-room" ids={manifest.deck.rooms.map((c) => c.id)} value={room} onChange={setRoom} />
          <h3>{t('sheet.what')}</h3>
          <Choice name="a-obj" ids={manifest.deck.objects.map((c) => c.id)} value={obj} onChange={setObj} />
          <div className="row">
            <button className="btn" onClick={onClose}>{t('cancel')}</button>
            <button className="btn primary" disabled={!ready} onClick={() => setConfirming(true)}>{t('sheet.accuse')}</button>
          </div>
        </>
      ) : (
        <>
          <p className="warn">{limit > 1 ? t('sheet.accuseLeft', { n: limit - used }) : t('sheet.accuseSure')}</p>
          <div className="trio"><Card id={sus!} /><Card id={room!} /><Card id={obj!} /></div>
          <div className="row">
            <button className="btn" onClick={() => setConfirming(false)}>{t('back')}</button>
            <button className="btn primary" onClick={() => { void intent({ type: 'accuse', sus: sus!, room: room!, obj: obj! }); onClose(); }}>
              {t('sheet.confirm')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/** Shown to the seat being asked to disprove: only its matching cards are offered. */
export function ShowCardSheet() {
  const theme = useTheme();
  const { t, cardName } = theme;
  const req = useGame((s) => s.showRequest);
  const room = useGame((s) => s.room);
  const intent = useGame((s) => s.intent);
  if (!req) return null;
  const label = t('sheet.show', { name: seatName(room, req.by, theme) });
  return (
    <div className="sheet" role="dialog" aria-label={label}>
      <h2>{label}</h2>
      <div className="trio">
        {req.cards.map((c) => (
          <button key={c} className="card-btn" aria-label={cardName(c)} onClick={() => intent({ type: 'showCard', card: c })}>
            <Card id={c} />
          </button>
        ))}
      </div>
    </div>
  );
}

/** A card someone showed me, until I dismiss it. */
export function ShownDialog() {
  const theme = useTheme();
  const { t } = theme;
  const shown = useGame((s) => s.shownQueue[0]);
  const room = useGame((s) => s.room);
  const dismiss = useGame((s) => s.dismissShown);
  if (!shown) return null;
  const label = t('shown.title', { name: seatName(room, shown.from, theme) });
  return (
    <div className="sheet" role="dialog" aria-label={label}>
      <h2>{label}</h2>
      <div className="trio flip"><Card id={shown.card} /></div>
      <button className="btn primary" onClick={dismiss}>{t('shown.ok')}</button>
    </div>
  );
}

/** After a wrong accusation: the answer, privately, then carry on as a ghost. */
export function WrongDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTheme();
  const env = useGame((s) => s.priv?.envelope);
  if (!env) return null;
  return (
    <div className="sheet" role="dialog" aria-label={t('sheet.wrong')}>
      <h2>{t('sheet.wrong')}</h2>
      <div className="trio"><Card id={env.sus} /><Card id={env.room} /><Card id={env.obj} /></div>
      <button className="btn" onClick={onClose}>{t('sheet.continueGhost')}</button>
    </div>
  );
}
