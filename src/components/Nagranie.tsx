import { useId } from 'react';
import type { Nagranie as DaneNagrania } from '@/lib/types';

/**
 * A recording with the credit its licence requires. `opis` says what is
 * heard; without one the player is named by `etykieta`. In the starting test
 * the sources stay hidden until the answer (`odkryte`), because the Commons
 * and xeno-canto titles name the species; a lesson shows them at once.
 */
export function Nagranie({
  nagranie: n,
  opis,
  etykieta,
  odkryte = true,
}: {
  nagranie: DaneNagrania;
  opis?: string;
  etykieta?: string;
  odkryte?: boolean;
}) {
  const xenoCanto = n.xc ? `https://xeno-canto.org/${n.xc}` : undefined;
  const idOpisu = useId();
  return (
    <figure className="nagranie">
      {opis && (
        <p className="nagranie__opis" id={idOpisu}>
          {opis}
        </p>
      )}
      <audio
        controls
        preload="none"
        src={n.src}
        aria-labelledby={opis ? idOpisu : undefined}
        aria-label={opis ? undefined : etykieta}
      >
        Ta przeglądarka nie odtwarza nagrań.
      </audio>
      <figcaption className="nagranie__podpis">
        Nagranie: {n.autor},{' '}
        <a href={n.licencjaUrl} target="_blank" rel="noreferrer">
          {n.licencja}
        </a>
        {odkryte && (
          <>
            {xenoCanto && (
              <>
                ,{' '}
                <a href={xenoCanto} target="_blank" rel="noreferrer">
                  xeno-canto XC{n.xc}
                </a>
              </>
            )}
            {n.strona !== xenoCanto && (
              <>
                ,{' '}
                <a href={n.strona} target="_blank" rel="noreferrer">
                  Wikimedia Commons
                </a>
              </>
            )}
          </>
        )}
      </figcaption>
    </figure>
  );
}
