import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import { Lobby } from '../src/screens/Lobby.tsx';
import { Play } from '../src/screens/Play.tsx';
import { lobbyState, playState, renderGame } from './harness.tsx';

const twoSeats = () => lobbyState({
  seats: [
    { seat: 0, name: 'Host', isBot: false, connected: true },
    { seat: 1, name: 'Ah Beng', isBot: false, connected: true },
  ],
});

describe('lobby controls', () => {
  test('anyone can leave the lobby', async () => {
    const { socket } = renderGame(<Lobby />, { seat: 1 });
    socket.push('room:state', twoSeats());
    await userEvent.click(screen.getByRole('button', { name: 'Leave room' }));
    expect(socket.last('room:leave')).toEqual({});
  });

  test('the host can remove another player; guests cannot', async () => {
    const host = renderGame(<Lobby />, { seat: 0 });
    host.socket.push('room:state', twoSeats());
    expect(screen.queryByRole('button', { name: 'Remove Host' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Remove Ah Beng' }));
    expect(host.socket.last('lobby:kick')).toEqual({ seat: 1 });
    host.unmount();
    const guest = renderGame(<Lobby />, { seat: 1 });
    guest.socket.push('room:state', twoSeats());
    expect(screen.queryByRole('button', { name: /^Remove/ })).not.toBeInTheDocument();
  });
});

describe('pausing', () => {
  test('the host can pause and resume', async () => {
    const { socket } = renderGame(<Play />, { seat: 0 });
    socket.push('room:state', playState({}, { paused: false }));
    await userEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(socket.last('game:pause')).toEqual({ paused: true });
    socket.push('room:state', playState({}, { paused: true }));
    await userEvent.click(screen.getByRole('button', { name: 'Resume' }));
    expect(socket.last('game:pause')).toEqual({ paused: false });
  });

  test('while paused everyone sees it and nobody is offered actions', () => {
    const { socket } = renderGame(<Play />, { seat: 1 });
    socket.push('room:state', playState({ turn: 1 }, { paused: true }));
    expect(screen.getByText('Paused')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Roll' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Resume' })).not.toBeInTheDocument();
  });
});
