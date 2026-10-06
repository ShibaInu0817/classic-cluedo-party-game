import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import { Play } from '../src/screens/Play.tsx';
import { playState, renderGame } from './harness.tsx';

describe('Play', () => {
  test('Roll is offered only on my turn; otherwise I see who is playing', async () => {
    const mine = renderGame(<Play />, { seat: 0 });
    mine.socket.push('room:state', playState({ turn: 0, stage: 'roll' }));
    await userEvent.click(screen.getByRole('button', { name: 'Roll' }));
    expect(mine.socket.last('game:intent')).toEqual({ type: 'roll' });
    mine.unmount();

    const theirs = renderGame(<Play />, { seat: 1 });
    theirs.socket.push('room:state', playState({ turn: 0, stage: 'roll' }));
    expect(screen.queryByRole('button', { name: 'Roll' })).not.toBeInTheDocument();
    expect(screen.getByText('Host is playing…')).toBeInTheDocument();
  });

  test('after rolling, reachable squares and rooms light up, and tapping one moves there', async () => {
    const { socket } = renderGame(<Play />, { seat: 0 });
    socket.push('room:state', { ...playState({ stage: 'move', dice: 2 }), reach: ['3,1', '3,2', 'R:H1'] });
    expect(screen.getByText('Move up to 2')).toBeInTheDocument();
    const board = screen.getByTestId('board');
    expect(within(board).getAllByRole('button')).toHaveLength(3);
    await userEvent.click(within(board).getByRole('button', { name: 'Hall' }));
    expect(socket.last('game:intent')).toEqual({ type: 'move', node: 'R:H1' });
  });

  test('in a room I pick who and with what; the room is where I stand', async () => {
    const { socket } = renderGame(<Play />, { seat: 0 });
    socket.push('room:state', playState({ stage: 'suggest', pos: { P1: 'R:H1', P2: '6,3', P3: '0,3' } }));
    await userEvent.click(screen.getByRole('button', { name: 'Make a suggestion' }));
    const sheet = screen.getByRole('dialog');
    expect(within(sheet).getByText(/in Hall/)).toBeInTheDocument();
    await userEvent.click(within(sheet).getByRole('radio', { name: 'Cook' }));
    await userEvent.click(within(sheet).getByRole('radio', { name: 'Rope' }));
    await userEvent.click(within(sheet).getByRole('button', { name: 'Confirm' }));
    expect(socket.last('game:intent')).toEqual({ type: 'suggest', sus: 'P2', obj: 'W2' });
  });

  test('when asked to disprove I can only show one of my matching cards', async () => {
    const { socket } = renderGame(<Play />, { seat: 1 });
    socket.push('game:private', { hand: ['P3', 'W3'], shown: [] });
    socket.push('room:state', playState({ stage: 'disprove', pending: { by: 0, trio: { sus: 'P3', room: 'H1', obj: 'W1' }, asked: 1 } }));
    socket.push('game:showRequest', { by: 0, cards: ['P3'] });
    const sheet = screen.getByRole('dialog', { name: /Host suggested/ });
    expect(within(sheet).getAllByRole('button')).toHaveLength(1);
    await userEvent.click(within(sheet).getByRole('button', { name: 'Maid' }));
    expect(socket.last('game:intent')).toEqual({ type: 'showCard', card: 'P3' });
  });

  test('a card shown to me is revealed privately until I dismiss it', async () => {
    const { socket } = renderGame(<Play />, { seat: 0 });
    socket.push('room:state', playState({ stage: 'end' }));
    socket.push('game:shown', { card: 'W2', from: 1 });
    const dialog = screen.getByRole('dialog', { name: /Ah Beng showed you/ });
    expect(within(dialog).getByText('Rope')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Got it' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('accusing needs a second confirmation', async () => {
    const { socket } = renderGame(<Play />, { seat: 0 });
    socket.push('room:state', playState({ stage: 'roll' }));
    await userEvent.click(screen.getByRole('button', { name: 'Accuse' }));
    const sheet = screen.getByRole('dialog');
    await userEvent.click(within(sheet).getByRole('radio', { name: 'Maid' }));
    await userEvent.click(within(sheet).getByRole('radio', { name: 'Cellar' }));
    await userEvent.click(within(sheet).getByRole('radio', { name: 'Poison' }));
    await userEvent.click(within(sheet).getByRole('button', { name: 'Accuse' }));
    expect(socket.last('game:intent')).toBeUndefined();
    expect(within(sheet).getByText(/One chance only/)).toBeInTheDocument();
    await userEvent.click(within(sheet).getByRole('button', { name: 'Confirm' }));
    expect(socket.last('game:intent')).toEqual({ type: 'accuse', sus: 'P3', room: 'H3', obj: 'W3' });
  });

  test('my hand is listed under Cards', async () => {
    const { socket } = renderGame(<Play />, { seat: 0 });
    socket.push('room:state', playState());
    socket.push('game:private', { hand: ['H2', 'W1'], shown: [] });
    await userEvent.click(screen.getByRole('tab', { name: 'Cards' }));
    expect(screen.getByRole('tabpanel')).toHaveTextContent(/Library.*Candlestick/);
  });

  test('the YOUR TURN ribbon appears when my turn starts and goes as soon as the turn moves on', () => {
    const { socket } = renderGame(<Play />, { seat: 1 });
    socket.push('room:state', playState({ turn: 0 }));
    expect(screen.queryByText('YOUR TURN')).not.toBeInTheDocument();
    socket.push('room:state', playState({ turn: 1 }));
    expect(screen.getByText('YOUR TURN')).toBeInTheDocument();
    socket.push('room:state', playState({ turn: 2 }));
    expect(screen.queryByText('YOUR TURN')).not.toBeInTheDocument();
  });
});
