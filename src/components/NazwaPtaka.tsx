'use client';

import { ViewTransition } from 'react';
import { useJezykStrony, useNazwyGatunkow } from '@/lib/jezykStrony';

/**
 * A species' name as visible text. In Polish it is the atlas name; when a
 * browser translates the page, the name in that language (English when
 * there is none for it), never the translator's word-by-word guess: the
 * element is translate="no" and carries its own lang. `mala` starts it
 * lower case, for the middle of a Polish sentence.
 */
export function NazwaPtaka({ id, pl, mala = false }: { id: string; pl: string; mala?: boolean }) {
  const jezyk = useJezykStrony();
  const nazwy = useNazwyGatunkow(jezyk);
  const obca = nazwy?.[id]?.[jezyk] ?? nazwy?.[id]?.en;
  const jezykNazwy = nazwy?.[id]?.[jezyk] ? jezyk : obca ? 'en' : 'pl';
  const nazwa = obca ?? pl;
  // Lower case only in Polish: German nouns and English names keep their capitals.
  const tekst = mala && jezykNazwy === 'pl' ? nazwa[0].toLocaleLowerCase('pl') + nazwa.slice(1) : nazwa;
  return (
    <span translate="no" lang={jezykNazwy}>
      {tekst}
    </span>
  );
}


/**
 * A species' name that flies into the title of its page when it is opened
 * (globals.css, "morf-nazwy"). A shared transition needs each name once per
 * page: the atlas shows one view at a time, "Rozpoznaj" each species once.
 */
export function NazwaGatunku({ id, klasa, children }: { id: string; klasa: string; children: string }) {
  return (
    <ViewTransition name={`nazwa-${id}`} share="morf-nazwy" default="none">
      <span className={klasa}>
        <NazwaPtaka id={id} pl={children} />
      </span>
    </ViewTransition>
  );
}
