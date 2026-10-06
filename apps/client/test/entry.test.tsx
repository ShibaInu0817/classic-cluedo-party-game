import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { LangPick } from '../src/screens/LangPick.tsx';
import { Home } from '../src/screens/Home.tsx';
import { TvLobby } from '../src/screens/tv/TvLobby.tsx';
import { lobbyState, renderGame } from './harness.tsx';

const THEMES = [{ id: 'tiny-manor', title: { en: 'Tiny Manor', fr: 'Petit Manoir' }, languages: ['en', 'fr'], players: { min: 3, max: 3 } }];

describe('first launch and home', () => {
  test('the language picker offers every language the theme ships', async () => {
    const onPick = vi.fn();
    renderGame(<LangPick onPick={onPick} />);
    await userEvent.click(screen.getByRole('button', { name: 'Français' }));
    expect(onPick).toHaveBeenCalledWith('fr');
    expect(screen.getByRole('button', { name: 'English' })).toBeInTheDocument();
  });

  test('Create room sends the room settings, chosen board and player name', async () => {
    const { socket } = renderGame(<Home themes={THEMES} />);
    await userEvent.type(screen.getByLabelText('Your name'), 'Mei');
    await userEvent.click(screen.getByRole('button', { name: 'Create room' }));
    await userEvent.clear(screen.getByLabelText('Room name'));
    await userEvent.type(screen.getByLabelText('Room name'), 'Chen family');
    await userEvent.click(screen.getByRole('radio', { name: 'Phones only' }));
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(socket.last('room:create')).toEqual({
      name: 'Chen family', maxPlayers: 3, mode: 'phones', bots: true, themeId: 'tiny-manor', playerName: 'Mei',
    });
  });

  test('Join room sends the 4-digit code and player name', async () => {
    const { socket } = renderGame(<Home themes={THEMES} />);
    await userEvent.type(screen.getByLabelText('Your name'), 'Ah Beng');
    await userEvent.click(screen.getByRole('button', { name: 'Join room' }));
    await userEvent.type(screen.getByLabelText('Room code'), '4821');
    await userEvent.click(screen.getByRole('button', { name: 'Join' }));
    expect(socket.last('room:join')).toEqual({ code: '4821', playerName: 'Ah Beng' });
  });

  test('a server refusal is shown to the player', async () => {
    const { socket } = renderGame(<Home themes={THEMES} />);
    socket.replies['room:join'] = { ok: false, error: 'room not found' };
    await userEvent.type(screen.getByLabelText('Your name'), 'X');
    await userEvent.click(screen.getByRole('button', { name: 'Join room' }));
    await userEvent.type(screen.getByLabelText('Room code'), '0000');
    await userEvent.click(screen.getByRole('button', { name: 'Join' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('room not found');
  });
});

describe('TV lobby', () => {
  test('shows the code and a scannable QR code for the join link', async () => {
    const { socket } = renderGame(<TvLobby />);
    socket.push('room:state', lobbyState());
    expect(screen.getByText('4821')).toBeInTheDocument();
    const qr = await screen.findByRole('img', { name: /Scan to join/ });
    expect(qr.getAttribute('src')).toMatch(/^data:image\/png;base64,/);
    expect(qr).toHaveAttribute('data-url', `${location.origin}/?code=4821`);
  });
});
