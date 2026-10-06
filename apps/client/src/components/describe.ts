import type { PublicEvent } from '@cluedo/engine';
import type { RoomState } from '@cluedo/protocol';
import type { ThemeApi } from '../theme/ThemeProvider.tsx';
import { seatName } from '../state/selectors.ts';

/** One log line for a public event, in the viewer's language. Undefined for events not worth a line. */
export function describe(e: PublicEvent, room: RoomState | undefined, th: ThemeApi): string | undefined {
  const { t, cardName } = th;
  const name = (seat: number) => seatName(room, seat, th);
  switch (e.type) {
    case 'rolled': return t('log.rolled', { name: name(e.seat), n: e.value });
    case 'suggested': return t('log.suggested', { name: name(e.seat), sus: cardName(e.trio.sus), room: cardName(e.trio.room), obj: cardName(e.trio.obj) });
    case 'asked': return t(e.has ? 'log.asked.has' : 'log.asked.pass', { name: name(e.seat) });
    case 'noDisprove': return t('log.noDisprove');
    case 'cardShown': return t('log.cardShown', { from: name(e.from), to: name(e.to) });
    case 'accused': return e.correct ? undefined : t('log.accused.wrong', { name: name(e.seat) });
    case 'turnStarted': return t('log.turnStarted', { name: name(e.seat) });
    case 'timedOut': return t('log.timedOut', { name: name(e.seat) });
    case 'gameWon': return t('end.winner', { name: name(e.seat) });
    default: return undefined;
  }
}
