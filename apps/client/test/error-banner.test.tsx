import { act, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { ErrorBanner } from '../src/components/ErrorBanner.tsx';
import { renderGame } from './harness.tsx';

test('errors that are message keys are shown translated; plain server errors are shown as they are', () => {
  const a = renderGame(<ErrorBanner />, { lang: 'zh' });
  act(() => a.store.setState({ error: 'room.ended' }));
  expect(screen.getByRole('alert')).toHaveTextContent('房间已结束');
  a.unmount();
  const b = renderGame(<ErrorBanner />);
  act(() => b.store.setState({ error: 'room is full' }));
  expect(screen.getByRole('alert')).toHaveTextContent('room is full');
});
