import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import { Lobby } from '../src/screens/Lobby.tsx';
import { lobbyState, renderGame } from './harness.tsx';

describe('Lobby', () => {
  test('shows the room code to share', () => {
    const { socket } = renderGame(<Lobby />, { seat: 0 });
    socket.push('room:state', lobbyState());
    expect(screen.getByTestId('room-code')).toHaveTextContent('4821');
  });

  test('a character taken by someone else is dimmed with the owner name; a free one can be picked', async () => {
    const { socket } = renderGame(<Lobby />, { seat: 0 });
    socket.push('room:state', lobbyState({
      seats: [
        { seat: 0, name: 'Host', isBot: false, connected: true },
        { seat: 1, name: 'Ah Beng', characterId: 'P2', isBot: false, connected: true },
      ],
    }));
    const cook = screen.getByRole('button', { name: /Cook/ });
    expect(cook).toBeDisabled();
    expect(within(cook).getByText('Ah Beng')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Maid/ }));
    expect(socket.last('lobby:pickChar')).toEqual({ characterId: 'P3' });
  });

  test('the host can start only once enough players are seated', async () => {
    const { socket } = renderGame(<Lobby />, { seat: 0 });
    socket.push('room:state', lobbyState());
    expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled();
    expect(screen.getByText('Need at least 3 players')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Fill with bots' }));
    expect(socket.last('lobby:fillBots')).toEqual({});

    socket.push('room:state', lobbyState({
      seats: [0, 1, 2].map((seat) => ({ seat, name: seat ? `Bot ${seat}` : 'Host', isBot: seat > 0, connected: true })),
    }));
    await userEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(socket.asked.map((a) => a.event)).toContain('lobby:start');
  });

  test('a guest sees no host controls, only that the host will start', () => {
    const { socket } = renderGame(<Lobby />, { seat: 1 });
    socket.push('room:state', lobbyState({
      seats: [
        { seat: 0, name: 'Host', isBot: false, connected: true },
        { seat: 1, name: 'Me', isBot: false, connected: true },
      ],
    }));
    expect(screen.queryByRole('button', { name: 'Start' })).not.toBeInTheDocument();
    expect(screen.getByText('Waiting for the host to start…')).toBeInTheDocument();
  });
});
