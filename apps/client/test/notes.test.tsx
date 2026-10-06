import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import { Notes } from '../src/components/Notes.tsx';
import { playState, renderGame } from './harness.tsx';

const esc = (x: string) => x.replace(/[()]/g, '\\$&');
const cell = (card: string, seat: string) => screen.getByRole('button', { name: new RegExp(`^${card} · ${esc(seat)}:`) });

describe('detective notes', () => {
  function setup() {
    const r = renderGame(<Notes />, { seat: 0 });
    r.socket.push('room:state', {
      ...playState(),
      suggestions: [{ by: 2, trio: { sus: 'P1', room: 'H3', obj: 'W2' }, passed: [0, 1] }],
    });
    r.socket.push('game:private', { hand: ['H2', 'W1'], shown: [{ card: 'P3', from: 1 }] });
    return r;
  }

  test('my own cards are ticked for me and crossed for everyone else', () => {
    setup();
    expect(cell('Library', 'Host')).toHaveTextContent('✓');
    expect(cell('Library', 'Ah Beng')).toHaveTextContent('✕');
  });

  test('a card shown to me is ticked for the player who showed it', () => {
    setup();
    expect(cell('Maid', 'Ah Beng')).toHaveTextContent('✓');
    expect(cell('Maid', 'Maid (bot)')).toHaveTextContent('✕');
  });

  test('a player who passed on a suggestion holds none of its three cards', () => {
    setup();
    for (const card of ['Baron', 'Cellar', 'Rope']) expect(cell(card, 'Ah Beng')).toHaveTextContent('✕');
    expect(cell('Baron', 'Maid (bot)')).toHaveTextContent('');
  });

  test('any mark can be changed by hand', async () => {
    setup();
    await userEvent.click(cell('Baron', 'Maid (bot)'));
    expect(cell('Baron', 'Maid (bot)')).toHaveTextContent('✕');
    await userEvent.click(cell('Baron', 'Maid (bot)'));
    expect(cell('Baron', 'Maid (bot)')).toHaveTextContent('✓');
  });

  test('the suggestion history says who asked what and who passed', () => {
    setup();
    const history = screen.getByRole('list', { name: 'Suggestions' });
    expect(within(history).getByText(/Maid \(bot\).*Baron.*Cellar.*Rope/)).toBeInTheDocument();
    expect(within(history).getByText(/passed: Host, Ah Beng/)).toBeInTheDocument();
  });
});
