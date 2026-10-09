/**
 * The checklist's data and the rules for changing it, kept free of React and
 * browser APIs so the build, backups and tests can use them (the store is
 * checklist.ts).
 *
 * v2 is shaped for syncing with a server later: every entry says when it was
 * last changed (`zmieniono`), so two devices can keep the newer change, and
 * unticking keeps the entry with `widziany: false` (a tombstone) instead of
 * deleting it, so another device learns of the untick rather than bringing
 * the species back. Ticking it again restores its date, place and note.
 */

/** One species on the checklist. */
export type Obserwacja = {
  widziany: boolean;
  /** Local date (YYYY-MM-DD) of the first observation. */
  data?: string;
  miejsce?: string;
  notatka?: string;
  /** When this entry last changed (ISO 8601). */
  zmieniono: string;
};

export type Checklista = Record<string, Obserwacja>;

/** v1 (`wor:checklista:v1`): the presence of a key marked a species as seen; unticking deleted it. */
export type ObserwacjaV1 = { data?: string; miejsce?: string; notatka?: string };
export type ChecklistaV1 = Record<string, ObserwacjaV1>;

/** What a field of an entry may change to. */
export type ZmianaObserwacji = Partial<Pick<Obserwacja, 'data' | 'miejsce' | 'notatka'>>;

const POLA_TEKSTOWE = ['data', 'miejsce', 'notatka'] as const;

const jestSlownikiem = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const maPolaTekstowe = (o: Record<string, unknown>) =>
  POLA_TEKSTOWE.every((k) => o[k] === undefined || typeof o[k] === 'string');

export function isChecklistaV1(value: unknown): value is ChecklistaV1 {
  return jestSlownikiem(value) && Object.values(value).every((o) => jestSlownikiem(o) && maPolaTekstowe(o));
}

export function isChecklista(value: unknown): value is Checklista {
  return (
    jestSlownikiem(value) &&
    Object.values(value).every(
      (o) =>
        jestSlownikiem(o) && typeof o.widziany === 'boolean' && typeof o.zmieniono === 'string' && maPolaTekstowe(o),
    )
  );
}

/**
 * v1 to v2: every stored species was seen. Its fields are kept as they were;
 * `teraz` (ISO) marks the moment of the move, since v1 kept no change times.
 */
export function checklistaV1doV2(v1: ChecklistaV1, teraz: string): Checklista {
  const v2: Checklista = {};
  for (const [id, o] of Object.entries(v1)) {
    v2[id] = { widziany: true, ...pola(o), zmieniono: teraz };
  }
  return v2;
}

/** Any checklist a store or backup may hold, as v2; null when it is neither. */
export function checklistaZDowolnej(value: unknown, teraz: string): Checklista | null {
  if (isChecklista(value)) return value;
  if (isChecklistaV1(value)) return checklistaV1doV2(value, teraz);
  return null;
}

function pola(o: ObserwacjaV1): ObserwacjaV1 {
  const wynik: ObserwacjaV1 = {};
  for (const k of POLA_TEKSTOWE) if (o[k] !== undefined) wynik[k] = o[k];
  return wynik;
}

/** Whether the checklist marks a species as seen. */
export const jestWidziany = (lista: Readonly<Checklista>, id: string) => lista[id]?.widziany === true;

/** The ids of the species seen. */
export const widziane = (lista: Readonly<Checklista>) => Object.keys(lista).filter((id) => jestWidziany(lista, id));

/**
 * Ticks or unticks a species. Ticking a new one dates it `dzien`; ticking one
 * unticked before brings back what it had.
 */
export function przelaczObserwacje(lista: Readonly<Checklista>, id: string, dzien: string, teraz: string): Checklista {
  const byla = lista[id];
  const widziany = !byla?.widziany;
  return {
    ...lista,
    [id]: { ...byla, widziany, ...(widziany && !byla?.data ? { data: dzien } : {}), zmieniono: teraz },
  };
}

/** Changes the fields of a seen species' entry; an empty text clears its field. */
export function zmienObserwacje(
  lista: Readonly<Checklista>,
  id: string,
  zmiana: ZmianaObserwacji,
  teraz: string,
): Checklista {
  const byla = lista[id];
  if (!byla) return { ...lista };
  const nowa: Obserwacja = { ...byla, zmieniono: teraz };
  for (const k of POLA_TEKSTOWE) {
    if (!(k in zmiana)) continue;
    const v = zmiana[k];
    if (v) nowa[k] = v;
    else delete nowa[k];
  }
  return { ...lista, [id]: nowa };
}
