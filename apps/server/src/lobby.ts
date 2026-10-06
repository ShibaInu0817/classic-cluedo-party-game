import type { Ack } from '@cluedo/protocol';
import type { Room } from './rooms.ts';

/** Lobby rules: one owner per suspect, bot fill, who the host is, and when the game may start. */

/** The host is the first connected person; if nobody is connected, the first person. */
export function hostSeat(room: Room): number {
  const connected = room.seats.findIndex((s) => !s.isBot && s.socketId);
  if (connected >= 0) return connected;
  return Math.max(0, room.seats.findIndex((s) => !s.isBot));
}
export const isHost = (room: Room, seat: number) => hostSeat(room) === seat;

export function pickChar(room: Room, seat: number, characterId: string): Ack {
  if (room.phase !== 'lobby') return { ok: false, error: 'game already started' };
  if (!room.theme.deck.suspects.some((s) => s.id === characterId)) return { ok: false, error: 'unknown character' };
  const owner = room.seats.findIndex((s) => s.characterId === characterId);
  if (owner >= 0 && owner !== seat) return { ok: false, error: 'character taken' };
  room.seats[seat]!.characterId = characterId;
  return { ok: true };
}

/** Fills every empty seat with a bot. Bots get their characters only at Start, after the people. */
export function fillBots(room: Room): Ack {
  if (room.phase !== 'lobby') return { ok: false, error: 'game already started' };
  let n = room.seats.filter((s) => s.isBot).length;
  while (room.seats.length < room.maxPlayers) room.seats.push({ name: `Bot ${++n}`, isBot: true });
  return { ok: true };
}

const freeCharacters = (room: Room) =>
  room.theme.deck.suspects.map((s) => s.id).filter((id) => !room.seats.some((s) => s.characterId === id));

/** Checks the room can start (filling bots if the room wants them) and gives every seat a character, people first. */
export function prepareStart(room: Room): Ack {
  if (room.phase !== 'lobby') return { ok: false, error: 'game already started' };
  if (room.bots) fillBots(room);
  const min = room.theme.manifest.meta.players.min;
  if (room.seats.length < min) return { ok: false, error: `need at least ${min} players` };
  for (const s of [...room.seats.filter((x) => !x.isBot), ...room.seats.filter((x) => x.isBot)]) {
    s.characterId ??= freeCharacters(room)[0];
  }
  return { ok: true };
}
