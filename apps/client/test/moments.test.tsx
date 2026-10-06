import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import { Play } from '../src/screens/Play.tsx';
import { TvPlay } from '../src/screens/tv/TvPlay.tsx';
import { playState, renderGame } from './harness.tsx';

describe('the dice', () => {
  test('every roll shows the die landing on its value', () => {
    const { socket } = renderGame(<Play />, { seat: 1 });
    socket.push('room:state', playState());
    socket.push('game:events', [{ type: 'rolled', seat: 0, value: 4 }]);
    expect(screen.getByRole('img', { name: 'Host rolled 4' })).toBeInTheDocument();
  });
});

describe('the suggestion moment', () => {
  const events = [
    { type: 'suggested', seat: 0, trio: { sus: 'P3', room: 'H1', obj: 'W2' } },
    { type: 'asked', seat: 1, has: false },
    { type: 'asked', seat: 2, has: true },
  ];

  test('stops every phone: the three cards, then each player asked in turn', () => {
    const { socket } = renderGame(<Play />, { seat: 1 });
    socket.push('room:state', playState());
    socket.push('game:events', events);
    const m = screen.getByRole('region', { name: 'Host suggests' });
    for (const n of ['Maid', 'Hall', 'Rope']) expect(within(m).getByText(n)).toBeInTheDocument();
    expect(within(m).getByText('Ah Beng: pass')).toBeInTheDocument();
    expect(within(m).getByText('Maid (bot): has one')).toBeInTheDocument();
  });

  test('ends by saying who showed a card to whom, also on the TV', () => {
    const { socket } = renderGame(<TvPlay />);
    socket.push('room:state', playState());
    socket.push('game:events', [...events, { type: 'cardShown', from: 2, to: 0 }]);
    const m = screen.getByRole('region', { name: 'Host suggests' });
    expect(within(m).getByText('Maid (bot) showed a card to Host')).toBeInTheDocument();
  });
});

describe('board details', () => {
  test('my token wears a YOU pin', () => {
    const { socket } = renderGame(<Play />, { seat: 1 });
    socket.push('room:state', playState());
    expect(within(screen.getByTestId('board')).getByText('YOU')).toBeInTheDocument();
  });

  test('from the suggestion sheet I can check my notes and come back', async () => {
    const { socket } = renderGame(<Play />, { seat: 0 });
    socket.push('room:state', playState({ stage: 'suggest', pos: { P1: 'R:H1', P2: '6,3', P3: '0,3' } }));
    await userEvent.click(screen.getByRole('button', { name: 'Make a suggestion' }));
    await userEvent.click(screen.getByRole('button', { name: 'Check my notes' }));
    expect(screen.queryByRole('dialog', { name: 'Make a suggestion' })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Notes' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(screen.getByRole('button', { name: '← Back to suggestion' }));
    expect(screen.getByRole('dialog', { name: 'Make a suggestion' })).toBeInTheDocument();
  });
});
