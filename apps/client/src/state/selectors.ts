import type { RoomState } from '@cluedo/protocol';

/** A seat's display name. Bots are named in the viewer's language ("Bot 2", "机器人 2") when `t` is given. */
type Namer = { t: (k: string, v?: Record<string, string | number>) => string; cardName: (id: string) => string };

/**
 * A seat's display name. A bot is named by the character it plays ("Maid (bot)"), or "Bot 2" before it has one,
 * in the viewer's language.
 */
export function seatName(room: RoomState | undefined, seat: number, th?: Namer) {
  const s = room?.seats[seat];
  if (!s) return `#${seat + 1}`;
  if (!s.isBot || !th) return s.name;
  if (s.characterId) return th.t('lobby.botAs', { char: th.cardName(s.characterId) });
  return th.t('lobby.botName', { n: room!.seats.slice(0, seat + 1).filter((x) => x.isBot).length });
}

export const isMyTurn = (room: RoomState | undefined, seat: number | undefined) =>
  !!room?.game && seat !== undefined && room.game.turn === seat && room.game.stage !== 'over';
