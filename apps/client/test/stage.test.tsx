import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import { TvLobby } from '../src/screens/tv/TvLobby.tsx';
import { TvPlay } from '../src/screens/tv/TvPlay.tsx';
import { Settings } from '../src/screens/Settings.tsx';
import { local } from '../src/storage.ts';
import { lobbyState, playState, renderGame } from './harness.tsx';
import { tinyBundle } from './fixtures.ts';

describe('one stage on the TV', () => {
  test('the lobby already sits on the board, without pieces', () => {
    const { socket } = renderGame(<TvLobby />);
    socket.push('room:state', lobbyState());
    expect(screen.getByTestId('board-backdrop')).toBeInTheDocument();
    expect(screen.getByTestId('board-backdrop').querySelector('.token')).toBeNull();
  });

  test('a theme with ambient art hangs it along the top; a theme without draws nothing extra', () => {
    const b = tinyBundle();
    b.manifest.ui.ambient = { hanging: { art: 'assets/lantern.svg', count: 4 }, sparkleRooms: ['H1'] };
    const { socket, container } = renderGame(<TvPlay />, { bundle: b });
    socket.push('room:state', playState());
    expect(container.querySelectorAll('.ambient img')).toHaveLength(4);
    expect(container.querySelectorAll('.spark').length).toBeGreaterThan(0);

    const plain = renderGame(<TvPlay />);
    plain.socket.push('room:state', playState());
    expect(plain.container.querySelector('.ambient')).toBeNull();
  });
});

describe('animation speed', () => {
  test('Settings can switch to fast animations, remembered on this device', async () => {
    renderGame(<Settings onLang={() => {}} onBack={() => {}} />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Fast animations' }));
    expect(local.get('motion')).toBe('fast');
    expect(document.documentElement.style.getPropertyValue('--speed')).toBe('0.5');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Fast animations' }));
    expect(local.get('motion')).toBe('normal');
  });
});
