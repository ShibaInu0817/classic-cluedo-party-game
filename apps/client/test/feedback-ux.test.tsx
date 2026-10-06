import { act, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { Play } from '../src/screens/Play.tsx';
import { Lobby } from '../src/screens/Lobby.tsx';
import { LangPick } from '../src/screens/LangPick.tsx';
import { Intro } from '../src/screens/Intro.tsx';
import { tinyBundle } from './fixtures.ts';
import { lobbyState, playState, renderGame } from './harness.tsx';

afterEach(() => { vi.useRealTimers(); history.replaceState(null, '', '/'); });

const suggestion = [
  { type: 'suggested', seat: 0, trio: { sus: 'P2', room: 'H1', obj: 'W1' } },
  { type: 'asked', seat: 1, has: true },
];

describe('my own sheets always win over shared overlays', () => {
  test('when I must show a card, the suggestion overlay steps aside so I can pick', () => {
    const { socket } = renderGame(<Play />, { seat: 1 });
    socket.push('game:private', { hand: ['P2', 'W3'], shown: [] });
    socket.push('room:state', playState({ stage: 'disprove', pending: { by: 0, trio: { sus: 'P2', room: 'H1', obj: 'W1' }, asked: 1 } }));
    socket.push('game:events', suggestion);
    socket.push('game:showRequest', { by: 0, cards: ['P2'] });
    expect(screen.queryByRole('region', { name: 'Host suggests' })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: /Host suggested/ })).toBeInTheDocument();
  });

  test('a card shown to me is not hidden behind the overlay either', () => {
    const { socket } = renderGame(<Play />, { seat: 0 });
    socket.push('room:state', playState({ stage: 'end' }));
    socket.push('game:events', [...suggestion, { type: 'cardShown', from: 1, to: 0 }]);
    socket.push('game:shown', { card: 'P2', from: 1 });
    expect(screen.queryByRole('region', { name: 'Host suggests' })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: /showed you/ })).toBeInTheDocument();
  });

  test('a new roll replaces a lingering suggestion overlay instead of stacking on it', () => {
    const { socket } = renderGame(<Play />, { seat: 1 });
    socket.push('room:state', playState());
    socket.push('game:events', [...suggestion, { type: 'cardShown', from: 1, to: 0 }, { type: 'rolled', seat: 2, value: 3 }]);
    expect(screen.queryByRole('region', { name: 'Host suggests' })).not.toBeInTheDocument();
  });
});

describe('names people can follow', () => {
  test('a bot playing a character is named by that character', () => {
    const { socket } = renderGame(<Play />, { seat: 1 });
    socket.push('room:state', playState({ turn: 2 }));
    expect(screen.getByText('Maid (bot) is playing…')).toBeInTheDocument();
  });

  test('tokens can carry a language-specific label from the theme, and a legend says whose is whose', () => {
    const b = tinyBundle();
    b.i18n.fr!['glyph.P1'] = 'Ba';
    const { socket } = renderGame(<Play />, { seat: 1, lang: 'fr', bundle: b });
    socket.push('room:state', playState());
    expect(screen.getByTitle('Baron')).toHaveTextContent('Ba');
    const legend = screen.getByRole('list', { name: 'Who is who' });
    expect(within(legend).getByText('Cuisinier')).toBeInTheDocument();
  });

  test('reachable squares are described by the room they are near, not grid numbers alone', () => {
    const { socket } = renderGame(<Play />, { seat: 0 });
    socket.push('room:state', { ...playState({ stage: 'move', dice: 1 }), reach: ['3,1'] });
    expect(screen.getByRole('button', { name: 'Corridor by Hall (row 2, column 4)' })).toBeInTheDocument();
  });
});

describe('the lobby and the join link', () => {
  test('with bots filling empty seats, the host can start alone and is told bots will join', () => {
    const { socket } = renderGame(<Lobby />, { seat: 0 });
    socket.push('room:state', lobbyState({ bots: true }));
    expect(screen.getByRole('button', { name: 'Start' })).toBeEnabled();
    expect(screen.getByText('Empty seats will be filled with bots when you start.')).toBeInTheDocument();
  });

  test('opening a join link shows which room you are joining', () => {
    history.replaceState(null, '', '/?code=4821');
    renderGame(<LangPick onPick={() => {}} />);
    expect(screen.getByText('Joining room 4821')).toBeInTheDocument();
  });
});

describe('the intro keeps moving', () => {
  test('story panels advance on their own if nobody taps', () => {
    vi.useFakeTimers();
    const b = tinyBundle();
    b.manifest.story.chapters[0]!.panels.push({ art: 'assets/story/intro/1.svg', captionKey: 'title' });
    const { socket } = renderGame(<Intro />, { seat: 1, bundle: b });
    socket.push('room:state', playState({}, { phase: 'intro', ready: [false, false, true] }));
    expect(screen.getByText('Someone is dead.')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(7000));
    expect(screen.getByText('Tiny Manor')).toBeInTheDocument();
  });
});
