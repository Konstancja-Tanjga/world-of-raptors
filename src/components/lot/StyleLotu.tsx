'use client';

import { OPIS_STYLU } from '@/lib/lot';
import type { StylLotu } from '@/lib/sylwetki';
import { NazwaPtaka } from '../NazwaPtaka';
import { ScenaSylwetki } from '../ScenaSylwetki';

/**
 * Module A11's gallery of flight styles: each species flying the way it does
 * (the same flight the flashcards animate), with the style named and
 * explained. Each bird has its own button to stop it; with less motion they
 * hold still.
 */
export function StyleLotu({ ptaki }: { ptaki: { id: string; pl: string; styl: StylLotu }[] }) {
  return (
    <ul className="style-lotu">
      {ptaki.map((p) => (
        <li key={p.id} className="style-lotu__ptak">
          <div className="style-lotu__niebo scena">
            <ScenaSylwetki id={p.id} wariant={`styl:${p.id}`} opis={`${p.pl} w locie, od spodu`} />
          </div>
          <p className="style-lotu__nazwa">
            <NazwaPtaka id={p.id} pl={p.pl} />: {OPIS_STYLU[p.styl].nazwa.toLowerCase()}
          </p>
          <p className="style-lotu__opis">{OPIS_STYLU[p.styl].opis}</p>
        </li>
      ))}
    </ul>
  );
}
