import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import { Intro } from '../src/screens/Intro.tsx';
import { TvIntro } from '../src/screens/tv/TvIntro.tsx';
import { playState, renderGame } from './harness.tsx';

const intro = (ready = [false, false, true]) => playState({}, { phase: 'intro', ready, deadline: undefined });

async function toCards() {
  await userEvent.click(screen.getByRole('button', { name: 'Skip story' }));
  await userEvent.click(screen.getByRole('button', { name: 'Next' })); // setup → my character
}

describe('the intro on a phone', () => {
  test('tells the story panel by panel, from the theme', async () => {
    const { socket } = renderGame(<Intro />, { seat: 1 });
    socket.push('room:state', intro());
    expect(screen.getByText('Someone is dead.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText(/One card from each pile goes into the envelope/)).toBeInTheDocument();
  });

  test('then shows my character and my cards, and I say when I am ready', async () => {
    const { socket } = renderGame(<Intro />, { seat: 1 });
    socket.push('room:state', intro());
    socket.push('game:private', { hand: ['H2', 'W1'], shown: [] });
    await toCards();
    expect(screen.getByRole('heading', { name: 'You are Cook' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Library')).toBeInTheDocument();
    expect(screen.getByText('Candlestick')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ready' }));
    expect(socket.last('intro:ready')).toEqual({});
  });

  test('once I am ready I see how many others still are checking', () => {
    const { socket } = renderGame(<Intro />, { seat: 1 });
    socket.push('room:state', intro([false, true, true]));
    expect(screen.getByText('Waiting for others… 2/3 ready')).toBeInTheDocument();
  });

  test('only the host can skip the intro for everyone', async () => {
    const host = renderGame(<Intro />, { seat: 0 });
    host.socket.push('room:state', intro());
    await userEvent.click(screen.getByRole('button', { name: 'Skip for everyone' }));
    expect(host.socket.last('intro:skip')).toEqual({});
    host.unmount();
    const guest = renderGame(<Intro />, { seat: 1 });
    guest.socket.push('room:state', intro());
    expect(screen.queryByRole('button', { name: 'Skip for everyone' })).not.toBeInTheDocument();
  });
});

describe('the intro on the TV', () => {
  test('shows the story and who is still checking their cards', () => {
    const { socket } = renderGame(<TvIntro />);
    socket.push('room:state', intro([true, false, true]));
    expect(screen.getByText('Someone is dead.')).toBeInTheDocument();
    expect(screen.getByText('Host · Ready')).toBeInTheDocument();
    expect(screen.getByText('Ah Beng · Checking')).toBeInTheDocument();
  });
});
