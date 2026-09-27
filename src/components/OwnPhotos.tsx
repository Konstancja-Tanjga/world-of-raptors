'use client';

import { useRef, useState } from 'react';
import { dzisiaj } from '@/lib/magazyn';
import { NieobslugiwanyFormat, dodajZdjecie, usunZdjecie, useZdjeciaWlasne } from '@/lib/zdjeciaWlasne';
import { Button, FileDropzone, StateBlock, useToast } from './ds';

const MAKS_MB = 25;
// Some systems report an empty type for .heic, so also look at the extension.
const wygladaNaZdjecie = (p: File) => p.type.startsWith('image/') || /\.(hei[cf]|jpe?g|png|webp)$/i.test(p.name);

function powodBledu(err: unknown) {
  if (err instanceof NieobslugiwanyFormat) {
    return 'ta przeglądarka nie potrafi otworzyć tego formatu (HEIC działa tylko w Safari), zapisz go jako JPG';
  }
  if (err instanceof DOMException && err.name === 'QuotaExceededError') return 'brak miejsca w pamięci przeglądarki';
  return 'błąd zapisu w przeglądarce (np. tryb prywatny)';
}

/**
 * My own photos of one species. `edycja` shows the dropzone and delete
 * buttons (checklist); without it the photos are read-only (species page).
 */
export function OwnPhotos({ gatunek, nazwa, edycja = false }: { gatunek: string; nazwa: string; edycja?: boolean }) {
  const { zdjecia, blad } = useZdjeciaWlasne(gatunek);
  const [dodaje, setDodaje] = useState(false);
  const [bladPliku, setBladPliku] = useState<string | undefined>();
  // FileDropzone leaves announcing results to the form around it.
  const [komunikat, setKomunikat] = useState('');
  const kontener = useRef<HTMLDivElement>(null);
  const trwa = useRef(false);
  const { notify } = useToast();

  const dodaj = async (pliki: File[]) => {
    // Re-entry guard instead of `disabled`: disabling the focused input would drop keyboard focus.
    if (trwa.current) return;
    const obrazy = pliki.filter(wygladaNaZdjecie);
    const zaDuze = obrazy.filter((p) => p.size > MAKS_MB * 1024 * 1024);
    const doDodania = obrazy.filter((p) => p.size <= MAKS_MB * 1024 * 1024);
    const odrzucone = [
      ...pliki.filter((p) => !wygladaNaZdjecie(p)).map((p) => `${p.name} (to nie jest zdjęcie)`),
      ...zaDuze.map((p) => `${p.name} (większy niż ${MAKS_MB} MB)`),
    ];
    setBladPliku(odrzucone.length ? `Pominięte: ${odrzucone.join(', ')}.` : undefined);
    if (doDodania.length === 0) return;

    trwa.current = true;
    setDodaje(true);
    const nieudane: string[] = [];
    for (const p of doDodania) {
      try {
        await dodajZdjecie(gatunek, p, dzisiaj());
      } catch (err) {
        console.error('[wor-zdjecia] could not add photo', p.name, err);
        nieudane.push(`${p.name}: ${powodBledu(err)}`);
      }
    }
    trwa.current = false;
    setDodaje(false);

    const dodane = doDodania.length - nieudane.length;
    setKomunikat(dodane > 0 ? `Dodano zdjęcia: ${dodane}. Gatunek: ${nazwa}.` : '');
    if (nieudane.length) {
      notify({
        tone: dodane > 0 ? 'warning' : 'critical',
        title: `Dodano ${dodane} z ${doDodania.length} zdjęć`,
        description: `Nie udało się: ${nieudane.join('; ')}.`,
        duration: null,
      });
    }
  };

  const usun = async (id: string, numer: number) => {
    if (!window.confirm(`Usunąć zdjęcie ${numer} (${nazwa})? Tego nie da się cofnąć, chyba że masz kopię zapasową.`)) {
      return;
    }
    try {
      await usunZdjecie(id, gatunek);
      setKomunikat(`Usunięto zdjęcie ${numer}. Gatunek: ${nazwa}.`);
      // The button is gone; put focus somewhere useful instead of <body>.
      kontener.current?.querySelector<HTMLInputElement>('input[type=file]')?.focus();
    } catch (err) {
      console.error('[wor-zdjecia] could not delete photo', err);
      notify({
        tone: 'critical',
        title: 'Nie udało się usunąć zdjęcia',
        description: `Zdjęcie nadal jest zapisane. Spróbuj ponownie, a jeśli to nie pomoże, odśwież stronę. Przyczyna: ${powodBledu(err)}.`,
        duration: null,
      });
    }
  };

  // Read-only view: say nothing until there is something to show.
  if (zdjecia === null) {
    return edycja ? <StateBlock state="loading" title="Wczytywanie moich zdjęć" scope="inline" /> : null;
  }
  if (!edycja && zdjecia.length === 0 && !blad) return null;

  return (
    <div className="own-photos" ref={kontener}>
      <p className="plate__label">Moje zdjęcia</p>
      <p className="visually-hidden" aria-live="polite">
        {komunikat}
      </p>
      {blad && <StateBlock state="error" title="Nie udało się wczytać zdjęć" description={blad} scope="inline" />}
      {zdjecia.length > 0 && (
        <ul className="own-photos__grid" aria-label={`Moje zdjęcia: ${nazwa}`}>
          {zdjecia.map((z, i) => (
            <li key={z.id} className="own-photos__item">
              {/* Blob URLs from IndexedDB: next/image cannot optimise or size-check them. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={z.url}
                alt={`${nazwa}, moje zdjęcie ${i + 1}`}
                width={z.width}
                height={z.height}
                className="photo__img"
              />
              <span className="photo__caption">
                Dodane {z.dodano}
                {edycja && (
                  <Button variant="ghost" tone="critical" size="sm" onClick={() => void usun(z.id, i + 1)}>
                    Usuń<span className="visually-hidden"> zdjęcie {i + 1}: {nazwa}</span>
                  </Button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {edycja && (
        <FileDropzone
          label={`Moje zdjęcia: ${nazwa}`}
          description={`JPG lub PNG, do ${MAKS_MB} MB. HEIC działa tylko w Safari.`}
          prompt={dodaje ? 'Dodawanie…' : 'Upuść zdjęcie tutaj albo wybierz z urządzenia'}
          accept="image/*,.heic,.heif"
          multiple
          error={bladPliku}
          onFiles={(pliki) => void dodaj(pliki)}
        />
      )}
      {edycja && (
        <p className="muted own-photos__uwaga">
          Zdjęcia zostają w tej przeglądarce, bez danych o lokalizacji. Trafiają do kopii zapasowej.
        </p>
      )}
    </div>
  );
}
