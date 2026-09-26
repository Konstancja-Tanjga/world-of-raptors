'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { dzisiaj, isChecklista, useChecklista, type Checklista } from '@/lib/checklist';
import { isPostep, usePostep } from '@/lib/postep';
import {
  blobNaDataUrl,
  dataUrlNaBlob,
  wszystkieZdjecia,
  zastapZdjecia,
  type ZdjecieWlasne,
} from '@/lib/zdjeciaWlasne';
import { OwnPhotos } from './OwnPhotos';
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
import { useOstrzezenieZapisu } from './useOstrzezenieZapisu';

type Widok = 'wszystkie' | 'zaobserwowane' | 'brakujace';

export function ChecklistView({ gatunki }: { gatunki: Gatunek[] }) {
  const { lista, przelacz, aktualizuj, zastap } = useChecklista();
  const { filtry, setFiltry, wynik } = useFiltry(gatunki);
  const [widok, setWidok] = useState<Widok>('wszystkie');
  const fileInput = useRef<HTMLInputElement>(null);
  const { notify } = useToast();
  const sprawdzZapis = useOstrzezenieZapisu();
  const { postep, zastapPostep } = usePostep();

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

  // Backup format v2: checklist, lesson progress and my photos in one file.
  // v1 files (a bare checklist object) still import.
  const eksportuj = async () => {
    let zdjecia: (Omit<ZdjecieWlasne, 'blob'> & { dataUrl: string })[] = [];
    try {
      zdjecia = await Promise.all(
        (await wszystkieZdjecia()).map(async ({ blob, ...z }) => ({ ...z, dataUrl: await blobNaDataUrl(blob) })),
      );
    } catch (err) {
      console.error('[wor-zdjecia] could not read photos for export', err);
      notify({
        tone: 'warning',
        title: 'Kopia bez zdjęć',
        description: 'Nie udało się odczytać moich zdjęć. Checklista i postęp zostały wyeksportowane.',
        duration: null,
      });
    }
    const kopia = { wersja: 2, checklista: lista, postep: postep ?? {}, zdjecia };
    const blob = new Blob([JSON.stringify(kopia)], { type: 'application/json' });
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
      const v2 =
        typeof parsed === 'object' && parsed !== null && (parsed as { wersja?: unknown }).wersja === 2
          ? (parsed as { checklista: unknown; postep?: unknown; zdjecia?: unknown })
          : null;
      const checklista = v2 ? v2.checklista : parsed;
      if (!isChecklista(checklista)) throw new Error('format');
      sprawdzZapis(zastap(checklista as Checklista));
      let ileZdjec = 0;
      if (v2) {
        if (v2.postep !== undefined && isPostep(v2.postep)) sprawdzZapis(zastapPostep(v2.postep));
        if (Array.isArray(v2.zdjecia)) {
          const zdjecia = await Promise.all(
            (v2.zdjecia as (Omit<ZdjecieWlasne, 'blob'> & { dataUrl: string })[]).map(async ({ dataUrl, ...z }) => ({
              ...z,
              blob: await dataUrlNaBlob(dataUrl),
            })),
          );
          await zastapZdjecia(zdjecia);
          ileZdjec = zdjecia.length;
        }
      }
      notify({
        tone: 'success',
        title: 'Kopia zaimportowana',
        description: `Wczytano ${Object.keys(checklista).length} obserwacji${v2 ? `, ${ileZdjec} zdjęć i postęp nauki` : ''}.`,
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
                          description={`${g.lat} (ang. ${g.en})`}
                          checked={Boolean(obs)}
                          onChange={() => sprawdzZapis(przelacz(g.id))}
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
                            onChange={(e) => sprawdzZapis(aktualizuj(g.id, { data: e.target.value }))}
                          />
                          <Input
                            label="Miejsce"
                            value={obs.miejsce ?? ''}
                            onChange={(e) => sprawdzZapis(aktualizuj(g.id, { miejsce: e.target.value }))}
                          />
                          <Textarea
                            label="Notatka"
                            rows={2}
                            value={obs.notatka ?? ''}
                            onChange={(e) => sprawdzZapis(aktualizuj(g.id, { notatka: e.target.value }))}
                          />
                        </div>
                      )}
                      {obs && <OwnPhotos gatunek={g.id} nazwa={g.pl} edycja />}
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
          Checklista, moje zdjęcia i postęp nauki są zapisane tylko w tej przeglądarce. Eksportuj
          je co jakiś czas do jednego pliku, żeby ich nie stracić, i importuj, żeby przenieść je na
          inne urządzenie.
        </p>
        <div className="row">
          <Button variant="secondary" onClick={() => void eksportuj()}>
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
