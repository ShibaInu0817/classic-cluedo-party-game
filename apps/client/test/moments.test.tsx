import { act, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
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
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());
  const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms));
  const row = (m: HTMLElement, name: string) => within(m).getByText(name).closest('li')!;

  test('on a phone: the three cards first, then each player answers in turn', () => {
    const { socket } = renderGame(<Play />, { seat: 1 });
    socket.push('room:state', playState({ stage: 'disprove' }));
    socket.push('game:events', events);
    const m = screen.getByRole('region', { name: 'Host suggests' });
    for (const n of ['Maid', 'Hall', 'Rope']) expect(within(m).getByText(n)).toBeInTheDocument();
    expect(row(m, 'You (Ah Beng)')).toHaveTextContent('waiting');
    wait(1600);
    expect(row(m, 'You (Ah Beng)')).toHaveTextContent('your turn to answer');
    wait(1000);
    expect(row(m, 'You (Ah Beng)')).toHaveTextContent('you pass');
    expect(row(m, 'Maid (bot)')).toHaveTextContent('thinking…');
    wait(1000);
    expect(row(m, 'Maid (bot)')).toHaveTextContent('has one');
  });

  test('a player who only watches learns who showed whom, never which card', () => {
    const { socket } = renderGame(<Play />, { seat: 1 });
    socket.push('room:state', playState());
    socket.push('game:events', [...events, { type: 'cardShown', from: 2, to: 0 }]);
    wait(1600); wait(1000); wait(1000);
    const m = screen.getByRole('region', { name: 'Host suggests' });
    expect(within(m).getByText('Maid (bot) showed a card to Host')).toBeInTheDocument();
    expect(within(m).getByText("You can't see which one.")).toBeInTheDocument();
  });

  test('the player who showed is reminded which card they gave', async () => {
    const { socket } = renderGame(<Play />, { seat: 2 });
    socket.push('room:state', playState({ stage: 'disprove' }));
    socket.push('game:showRequest', { by: 0, cards: ['W2'] });
    socket.push('game:events', events);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Rope' })); });
    socket.push('game:events', [{ type: 'cardShown', from: 2, to: 0 }]);
    wait(1600); wait(1000); wait(1000);
    expect(screen.getByText('You showed Rope to Host')).toBeInTheDocument();
    expect(screen.getByText('Only Host sees which card.')).toBeInTheDocument();
  });

  test('on the TV: the scene over the board, answers on the player rail, then who showed whom', () => {
    const { socket } = renderGame(<TvPlay />);
    socket.push('room:state', playState());
    socket.push('game:events', [...events, { type: 'cardShown', from: 2, to: 0 }]);
    const scene = screen.getByRole('region', { name: 'Host suggests' });
    for (const n of ['Maid', 'Hall', 'Rope']) expect(within(scene).getByText(n)).toBeInTheDocument();
    const rail = screen.getByRole('complementary', { name: 'Players' });
    wait(1600);
    expect(within(scene).getByText('Asking Ah Beng…')).toBeInTheDocument();
    wait(1000);
    expect(row(rail, 'Ah Beng')).toHaveTextContent('pass');
    wait(1000);
    expect(row(rail, 'Maid (bot)')).toHaveTextContent('has one');
    expect(within(scene).getByText('Maid (bot) showed a card to Host')).toBeInTheDocument();
  });
});

describe('the turn banner', () => {
  test('the TV announces each new turn with the player\'s face', () => {
    const { socket } = renderGame(<TvPlay />);
    socket.push('room:state', playState({ turn: 1 }));
    socket.push('game:events', [{ type: 'turnStarted', seat: 1, round: 1 }]);
    expect(screen.getByRole('status')).toHaveTextContent("Ah Beng's turn!");
  });

  test('a phone gets a toast for other players\' turns, not its own', () => {
    const { socket } = renderGame(<Play />, { seat: 1 });
    socket.push('room:state', playState({ turn: 2 }));
    socket.push('game:events', [{ type: 'turnStarted', seat: 2, round: 1 }]);
    expect(screen.getByText("Maid (bot)'s turn!")).toBeInTheDocument();
    socket.push('game:events', [{ type: 'turnStarted', seat: 1, round: 1 }]);
    expect(screen.queryByText("Ah Beng's turn!")).not.toBeInTheDocument();
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
