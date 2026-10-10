'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { MIEJSCA, REGIONY, type Aktywnosc, type Kategoria, type Miejsce, type PtakNaLiscie, type Region } from '@/lib/types';
import { FilterChip, Input, SegmentedControl } from './ds';

/** Which birds a list shows: raptors (the default), birds of marshes, or both. */
export type ZakresPtakow = Kategoria | 'wszystkie';

export type Filtry = {
  ptaki: ZakresPtakow;
  miejsca: Miejsce[];
  regiony: Region[];
  aktywnosc: Aktywnosc[];
  szukaj: string;
};

const AKTYWNOSC: { value: Aktywnosc; label: string }[] = [
  { value: 'dzienny', label: 'Dzienne' },
  { value: 'nocny', label: 'Nocne (sowy)' },
];

const ZAKRESY: { value: ZakresPtakow; label: string }[] = [
  { value: 'drapiezne', label: 'Drapieżniki' },
  { value: 'ptaki-mokradel', label: 'Ptaki mokradeł' },
  { value: 'wszystkie', label: 'Wszystkie' },
];

function toggle<T>(list: T[], value: T) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export const PUSTE_FILTRY: Filtry = { ptaki: 'drapiezne', miejsca: [], regiony: [], aktywnosc: [], szukaj: '' };

/** Whether anything narrows the list beyond the default (raptors, everything else open). */
export const filtryAktywne = (f: Filtry) =>
  f.szukaj.trim() !== '' || f.ptaki !== 'drapiezne' || f.miejsca.length > 0 || f.regiony.length > 0 || f.aktywnosc.length > 0;

/**
 * Birds of marshes have no region or activity, so those filters are cleared
 * when only they are shown: hidden chips must not stay on, emptying the list.
 * Every change of the filters goes through here (useFiltry's setter).
 */
const znormalizuj = (f: Filtry): Filtry => (f.ptaki === 'ptaki-mokradel' && (f.regiony.length || f.aktywnosc.length) ? { ...f, regiony: [], aktywnosc: [] } : f);

/** A site switches to every bird, since its field list has both kinds; switching to it again keeps the choice made. */
export function zMiejscem(f: Filtry, miejsce: Miejsce): Filtry {
  const miejsca = toggle(f.miejsca, miejsce);
  return { ...f, miejsca, ptaki: miejsca.length && f.ptaki === 'drapiezne' ? 'wszystkie' : f.ptaki };
}

/**
 * Filters from the address: `?miejsce=marismas-barbate` (a site's field
 * list, both kinds of bird) and `?ptaki=mokradla|wszystkie`. Links from lessons
 * use them; nothing writes them back.
 */
function filtryZAdresu(search: string): Filtry | null {
  const p = new URLSearchParams(search);
  const miejsce = MIEJSCA.find((m) => m.value === p.get('miejsce'))?.value;
  const ptaki = ({ mokradla: 'ptaki-mokradel', wszystkie: 'wszystkie' } as const)[p.get('ptaki') ?? ''];
  if (!miejsce && !ptaki) return null;
  const f = miejsce ? zMiejscem(PUSTE_FILTRY, miejsce) : PUSTE_FILTRY;
  return ptaki ? { ...f, ptaki } : f;
}

/** Whether a bird is in the list's scope: its kind and site, before the search, regions and activity narrow it. */
export const wZakresie = (p: PtakNaLiscie, f: Pick<Filtry, 'ptaki' | 'miejsca'>) =>
  (f.ptaki === 'wszystkie' || p.kategoria === f.ptaki) && (f.miejsca.length === 0 || f.miejsca.some((m) => p.miejsca.includes(m)));

export function useFiltry(ptaki: PtakNaLiscie[]) {
  const [filtry, ustawFiltry] = useState<Filtry>(PUSTE_FILTRY);
  const setFiltry = useCallback((f: Filtry) => ustawFiltry(znormalizuj(f)), []);

  useEffect(() => {
    const zAdresu = filtryZAdresu(window.location.search);
    // The page is prerendered without the address's query, so it can only be read after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (zAdresu) setFiltry(zAdresu);
  }, [setFiltry]);

  const zakres = useMemo(() => ptaki.filter((p) => wZakresie(p, filtry)), [ptaki, filtry]);

  const wynik = useMemo(() => {
    const q = filtry.szukaj.trim().toLowerCase();
    return zakres.filter(
      (p) =>
        // Birds of marshes have no region or activity in the atlas, so those filters leave only raptors.
        (filtry.regiony.length === 0 || filtry.regiony.some((r) => p.regiony.includes(r))) &&
        (filtry.aktywnosc.length === 0 || (p.aktywnosc !== null && filtry.aktywnosc.includes(p.aktywnosc))) &&
        (q === '' || [p.pl, p.lat, p.en, p.es].some((name) => name.toLowerCase().includes(q))),
    );
  }, [zakres, filtry]);

  return { filtry, setFiltry, zakres, wynik };
}

export function SpeciesFilters({ filtry, onChange }: { filtry: Filtry; onChange: (next: Filtry) => void }) {
  return (
    <div className="filters">
      <Input
        label="Szukaj gatunku"
        description="Nazwa polska, łacińska, angielska lub hiszpańska"
        type="search"
        value={filtry.szukaj}
        onChange={(e) => onChange({ ...filtry, szukaj: e.target.value })}
      />
      <div className="scroll-x">
        <SegmentedControl
          legend="Ptaki"
          showLegend
          size="sm"
          value={filtry.ptaki}
          onChange={(v) => onChange({ ...filtry, ptaki: v as ZakresPtakow })}
          options={ZAKRESY}
        />
      </div>
      <fieldset className="filters__group">
        <legend className="filters__legend">Miejsce</legend>
        <div className="chips">
          {MIEJSCA.map((m) => (
            <FilterChip
              key={m.value}
              label={m.label}
              pressed={filtry.miejsca.includes(m.value)}
              onClick={() => onChange(zMiejscem(filtry, m.value))}
            />
          ))}
        </div>
      </fieldset>
      {filtry.ptaki !== 'ptaki-mokradel' && (
        <>
          <fieldset className="filters__group">
            <legend className="filters__legend">Region</legend>
            <div className="chips">
              {REGIONY.map((r) => (
                <FilterChip
                  key={r.value}
                  label={r.label}
                  pressed={filtry.regiony.includes(r.value)}
                  onClick={() => onChange({ ...filtry, regiony: toggle(filtry.regiony, r.value) })}
                />
              ))}
            </div>
          </fieldset>
          <fieldset className="filters__group">
            <legend className="filters__legend">Aktywność</legend>
            <div className="chips">
              {AKTYWNOSC.map((a) => (
                <FilterChip
                  key={a.value}
                  label={a.label}
                  pressed={filtry.aktywnosc.includes(a.value)}
                  onClick={() => onChange({ ...filtry, aktywnosc: toggle(filtry.aktywnosc, a.value) })}
                />
              ))}
            </div>
          </fieldset>
        </>
      )}
    </div>
  );
}
