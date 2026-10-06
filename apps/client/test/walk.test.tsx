import { act, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { Play } from '../src/screens/Play.tsx';
import { playState, renderGame } from './harness.tsx';

afterEach(() => vi.useRealTimers());

describe('token movement', () => {
  test('a token walks its path one square at a time (170 ms a step) instead of jumping', () => {
    vi.useFakeTimers();
    const { socket } = renderGame(<Play />, { seat: 1 });
    socket.push('room:state', playState());
    socket.push('game:events', [{ type: 'moved', seat: 0, character: 'P1', path: ['3,0', '3,1', 'R:H1'] }]);
    socket.push('room:state', playState({ pos: { P1: 'R:H1', P2: '6,3', P3: '0,3' } }));
    const token = () => screen.getByTitle('Baron').getAttribute('data-node');
    expect(token()).toBe('3,0');
    act(() => vi.advanceTimersByTime(170));
    expect(token()).toBe('3,1');
    act(() => vi.advanceTimersByTime(170));
    expect(token()).toBe('R:H1');
  });

  test('without a fresh move, tokens simply sit where the state says', () => {
    const { socket } = renderGame(<Play />, { seat: 1 });
    socket.push('room:state', playState());
    expect(screen.getByTitle('Cook').getAttribute('data-node')).toBe('6,3');
  });
});
