'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { dzisiaj, isChecklista, useChecklista, type Checklista } from '@/lib/checklist';
import type { Gatunek } from '@/lib/types';
import {
  Button,
  Card,
  Checkbox,
  Input,
  Progress,
  SegmentedControl,
  StateBlock,
  Textarea,
  useToast,
} from './ds';
import { SpeciesFilters, useFiltry } from './SpeciesFilters';

type Widok = 'wszystkie' | 'zaobserwowane' | 'brakujace';

export function ChecklistView({ gatunki }: { gatunki: Gatunek[] }) {
  const { lista, przelacz, aktualizuj, zastap } = useChecklista();
  const { filtry, setFiltry, wynik } = useFiltry(gatunki);
  const [widok, setWidok] = useState<Widok>('wszystkie');
  const fileInput = useRef<HTMLInputElement>(null);
  const { notify } = useToast();

  const widoczne = useMemo(() => {
    if (!lista || widok === 'wszystkie') return wynik;
    return wynik.filter((g) => (widok === 'zaobserwowane') === Boolean(lista[g.id]));
  }, [wynik, lista, widok]);

  const grupy = useMemo(() => {
    const map = new Map<string, Gatunek[]>();
    for (const g of widoczne) map.set(g.grupa, [...(map.get(g.grupa) ?? []), g]);
    return [...map.entries()];
  }, [widoczne]);

  if (!lista) {
    return <StateBlock state="loading" title="Wczytywanie checklisty" scope="section" />;
  }

  const znane = new Set(gatunki.map((g) => g.id));
  const liczba = Object.keys(lista).filter((id) => znane.has(id)).length;
  const wFiltrze = wynik.filter((g) => lista[g.id]).length;

  const eksportuj = () => {
    const blob = new Blob([JSON.stringify(lista, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `checklista-${dzisiaj()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importuj = async (file: File) => {
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isChecklista(parsed)) throw new Error('format');
      zastap(parsed as Checklista);
      notify({
        tone: 'success',
        title: 'Checklista zaimportowana',
        description: `Wczytano ${Object.keys(parsed).length} obserwacji.`,
      });
    } catch {
      notify({
        tone: 'critical',
        title: 'Nie udało się zaimportować pliku',
        description: 'Wybierz plik JSON wyeksportowany z tej checklisty.',
        duration: null,
      });
    }
  };

  return (
    <div className="stack">
      <Progress
        label="Zaobserwowane gatunki"
        value={liczba}
        max={gatunki.length}
        valueText={`${liczba} z ${gatunki.length}`}
        tone={liczba === gatunki.length ? 'success' : 'neutral'}
      />

      <SpeciesFilters filtry={filtry} onChange={setFiltry} />

      <div className="row">
        <div className="scroll-x">
          <SegmentedControl
          legend="Pokaż"
          showLegend
          value={widok}
          onChange={(v) => setWidok(v as Widok)}
          options={[
            { value: 'wszystkie', label: 'Wszystkie' },
            { value: 'zaobserwowane', label: 'Zaobserwowane' },
            { value: 'brakujace', label: 'Brakujące' },
            ]}
          />
        </div>
        <p className="muted" aria-live="polite">
          W tym filtrze: {wFiltrze} z {wynik.length} zaobserwowanych
        </p>
      </div>

      {grupy.length === 0 ? (
        <StateBlock
          state="empty"
          icon="🔭"
          title={widok === 'zaobserwowane' ? 'Brak obserwacji w tym filtrze' : 'Brak gatunków w tym filtrze'}
          description="Zmień region, aktywność albo wyszukiwaną nazwę."
          scope="section"
        />
      ) : (
        grupy.map(([grupa, lista_]) => (
          <section key={grupa} className="stack" aria-labelledby={`grupa-${grupa}`}>
            <h2 id={`grupa-${grupa}`} className="section-title">
              {grupa}{' '}
              <span className="muted">
                ({lista_.filter((g) => lista[g.id]).length} z {lista_.length})
              </span>
            </h2>
            <ul className="checklist">
              {lista_.map((g) => {
                const obs = lista[g.id];
                return (
                  <li key={g.id}>
                    <Card padding="snug" accent={obs ? 'success' : 'none'}>
                      <div className="checklist__row">
                        <Checkbox
                          label={g.pl}
                          description={g.lat}
                          checked={Boolean(obs)}
                          onChange={() => przelacz(g.id)}
                        />
                        <Link href={`/gatunki/${g.id}`} className="text-link">
                          Karta gatunku<span className="visually-hidden">: {g.pl}</span>
                        </Link>
                      </div>
                      {obs && (
                        <div className="checklist__details">
                          <Input
                            label="Data obserwacji"
                            type="date"
                            value={obs.data ?? ''}
                            onChange={(e) => aktualizuj(g.id, { data: e.target.value })}
                          />
                          <Input
                            label="Miejsce"
                            value={obs.miejsce ?? ''}
                            onChange={(e) => aktualizuj(g.id, { miejsce: e.target.value })}
                          />
                          <Textarea
                            label="Notatka"
                            rows={2}
                            value={obs.notatka ?? ''}
                            onChange={(e) => aktualizuj(g.id, { notatka: e.target.value })}
                          />
                        </div>
                      )}
                    </Card>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

      <section className="stack" aria-labelledby="kopia">
        <h2 id="kopia" className="section-title">
          Kopia zapasowa
        </h2>
        <p className="muted">
          Checklista jest zapisana w tej przeglądarce. Eksportuj ją co jakiś czas, żeby nie stracić
          obserwacji, i importuj, żeby przenieść ją na inne urządzenie.
        </p>
        <div className="row">
          <Button variant="secondary" onClick={eksportuj}>
            Eksportuj do pliku
          </Button>
          <Button variant="secondary" onClick={() => fileInput.current?.click()}>
            Importuj z pliku
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void importuj(file);
              e.target.value = '';
            }}
          />
        </div>
      </section>
    </div>
  );
}
