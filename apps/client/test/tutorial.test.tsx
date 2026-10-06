import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import { Play } from '../src/screens/Play.tsx';
import { tinyBundle } from './fixtures.ts';
import { playState, renderGame } from './harness.tsx';

function withTutorial() {
  const b = tinyBundle();
  b.manifest.ui.tutorial = [{ target: 'board', textKey: 'tut.board' }, { target: 'roll', textKey: 'tut.roll' }];
  b.i18n.en!['tut.board'] = 'This is the board.';
  b.i18n.en!['tut.roll'] = 'Tap here to roll.';
  return b;
}

describe('first-game tutorial', () => {
  test('walks through the theme coach marks with Next', async () => {
    const { socket } = renderGame(<Play />, { seat: 0, bundle: withTutorial() });
    socket.push('room:state', playState());
    const tip = screen.getByRole('dialog', { name: 'Tutorial' });
    expect(tip).toHaveTextContent('This is the board.');
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(tip).toHaveTextContent('Tap here to roll.');
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.queryByRole('dialog', { name: 'Tutorial' })).not.toBeInTheDocument();
  });

  test('once skipped it never shows again on this device', async () => {
    const first = renderGame(<Play />, { seat: 0, bundle: withTutorial() });
    first.socket.push('room:state', playState());
    await userEvent.click(screen.getByRole('button', { name: 'Skip' }));
    first.unmount();
    const again = renderGame(<Play />, { seat: 0, bundle: withTutorial() });
    again.socket.push('room:state', playState());
    expect(screen.queryByRole('dialog', { name: 'Tutorial' })).not.toBeInTheDocument();
  });

  test('a theme without a tutorial shows none', () => {
    const { socket } = renderGame(<Play />, { seat: 0 });
    socket.push('room:state', playState());
    expect(screen.queryByRole('dialog', { name: 'Tutorial' })).not.toBeInTheDocument();
  });
});
