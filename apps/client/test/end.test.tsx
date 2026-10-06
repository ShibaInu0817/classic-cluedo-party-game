import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import { End } from '../src/screens/End.tsx';
import { TvEnd } from '../src/screens/tv/TvEnd.tsx';
import { playState, renderGame } from './harness.tsx';

const ANSWER = { sus: 'P3', room: 'H2', obj: 'W3' };
const ended = (game: any = {}, over: any = {}) =>
  playState(
    { stage: 'over', winner: 0, answer: ANSWER, round: 4, stats: { suspCount: [0, 3, 1], showCount: [2, 1, 0], reactCount: [0, 0, 0] }, ...game },
    {
      phase: 'end',
      votes: [null, null, null],
      history: [
        { type: 'turnStarted', seat: 0, round: 1 },
        { type: 'suggested', seat: 0, trio: { sus: 'P2', room: 'H1', obj: 'W1' } },
        { type: 'cardShown', from: 1, to: 0 },
        { type: 'accused', seat: 0, correct: true },
        { type: 'gameWon', seat: 0, envelope: ANSWER },
      ],
      ...over,
    },
  );

describe('the reveal', () => {
  test('opens the envelope and shows the three answer cards, then the verdict', async () => {
    const { socket } = renderGame(<End />, { seat: 1 });
    socket.push('room:state', ended());
    const reveal = screen.getByRole('region', { name: 'Reveal' });
    for (const name of ['Maid', 'Library', 'Poison']) expect(within(reveal).getByText(name)).toBeInTheDocument();
    expect(within(reveal).getByText('Host solved the case!')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.queryByRole('region', { name: 'Reveal' })).not.toBeInTheDocument();
  });
});

describe('the results', () => {
  async function results(game: any = {}, over: any = {}, seat = 1) {
    const r = renderGame(<End />, { seat });
    r.socket.push('room:state', ended(game, over));
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    return r;
  }

  test('say what really happened, and replay the case as a timeline', async () => {
    await results();
    expect(screen.getByText('Maid did it in the Library with the Poison.')).toBeInTheDocument();
    const timeline = screen.getByRole('list', { name: 'Case timeline' });
    expect(within(timeline).getByText('Host suggests Cook, Hall, Candlestick')).toBeInTheDocument();
    expect(within(timeline).getByText('Ah Beng showed a card to Host')).toBeInTheDocument();
  });

  test('hand out the theme awards that someone earned', async () => {
    await results();
    const awards = screen.getByRole('list', { name: 'Awards' });
    expect(within(awards).getByText('Most suspected')).toBeInTheDocument();
    expect(within(awards).getByText('Ah Beng')).toBeInTheDocument();
  });

  test('let me vote for a rematch and show how many want one', async () => {
    const { socket } = await results();
    await userEvent.click(screen.getByRole('button', { name: 'Play again' }));
    expect(socket.last('end:vote')).toEqual({ rematch: true });
    socket.push('room:state', ended({}, { votes: [true, true, null] }));
    expect(screen.getByText('Rematch: 2/2')).toBeInTheDocument(); // bots do not vote
  });

  test('show a few numbers about the game', async () => {
    await results();
    expect(screen.getByText('4 rounds · 1 suggestions')).toBeInTheDocument();
  });
});

describe('the TV at the end', () => {
  test('shows the winner, the answer, the awards and the rematch count', async () => {
    const { socket } = renderGame(<TvEnd />);
    socket.push('room:state', ended({}, { votes: [true, null, null] }));
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('Host solved the case!')).toBeInTheDocument();
    expect(screen.getByText('Maid')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Awards' })).toBeInTheDocument();
    expect(screen.getByText('Rematch: 1/2')).toBeInTheDocument();
  });
});
