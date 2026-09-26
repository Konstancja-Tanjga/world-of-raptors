'use client';

import { useState } from 'react';
import { dzisiaj } from '@/lib/magazyn';
import { dodajZdjecie, usunZdjecie, useZdjeciaWlasne } from '@/lib/zdjeciaWlasne';
import { Button, FileDropzone, StateBlock, useToast } from './ds';

const MAKS_MB = 25;

/**
 * My own photos of one species. `edycja` shows the dropzone and delete
 * buttons (checklist); without it the photos are read-only (species page).
 */
export function OwnPhotos({ gatunek, nazwa, edycja = false }: { gatunek: string; nazwa: string; edycja?: boolean }) {
  const { zdjecia, blad } = useZdjeciaWlasne(gatunek);
  const [dodaje, setDodaje] = useState(false);
  const [bladPliku, setBladPliku] = useState<string | undefined>();
  const { notify } = useToast();

  const dodaj = async (pliki: File[]) => {
    const obrazy = pliki.filter((p) => p.type.startsWith('image/'));
    const zaDuze = obrazy.filter((p) => p.size > MAKS_MB * 1024 * 1024);
    if (obrazy.length < pliki.length || zaDuze.length) {
      setBladPliku(
        zaDuze.length
          ? `Plik większy niż ${MAKS_MB} MB: ${zaDuze.map((p) => p.name).join(', ')}.`
          : 'To nie jest zdjęcie. Wybierz plik JPG, PNG albo HEIC.',
      );
    } else {
      setBladPliku(undefined);
    }
    const doDodania = obrazy.filter((p) => p.size <= MAKS_MB * 1024 * 1024);
    if (doDodania.length === 0) return;
    setDodaje(true);
    try {
      for (const p of doDodania) await dodajZdjecie(gatunek, p, dzisiaj());
    } catch (err) {
      console.error('[wor-zdjecia] could not add photo', err);
      notify({
        tone: 'critical',
        title: 'Nie udało się dodać zdjęcia',
        description:
          'Przeglądarka nie mogła odczytać albo zapisać pliku. Spróbuj innego formatu (JPG) albo sprawdź, czy nie jesteś w trybie prywatnym.',
        duration: null,
      });
    } finally {
      setDodaje(false);
    }
  };

  const usun = async (id: string) => {
    try {
      await usunZdjecie(id);
    } catch (err) {
      console.error('[wor-zdjecia] could not delete photo', err);
      notify({ tone: 'critical', title: 'Nie udało się usunąć zdjęcia', duration: null });
    }
  };

  if (zdjecia === null) return <StateBlock state="loading" title="Wczytywanie moich zdjęć" scope="inline" />;
  if (!edycja && zdjecia.length === 0 && !blad) return null;

  return (
    <div className="own-photos">
      <p className="own-photos__title">📷 Moje zdjęcia</p>
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
                  <Button variant="ghost" tone="critical" size="sm" onClick={() => void usun(z.id)}>
                    Usuń<span className="visually-hidden"> zdjęcie {i + 1}</span>
                  </Button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {edycja && (
        <FileDropzone
          label={`Dodaj zdjęcie: ${nazwa}`}
          description={`JPG, PNG lub HEIC do ${MAKS_MB} MB. Zdjęcie zostanie zmniejszone, a dane o lokalizacji usunięte. Zostaje w tej przeglądarce i trafia do kopii zapasowej.`}
          prompt={dodaje ? 'Dodawanie…' : 'Upuść zdjęcie tutaj albo wybierz z urządzenia'}
          accept="image/*"
          multiple
          disabled={dodaje}
          error={bladPliku}
          onFiles={(pliki) => void dodaj(pliki)}
        />
      )}
    </div>
  );
}
