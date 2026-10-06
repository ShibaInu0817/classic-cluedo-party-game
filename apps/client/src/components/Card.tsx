import { useTheme } from '../theme/ThemeProvider.tsx';

/** A deck card face: art plus name. */
export function Card({ id, small }: { id: string; small?: boolean }) {
  const { cardName, cardArt } = useTheme();
  const art = cardArt(id);
  return (
    <span className={`card-face ${small ? 'small' : ''}`}>
      {art && <img src={art} alt="" aria-hidden="true" />}
      <span className="card-name">{cardName(id)}</span>
    </span>
  );
}
