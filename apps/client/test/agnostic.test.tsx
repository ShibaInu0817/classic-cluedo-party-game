import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import { Lobby } from '../src/screens/Lobby.tsx';
import { Home } from '../src/screens/Home.tsx';
import { Play } from '../src/screens/Play.tsx';
import { tinyBundle } from './fixtures.ts';
import { lobbyState, playState, renderGame } from './harness.tsx';

const THEMES = [{ id: 'tiny-manor', title: { en: 'Tiny Manor' }, languages: ['en'], players: { min: 3, max: 3 } }];

describe('nothing theme- or language-specific is baked into the app', () => {
  test('bot names are shown in the viewer language', () => {
    const { socket } = renderGame(<Lobby />, { seat: 0, lang: 'zh' });
    socket.push('room:state', lobbyState({
      seats: [{ seat: 0, name: 'Host', isBot: false, connected: true }, { seat: 1, name: 'Bot 1', isBot: true, connected: true }],
    }));
    expect(screen.getByText('机器人 1')).toBeInTheDocument();
  });

  test('a theme can give its own default room name', async () => {
    const b = tinyBundle();
    b.i18n.en!['create.defaultName'] = 'Murder at the Manor';
    renderGame(<Home themes={THEMES} />, { bundle: b });
    await userEvent.type(screen.getByLabelText('Your name'), 'X');
    await userEvent.click(screen.getByRole('button', { name: 'Create room' }));
    expect(screen.getByLabelText('Room name')).toHaveValue('Murder at the Manor');
  });

  test('the accuse warning follows the theme rule for how many accusations you get', async () => {
    const b = tinyBundle();
    b.manifest.rules = { ...b.manifest.rules, accusationsPerPlayer: 2 };
    const { socket } = renderGame(<Play />, { seat: 0, bundle: b });
    socket.push('room:state', playState());
    await userEvent.click(screen.getByRole('button', { name: 'Accuse' }));
    const d = screen.getByRole('dialog');
    for (const n of ['Maid', 'Cellar', 'Poison']) await userEvent.click(within(d).getByRole('radio', { name: n }));
    await userEvent.click(within(d).getByRole('button', { name: 'Accuse' }));
    expect(d).toHaveTextContent('You have 2 accusations left');
  });

  test('which dice faces are painted in the accent colour is up to the theme', () => {
    const b = tinyBundle();
    (b.manifest.ui as any).dice = { accentFaces: [1] };
    const { socket, container } = renderGame(<Play />, { seat: 1, bundle: b });
    socket.push('room:state', playState());
    socket.push('game:events', [{ type: 'rolled', seat: 0, value: 2 }]);
    expect(container.querySelectorAll('.cube .face.accent')).toHaveLength(1);
  });
});
