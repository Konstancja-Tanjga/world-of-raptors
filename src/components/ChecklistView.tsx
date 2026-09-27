'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { dzisiaj, useChecklista } from '@/lib/checklist';
import { NiepoprawnaKopia, odczytajKopie, utworzKopie, type OdczytanaKopia } from '@/lib/kopia';
import { usePostep } from '@/lib/postep';
import { zastapZdjecia } from '@/lib/zdjeciaWlasne';
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
import { PUSTE_FILTRY, SpeciesFilters, useFiltry } from './SpeciesFilters';
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

  const eksportuj = async () => {
    try {
      const { plik, bezZdjec } = await utworzKopie(lista, postep ?? {});
      const url = URL.createObjectURL(plik);
      const a = document.createElement('a');
      a.href = url;
      a.download = `checklista-${dzisiaj()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      if (!bezZdjec) {
        notify({ tone: 'success', title: 'Kopia zapisana', description: `Plik ${a.download} jest w pobranych.` });
      }
      if (bezZdjec) {
        notify({
          tone: 'warning',
          title: 'Kopia bez zdjęć',
          description:
            'Nie udało się odczytać moich zdjęć, więc plik zawiera tylko checklistę i postęp. Import tego pliku nie usunie zdjęć na innym urządzeniu.',
          duration: null,
        });
      }
    } catch (err) {
      console.error('[kopia] export failed', err);
      notify({
        tone: 'critical',
        title: 'Nie udało się zapisać kopii',
        description: 'Spróbuj jeszcze raz. Jeśli zdjęć jest bardzo dużo, przeglądarce mogło zabraknąć pamięci.',
        duration: null,
      });
    }
  };

  // Order matters: validate everything, then write photos (most likely to
  // fail, and aborted atomically), then progress, then the checklist.
  const importuj = async (file: File) => {
    let kopia: OdczytanaKopia;
    try {
      kopia = await odczytajKopie(await file.text());
    } catch (err) {
      console.error('[kopia] invalid backup', err);
      notify({
        tone: 'critical',
        title: 'Nie udało się wczytać kopii',
        description: `${err instanceof NiepoprawnaKopia ? err.message[0].toUpperCase() + err.message.slice(1) : 'Nie udało się odczytać pliku'}. Nic nie zostało zmienione.`,
        duration: null,
      });
      return;
    }

    if (kopia.zdjecia) {
      try {
        await zastapZdjecia(kopia.zdjecia);
      } catch (err) {
        console.error('[kopia] could not store photos', err);
        notify({
          tone: 'critical',
          title: 'Nie udało się zapisać zdjęć z kopii',
          description:
            err instanceof DOMException && err.name === 'QuotaExceededError'
              ? 'Brak miejsca w pamięci przeglądarki. Nic nie zostało zmienione: checklista, postęp i dotychczasowe zdjęcia są bez zmian.'
              : 'Przeglądarka odmówiła zapisu. Nic nie zostało zmienione: checklista, postęp i dotychczasowe zdjęcia są bez zmian.',
          duration: null,
        });
        return;
      }
    }

    const postepOk = kopia.postep ? zastapPostep(kopia.postep) : true;
    const checklistaOk = zastap(kopia.checklista);
    const nieZapisane = [!checklistaOk && 'checklisty', !postepOk && 'postępu nauki'].filter(Boolean);
    const wczytano = [
      `${Object.keys(kopia.checklista).length} obserwacji`,
      kopia.zdjecia ? `${kopia.zdjecia.length} zdjęć` : null,
      kopia.postep ? 'postęp nauki' : null,
    ].filter(Boolean);
    const pominiete = [!kopia.zdjecia && 'zdjęć (dotychczasowe zostały)', !kopia.postep && 'postępu (dotychczasowy został)'].filter(
      Boolean,
    );
    notify({
      tone: nieZapisane.length ? 'warning' : 'success',
      title: nieZapisane.length ? 'Kopia wczytana częściowo' : 'Kopia wczytana',
      description: [
        `Wczytano: ${wczytano.join(', ')}.`,
        pominiete.length ? `Plik nie zawierał ${pominiete.join(' ani ')}.` : '',
        nieZapisane.length
          ? `Przeglądarka nie zapisała ${nieZapisane.join(' ani ')}: te zmiany znikną po odświeżeniu.`
          : '',
      ]
        .filter(Boolean)
        .join(' '),
      duration: nieZapisane.length ? null : undefined,
    });
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
          title={widok === 'zaobserwowane' ? 'Brak obserwacji w tym filtrze' : 'Brak gatunków w tym filtrze'}
          description="Zmień region, aktywność albo wpisaną nazwę."
          action={
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setFiltry(PUSTE_FILTRY);
                setWidok('wszystkie');
              }}
            >
              Wyczyść filtry
            </Button>
          }
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
          Checklista, moje zdjęcia i postęp nauki są zapisane tylko w tej przeglądarce. Co jakiś
          czas zapisz kopię w pliku, żeby ich nie stracić. Wczytaj ją na innym urządzeniu, żeby tam
          też je mieć.
        </p>
        <div className="row">
          <Button variant="secondary" onClick={() => void eksportuj()}>
            Zapisz kopię w pliku
          </Button>
          <Button variant="secondary" onClick={() => fileInput.current?.click()}>
            Wczytaj kopię z pliku
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
