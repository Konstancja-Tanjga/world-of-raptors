'use client';

import { useMemo, useState } from 'react';
import { REGIONY, type Aktywnosc, type Gatunek, type Region } from '@/lib/types';
import { FilterChip, Input } from './ds';

export type Filtry = {
  regiony: Region[];
  aktywnosc: Aktywnosc[];
  szukaj: string;
};

const AKTYWNOSC: { value: Aktywnosc; label: string }[] = [
  { value: 'dzienny', label: 'Dzienne' },
  { value: 'nocny', label: 'Nocne (sowy)' },
];

function toggle<T>(list: T[], value: T) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function useFiltry(gatunki: Gatunek[]) {
  const [filtry, setFiltry] = useState<Filtry>({ regiony: [], aktywnosc: [], szukaj: '' });

  const wynik = useMemo(() => {
    const q = filtry.szukaj.trim().toLowerCase();
    return gatunki.filter(
      (g) =>
        (filtry.regiony.length === 0 || filtry.regiony.some((r) => g.regiony.includes(r))) &&
        (filtry.aktywnosc.length === 0 || filtry.aktywnosc.includes(g.aktywnosc)) &&
        (q === '' ||
          [g.pl, g.lat, g.en, g.es].some((name) => name.toLowerCase().includes(q))),
    );
  }, [gatunki, filtry]);

  return { filtry, setFiltry, wynik };
}

export function SpeciesFilters({
  filtry,
  onChange,
}: {
  filtry: Filtry;
  onChange: (next: Filtry) => void;
}) {
  return (
    <div className="filters">
      <Input
        label="Szukaj gatunku"
        description="Nazwa polska, łacińska, angielska lub hiszpańska"
        type="search"
        value={filtry.szukaj}
        onChange={(e) => onChange({ ...filtry, szukaj: e.target.value })}
      />
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
              onClick={() =>
                onChange({ ...filtry, aktywnosc: toggle(filtry.aktywnosc, a.value) })
              }
            />
          ))}
        </div>
      </fieldset>
    </div>
  );
}
