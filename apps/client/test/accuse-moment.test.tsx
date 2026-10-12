import { act, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { AccuseMoment } from '../src/components/AccuseMoment.tsx';
import { Play } from '../src/screens/Play.tsx';
import { End } from '../src/screens/End.tsx';
import { TvPlay } from '../src/screens/tv/TvPlay.tsx';
import { playState, renderGame } from './harness.tsx';

const ANSWER = { sus: 'P3', room: 'H2', obj: 'W3' };
const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms));

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('the accusation moment', () => {
  test('a wrong accusation stops every phone: the accuser, then a WRONG stamp, never the guess', () => {
    const { socket } = renderGame(<><Play /><AccuseMoment /></>, { seat: 1 });
    socket.push('room:state', playState());
    socket.push('game:events', [{ type: 'accused', seat: 0, correct: false }, { type: 'turnStarted', seat: 1, round: 1 }]);
    const m = screen.getByRole('region', { name: 'Host accuses!' });
    expect(within(m).queryByText('WRONG')).not.toBeInTheDocument();
    wait(2200);
    expect(within(m).getByText('WRONG')).toBeInTheDocument();
    expect(within(m).getByText('The guess stays secret. The game goes on.')).toBeInTheDocument();
    wait(3000);
    expect(screen.queryByRole('region', { name: 'Host accuses!' })).not.toBeInTheDocument();
  });

  test('plays on the TV too, and says when the accuser becomes a ghost', () => {
    const { socket } = renderGame(<><TvPlay /><AccuseMoment /></>);
    socket.push('room:state', playState({ out: [true, false, false] }));
    socket.push('game:events', [{ type: 'accused', seat: 0, correct: false }, { type: 'becameGhost', seat: 0 }]);
    wait(2200);
    const m = screen.getByRole('region', { name: 'Host accuses!' });
    expect(within(m).getByText('The guess stays secret. Host is out, but still shows cards.')).toBeInTheDocument();
  });

  test('the wrong accuser reads the envelope only after the moment', () => {
    const { socket } = renderGame(<><Play /><AccuseMoment /></>, { seat: 0 });
    socket.push('room:state', playState({ out: [true, false, false] }));
    socket.push('game:private', { hand: [], envelope: ANSWER });
    socket.push('game:events', [{ type: 'accused', seat: 0, correct: false }, { type: 'becameGhost', seat: 0 }]);
    expect(screen.queryByText('Wrong! The answer was:')).not.toBeInTheDocument();
    wait(5200);
    expect(screen.getByText('Wrong! The answer was:')).toBeInTheDocument();
  });

  test('a winning accusation stamps CORRECT before the reveal starts', () => {
    const { socket } = renderGame(<><End /><AccuseMoment /></>, { seat: 1 });
    socket.push('room:state', playState({ stage: 'over', winner: 0, answer: ANSWER }, { phase: 'end', votes: [null, null, null] }));
    socket.push('game:events', [{ type: 'accused', seat: 0, correct: true }, { type: 'gameWon', seat: 0, envelope: ANSWER }]);
    expect(screen.queryByRole('region', { name: 'Reveal' })).not.toBeInTheDocument();
    wait(2200);
    expect(within(screen.getByRole('region', { name: 'Host accuses!' })).getByText('CORRECT')).toBeInTheDocument();
    wait(2200);
    expect(screen.queryByRole('region', { name: 'Host accuses!' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Reveal' })).toBeInTheDocument();
  });
});
