'use client';

import { isChecklista, type Checklista } from './checklist';
import { isFiszki, type Fiszki } from './fiszki';
import { isPostep, type Postep } from './postep';
import { isZdobyte, type Zdobyte } from './zdobyte';
import {
  blobNaDataUrl,
  dataUrlNaBlob,
  isZdjecieKopii,
  wszystkieZdjecia,
  type ZdjecieKopii,
  type ZdjecieWlasne,
} from './zdjeciaWlasne';

/**
 * Backup file format.
 *
 * v2: `{ wersja: 2, checklista, postep, fiszki, odznaki, zdjecia }`. `fiszki`
 * was added later, so older v2 files lack it; it is also left out when there
 * are no flashcard schedules (or they have not loaded yet), so importing such
 * a file keeps the target device's flashcards. `odznaki` ("Moje niebo": when
 * each constellation, gold star and patch was earned) came later still and is
 * left out the same way; a file without it loses only the dates, since the
 * progress earns them again. `zdjecia` is left out (not `[]`) when the photos could
 * not be read, so importing such a file keeps the photos already on the
 * target device instead of erasing them.
 * v1: a bare checklist object; still importable.
 */
type KopiaV2 = {
  wersja: 2;
  checklista: Checklista;
  postep: Postep;
  fiszki?: Fiszki;
  odznaki?: Zdobyte;
  zdjecia?: ZdjecieKopii[];
};

export async function utworzKopie(checklista: Checklista, postep: Postep, fiszki: Fiszki | null, odznaki: Zdobyte | null) {
  let zdjecia: ZdjecieKopii[] | undefined;
  try {
    zdjecia = await Promise.all(
      (await wszystkieZdjecia()).map(async ({ blob, ...z }) => ({ ...z, dataUrl: await blobNaDataUrl(blob) })),
    );
  } catch (err) {
    console.error('[kopia] could not read photos for export', err);
    zdjecia = undefined;
  }
  const kopia: KopiaV2 = {
    wersja: 2,
    checklista,
    postep,
    ...(fiszki && Object.keys(fiszki).length ? { fiszki } : {}),
    ...(odznaki && Object.keys(odznaki).length ? { odznaki } : {}),
    ...(zdjecia ? { zdjecia } : {}),
  };
  return { plik: new Blob([JSON.stringify(kopia)], { type: 'application/json' }), bezZdjec: !zdjecia };
}

/** Everything in a backup, already validated and decoded, ready to write. */
export type OdczytanaKopia = {
  checklista: Checklista;
  /** undefined: the file has no progress (v1, or v2 without it) — leave current progress alone. */
  postep?: Postep;
  /** undefined: the file has no flashcards (v1, or an older v2) — leave current ones alone. */
  fiszki?: Fiszki;
  /** undefined: the file has no earned dates (v1, or an older v2). */
  odznaki?: Zdobyte;
  /** undefined: the file has no photos — leave current photos alone. */
  zdjecia?: ZdjecieWlasne[];
};

export class NiepoprawnaKopia extends Error {
  name = 'NiepoprawnaKopia';
}

/**
 * Parses and validates the whole file before anything is written, so a bad
 * file can never leave the store half-replaced.
 */
export async function odczytajKopie(tekst: string): Promise<OdczytanaKopia> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(tekst);
  } catch {
    throw new NiepoprawnaKopia('to nie jest plik JSON');
  }
  const obiekt = typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : null;

  if (obiekt?.wersja !== 2) {
    if (!isChecklista(parsed)) throw new NiepoprawnaKopia('plik nie wygląda na kopię checklisty');
    return { checklista: parsed };
  }

  if (!isChecklista(obiekt.checklista)) throw new NiepoprawnaKopia('uszkodzona checklista w pliku');
  if (obiekt.fiszki !== undefined && !isFiszki(obiekt.fiszki)) {
    throw new NiepoprawnaKopia('uszkodzone fiszki w pliku');
  }
  if (obiekt.postep !== undefined && !isPostep(obiekt.postep)) {
    throw new NiepoprawnaKopia('uszkodzony postęp nauki w pliku');
  }
  if (obiekt.odznaki !== undefined && !isZdobyte(obiekt.odznaki)) {
    throw new NiepoprawnaKopia('uszkodzone gwiazdozbiory i naszywki w pliku');
  }
  let zdjecia: ZdjecieWlasne[] | undefined;
  if (obiekt.zdjecia !== undefined) {
    if (!Array.isArray(obiekt.zdjecia) || !obiekt.zdjecia.every(isZdjecieKopii)) {
      throw new NiepoprawnaKopia('uszkodzone zdjęcia w pliku');
    }
    try {
      zdjecia = await Promise.all(
        obiekt.zdjecia.map(async ({ dataUrl, ...z }) => ({ ...z, blob: await dataUrlNaBlob(dataUrl) })),
      );
    } catch {
      throw new NiepoprawnaKopia('nie udało się odczytać zdjęć z pliku');
    }
  }
  return {
    checklista: obiekt.checklista,
    postep: obiekt.postep as Postep | undefined,
    fiszki: obiekt.fiszki as Fiszki | undefined,
    odznaki: obiekt.odznaki as Zdobyte | undefined,
    zdjecia,
  };
}
