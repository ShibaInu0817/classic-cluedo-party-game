import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import { TvHome } from '../src/App.tsx';
import { TvLobby } from '../src/screens/tv/TvLobby.tsx';
import { Lobby } from '../src/screens/Lobby.tsx';
import { Play } from '../src/screens/Play.tsx';
import { TvPlay } from '../src/screens/tv/TvPlay.tsx';
import { lobbyState, playState, renderGame } from './harness.tsx';

const THEMES = [{ id: 'tiny-manor', title: { en: 'Tiny Manor' }, languages: ['en'], players: { min: 3, max: 3 } }];

describe('hosting on the TV', () => {
  test('the TV opens its own room: board, players and bots, no player name', async () => {
    const { socket } = renderGame(
      <TvHome themes={THEMES} board="tiny-manor" onBoard={() => {}} code="" setCode={() => {}} onWatch={() => {}} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Host a game here' }));
    const form = screen.getByRole('form', { name: 'New game on this TV' });
    await userEvent.click(within(form).getByRole('button', { name: 'Open the room' }));
    expect(socket.last('room:host')).toEqual({ name: 'Game night', maxPlayers: 3, bots: true, themeId: 'tiny-manor' });
  });

  test('watching someone else\'s room by code is still there', () => {
    renderGame(<TvHome themes={THEMES} board="tiny-manor" onBoard={() => {}} code="48" setCode={() => {}} onWatch={() => {}} />);
    expect(screen.getByRole('button', { name: 'Watch' })).toBeDisabled();
  });

  test('the TV lobby says the first to join becomes host, then crowns them', () => {
    const { socket } = renderGame(<TvLobby />);
    socket.push('room:state', lobbyState({ seats: [] }));
    expect(screen.getByText('Waiting for players. The first to join becomes the host.')).toBeInTheDocument();
    socket.push('room:state', lobbyState({ seats: [{ seat: 0, name: 'Mei', isBot: false, connected: true }] }));
    expect(screen.getByText('Mei is the host and starts the game from their phone.')).toBeInTheDocument();
    expect(screen.getByLabelText('Host')).toBeInTheDocument();
  });

  test('the host\'s phone says so; other phones do not', () => {
    const seats = [{ seat: 0, name: 'Mei', isBot: false, connected: true }, { seat: 1, name: 'Ah Beng', isBot: false, connected: true }];
    const host = renderGame(<Lobby />, { seat: 0 });
    host.socket.push('room:state', lobbyState({ seats }));
    expect(screen.getByText(/You're the host/)).toBeInTheDocument();
    host.unmount();
    const guest = renderGame(<Lobby />, { seat: 1 });
    guest.socket.push('room:state', lobbyState({ seats }));
    expect(screen.queryByText(/You're the host/)).not.toBeInTheDocument();
  });
});

describe('leaving mid-game', () => {
  test('Leave game asks first, says a bot takes over, then leaves the room', async () => {
    const { socket } = renderGame(<Play />, { seat: 1 });
    socket.push('room:state', playState());
    await userEvent.click(screen.getByRole('button', { name: 'Leave game' }));
    const sheet = screen.getByRole('dialog', { name: 'Leave the game?' });
    expect(sheet).toHaveTextContent('A bot will play Cook for the rest of this game.');
    await userEvent.click(within(sheet).getByRole('button', { name: 'Stay' }));
    expect(socket.last('room:leave')).toBeUndefined();
    await userEvent.click(screen.getByRole('button', { name: 'Leave game' }));
    await userEvent.click(screen.getByRole('button', { name: 'Leave' }));
    expect(socket.last('room:leave')).toEqual({});
  });

  test('everyone, the TV too, is told who left and which character the bot now plays', () => {
    const { socket } = renderGame(<TvPlay />);
    const state = playState();
    state.seats[1] = { ...state.seats[1]!, isBot: true };
    socket.push('room:state', state);
    socket.push('game:events', [{ type: 'seatLeft', seat: 1 }]);
    expect(screen.getByText('Ah Beng left. A bot plays Cook.')).toBeInTheDocument();
  });
});
