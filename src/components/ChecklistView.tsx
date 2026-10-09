'use client';

import Link from 'next/link';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { dzisiaj, jestWidziany, useChecklista, widziane } from '@/lib/checklist';
import { useFiszki } from '@/lib/fiszki';
import { NiepoprawnaKopia, odczytajKopie, utworzKopie, type OdczytanaKopia } from '@/lib/kopia';
import { usePostep } from '@/lib/postep';
import { useZdobyte, wczytajZKopii } from '@/lib/zdobyte';
import { zastapZdjecia } from '@/lib/zdjeciaWlasne';
import { OwnPhotos } from './OwnPhotos';
import { MIEJSCA, type Miejsce, type PtakNaLiscie } from '@/lib/types';
import {
  Button,
  Card,
  Checkbox,
  DatePicker,
  Input,
  Progress,
  SegmentedControl,
  StateBlock,
  Textarea,
  useToast,
} from './ds';
import { filtryAktywne as czyFiltryAktywne, PUSTE_FILTRY, SpeciesFilters, useFiltry } from './SpeciesFilters';
import { useOstrzezenieZapisu } from './useOstrzezenieZapisu';

type Widok = 'wszystkie' | 'zaobserwowane' | 'brakujace';

/** One group of a site's field list (content.ts, listaMiejsca). */
export type GrupaListy = { id: string; nazwa: string; gatunki: string[] };

/**
 * `sylwetki`: each raptor's silhouette, drawn on the server so the generator
 * stays out of this bundle (birds of marshes have none). `listyMiejsc`: each
 * site's field list by group; with one site chosen, the list is grouped and
 * counted that way ("Siewkowe: 3 z 14").
 */
export function ChecklistView({
  ptaki,
  sylwetki,
  listyMiejsc,
}: {
  ptaki: PtakNaLiscie[];
  sylwetki: Record<string, ReactNode>;
  listyMiejsc: Record<Miejsce, GrupaListy[]>;
}) {
  const { lista, przelacz, aktualizuj, zastap } = useChecklista();
  const { filtry, setFiltry, zakres, wynik } = useFiltry(ptaki);
  const [widok, setWidok] = useState<Widok>('wszystkie');
  const filtryAktywne = czyFiltryAktywne(filtry);
  const miejsce = filtry.miejsca.length === 1 ? MIEJSCA.find((m) => m.value === filtry.miejsca[0]) : undefined;
  const listaMiejsca = miejsce ? listyMiejsc[miejsce.value] : null;
  const wyczyscFiltry = () => {
    setFiltry(PUSTE_FILTRY);
    // The button disappears with the empty state; keep keyboard focus on the page.
    requestAnimationFrame(() => document.querySelector<HTMLInputElement>('input[type=search]')?.focus());
  };
  const fileInput = useRef<HTMLInputElement>(null);
  const { notify } = useToast();
  const sprawdzZapis = useOstrzezenieZapisu();
  const { postep, zastapPostep } = usePostep();
  const { fiszki, zastapFiszki } = useFiszki();
  const zdobyte = useZdobyte();

  const widoczne = useMemo(() => {
    if (!lista || widok === 'wszystkie') return wynik;
    return wynik.filter((g) => (widok === 'zaobserwowane') === jestWidziany(lista, g.id));
  }, [wynik, lista, widok]);

  const grupy = useMemo((): [string, PtakNaLiscie[]][] => {
    if (listaMiejsca) {
      const poId = new Map(widoczne.map((p) => [p.id, p]));
      return listaMiejsca
        .map((g): [string, PtakNaLiscie[]] => [g.nazwa, g.gatunki.flatMap((id) => poId.get(id) ?? [])])
        .filter(([, w]) => w.length > 0);
    }
    const map = new Map<string, PtakNaLiscie[]>();
    for (const g of widoczne) map.set(g.grupa, [...(map.get(g.grupa) ?? []), g]);
    return [...map.entries()];
  }, [widoczne, listaMiejsca]);

  if (!lista) {
    return <StateBlock state="loading" title="Wczytywanie checklisty" scope="section" />;
  }

  const liczba = zakres.filter((p) => jestWidziany(lista, p.id)).length;
  const wFiltrze = wynik.filter((g) => jestWidziany(lista, g.id)).length;
  const etykietaPostepu = miejsce
    ? `Zaobserwowane w ${miejsce.label}`
    : filtry.ptaki === 'drapiezne'
      ? 'Zaobserwowane drapieżniki'
      : filtry.ptaki === 'ptaki-mokradel'
        ? 'Zaobserwowane ptaki mokradeł'
        : 'Zaobserwowane gatunki';

  const eksportuj = async () => {
    try {
      const { plik, bezZdjec } = await utworzKopie(lista, postep ?? {}, fiszki, zdobyte);
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
            'Nie udało się odczytać moich zdjęć, więc plik zawiera wszystko oprócz nich. Wczytanie tej kopii nie usunie zdjęć na innym urządzeniu.',
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
  // fail, and aborted atomically), then progress and flashcards, then what
  // "Moje niebo" recorded, then the checklist.
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
              ? 'Brak miejsca w pamięci przeglądarki. Nic nie zostało zmienione: checklista, postęp, fiszki i dotychczasowe zdjęcia są bez zmian.'
              : 'Przeglądarka odmówiła zapisu. Nic nie zostało zmienione: checklista, postęp, fiszki i dotychczasowe zdjęcia są bez zmian.',
          duration: null,
        });
        return;
      }
    }

    const postepOk = kopia.postep ? zastapPostep(kopia.postep) : true;
    const fiszkiOk = kopia.fiszki ? zastapFiszki(kopia.fiszki) : true;
    const odznakiOk = wczytajZKopii(kopia.odznaki);
    const checklistaOk = zastap(kopia.checklista);
    const nieZapisane = [
      !checklistaOk && 'checklisty',
      !postepOk && 'postępu nauki',
      !fiszkiOk && 'fiszek',
      // A file without dates changes only a mark of mine, nothing I would miss.
      !odznakiOk && kopia.odznaki && 'gwiazdozbiorów i naszywek',
    ].filter(Boolean);
    const wczytano = [
      `${widziane(kopia.checklista).length} obserwacji`,
      kopia.zdjecia ? `${kopia.zdjecia.length} zdjęć` : null,
      kopia.postep ? 'postęp nauki' : null,
      kopia.fiszki ? `${Object.keys(kopia.fiszki).length} fiszek` : null,
      kopia.odznaki ? 'daty gwiazdozbiorów i naszywek' : null,
    ].filter(Boolean);
    const pominiete = [!kopia.zdjecia && 'zdjęć (dotychczasowe zostały)', !kopia.postep && 'postępu (dotychczasowy został)', !kopia.fiszki && 'fiszek (dotychczasowe zostały)'].filter(
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
        label={etykietaPostepu}
        value={liczba}
        max={zakres.length}
        valueText={`${liczba} z ${zakres.length}`}
        tone={zakres.length > 0 && liczba === zakres.length ? 'success' : 'neutral'}
      />
      {listaMiejsca && (
        <ul className="checklist__podsumowanie" aria-label={`${miejsce!.label}: grupy`}>
          {listaMiejsca.map((g) => {
            const ile = g.gatunki.filter((id) => jestWidziany(lista, id)).length;
            return (
              <li key={g.id} data-komplet={ile === g.gatunki.length ? '' : undefined}>
                <span>{g.nazwa}</span>{' '}
                <span className="checklist__licznik">
                  {ile} z {g.gatunki.length}
                </span>
              </li>
            );
          })}
        </ul>
      )}

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
        filtryAktywne ? (
          <StateBlock
            state="empty"
            title="Brak gatunków w tym filtrze"
            description="Zmień rodzaj ptaków, miejsce, region, aktywność albo wpisaną nazwę."
            action={
              <Button size="sm" variant="secondary" onClick={wyczyscFiltry}>
                Wyczyść filtry
              </Button>
            }
            scope="section"
          />
        ) : (
          // Only the view ("Zaobserwowane" / "Brakujące") empties the list: say why, offer the way back.
          <StateBlock
            state="empty"
            title={widok === 'zaobserwowane' ? 'Nie masz jeszcze obserwacji' : 'Masz już wszystkie gatunki'}
            description={
              widok === 'zaobserwowane'
                ? 'Zaznacz gatunek na liście, kiedy go zobaczysz.'
                : 'Każdy gatunek z tej listy jest już wśród Twoich obserwacji.'
            }
            action={
              <Button size="sm" variant="secondary" onClick={() => setWidok('wszystkie')}>
                Pokaż wszystkie gatunki
              </Button>
            }
            scope="section"
          />
        )
      ) : (
        grupy.map(([grupa, lista_]) => (
          <section key={grupa} className="checklist__grupa" aria-labelledby={`grupa-${idGrupy(grupa)}`}>
            <h2 id={`grupa-${idGrupy(grupa)}`} className="checklist__naglowek">
              {grupa[0].toLocaleUpperCase('pl') + grupa.slice(1)}{' '}
              <span className="checklist__licznik">
                ({lista_.filter((g) => jestWidziany(lista, g.id)).length} z {lista_.length})
              </span>
            </h2>
            <ul className="checklist">
              {lista_.map((g) => {
                const obs = jestWidziany(lista, g.id) ? lista[g.id] : undefined;
                return (
                  <li key={g.id}>
                    <Card padding="snug" accent={obs ? 'success' : 'none'}>
                      <div className="checklist__row" data-widziany={obs ? '' : undefined}>
                        <span className="checklist__sylwetka" aria-hidden="true">
                          {sylwetki[g.id] ?? null}
                        </span>
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
                          <DatePicker
                            label="Data obserwacji"
                            description="Domyślnie dzień zaznaczenia."
                            max={dzisiaj()}
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
        <h2 id="kopia" className="checklist__naglowek">
          Kopia zapasowa
        </h2>
        <p className="muted">
          Checklista, moje zdjęcia, postęp nauki, fiszki i „Moje niebo” są zapisane tylko w tej przeglądarce. Co jakiś
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

/** A heading id from a group's name ("Czaple, flaming, warzęcha" has spaces and commas). */
const idGrupy = (nazwa: string) =>
  nazwa
    .toLocaleLowerCase('pl')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l')
    .replace(/[^a-z0-9]+/g, '-');
