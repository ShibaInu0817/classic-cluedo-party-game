import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { LangToggle } from '../src/components/LangToggle.tsx';
import { renderGame } from './harness.tsx';

test('the TV can switch between the theme languages', async () => {
  const onChange = vi.fn();
  renderGame(<LangToggle onChange={onChange} />, { lang: 'en' });
  expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true');
  await userEvent.click(screen.getByRole('button', { name: 'Français' }));
  expect(onChange).toHaveBeenCalledWith('fr');
});
