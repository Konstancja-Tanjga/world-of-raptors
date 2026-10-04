import { ButtonLink } from '@/components/ButtonLink';
import { StateBlock } from '@/components/ds';
import { Sylwetka } from '@/components/Sylwetka';
import { ZNAK } from '@/lib/rysunki';

/** A page that does not exist: an empty sky, one bird leaving it, and the way back. */
export default function NotFound() {
  return (
    <div className="zgubiony scena" data-scena>
      <Sylwetka id={ZNAK} klasa="zgubiony__ptak" />
      <div className="zgubiony__tresc">
        {/* The state's title is a paragraph by Big Hat's contract; the page still needs its heading. */}
        <h1 className="visually-hidden">Błąd 404</h1>
        <StateBlock
          state="empty"
          title="Nie ma takiej strony"
          description="Ten moduł, lekcja albo gatunek nie istnieje. Ptak, którego szukasz, odleciał gdzie indziej."
          action={
            <ButtonLink href="/" size="sm">
              Wróć na start
            </ButtonLink>
          }
          secondaryAction={
            <ButtonLink href="/gatunki" size="sm" variant="secondary">
              Otwórz atlas
            </ButtonLink>
          }
          scope="page"
        />
      </div>
    </div>
  );
}
