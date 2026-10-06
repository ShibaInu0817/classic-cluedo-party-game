import { screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { TvPlay } from '../src/screens/tv/TvPlay.tsx';
import { playState, renderGame } from './harness.tsx';

describe('TV during play', () => {
  test('shows the board, whose turn it is and the public log, and offers no actions', () => {
    const { socket } = renderGame(<TvPlay />);
    socket.push('room:state', playState({ turn: 1 }));
    socket.push('game:events', [{ type: 'cardShown', from: 2, to: 0 }]);
    expect(screen.getByTestId('board')).toBeInTheDocument();
    expect(screen.getByText('Ah Beng is playing…')).toBeInTheDocument();
    expect(screen.getByText('Maid (bot) showed a card to Host')).toBeInTheDocument();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});
