import { useId } from 'react';
import { SONOGRAM } from '@/lib/nagrania';
import type { Nagranie as DaneNagrania } from '@/lib/types';

/**
 * A recording with the credit its licence requires. `opis` says what is
 * heard; without one the player is named by `etykieta`. In the starting test
 * the sources stay hidden until the answer (`odkryte`), because the Commons
 * and xeno-canto titles name the species; a lesson shows them at once.
 * `sonogram` is the picture of its first seconds, with its scales: time
 * across, pitch up (scripts/sonogramy.py draws it).
 */
export function Nagranie({
  nagranie: n,
  opis,
  etykieta,
  odkryte = true,
  sonogram,
}: {
  nagranie: DaneNagrania;
  opis?: string;
  etykieta?: string;
  odkryte?: boolean;
  sonogram?: { src: string; khz: number };
}) {
  const sekundy = Math.min(n.sekundy, SONOGRAM.sekundy);
  const xenoCanto = n.xc ? `https://xeno-canto.org/${n.xc}` : undefined;
  const idOpisu = useId();
  return (
    <figure className="nagranie">
      {opis && (
        <p className="nagranie__opis" id={idOpisu}>
          {opis}
        </p>
      )}
      {sonogram && (
        <div className="sonogram">
          {/* eslint-disable-next-line @next/next/no-img-element -- a drawing served as is */}
          <img
            className="sonogram__obraz"
            src={sonogram.src}
            width={1200}
            height={320}
            loading="lazy"
            alt={`Sonogram ${sekundy < n.sekundy ? `pierwszych ${sekundy} s nagrania` : 'nagrania'}${opis ? `: ${opis}` : ''}. W poziomie czas, w pionie wysokość dźwięku od 0 do ${sonogram.khz} kHz.`}
          />
          <span className="sonogram__os sonogram__os--hz" aria-hidden="true">
            <span>{sonogram.khz} kHz</span>
            <span>{sonogram.khz / 2} kHz</span>
            <span>0</span>
          </span>
          <span className="sonogram__os sonogram__os--czas" aria-hidden="true">
            <span>0 s</span>
            <span>{Math.round(sekundy)} s</span>
          </span>
        </div>
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
