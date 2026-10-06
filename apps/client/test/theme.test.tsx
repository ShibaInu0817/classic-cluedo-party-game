import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { ThemeProvider, useTheme } from '../src/theme/ThemeProvider.tsx';
import { tinyBundle } from './fixtures.ts';

function Probe({ k, art }: { k: string; art?: string }) {
  const { t, asset } = useTheme();
  return (
    <>
      <span data-testid="text">{t(k)}</span>
      {art && <span data-testid="url">{asset(art)}</span>}
    </>
  );
}

describe('ThemeProvider', () => {
  test('exposes the theme colours and fonts as CSS variables', () => {
    render(<ThemeProvider bundle={tinyBundle()} lang="en"><Probe k="title" /></ThemeProvider>);
    const root = screen.getByTestId('theme-root');
    expect(root.style.getPropertyValue('--color-primary')).toBe('#AA0000');
    expect(root.style.getPropertyValue('--font-display')).toContain('Georgia');
  });

  test('translates keys in the chosen language', () => {
    render(<ThemeProvider bundle={tinyBundle()} lang="fr"><Probe k="room.H2" /></ThemeProvider>);
    expect(screen.getByTestId('text')).toHaveTextContent('Bibliothèque');
  });

  test('falls back to the default language for a missing key', () => {
    render(<ThemeProvider bundle={tinyBundle()} lang="fr"><Probe k="award.mostSuspected" /></ThemeProvider>);
    expect(screen.getByTestId('text')).toHaveTextContent('Most suspected');
  });

  test('resolves asset paths inside the pack, filling in {lang}', () => {
    render(<ThemeProvider bundle={tinyBundle()} lang="fr"><Probe k="title" art="assets/logo.{lang}.svg" /></ThemeProvider>);
    expect(screen.getByTestId('url')).toHaveTextContent('/themes/tiny-manor/assets/logo.fr.svg');
  });
});
