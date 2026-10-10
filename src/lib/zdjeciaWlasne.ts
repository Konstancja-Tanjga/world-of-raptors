'use client';

import { useEffect, useState } from 'react';

/**
 * My own photos attached to checklist observations.
 *
 * Stored in IndexedDB, not localStorage: localStorage holds a few MB of text,
 * a single phone photo can be larger than that. Every photo is re-encoded on
 * the way in (max 1600 px, JPEG), which keeps the store small and drops EXIF,
 * including GPS, so an exported backup never carries a location by accident.
 */
export type ZdjecieWlasne = {
  id: string;
  gatunek: string;
  blob: Blob;
  width: number;
  height: number;
  /** Local date (YYYY-MM-DD) the photo was added. */
  dodano: string;
};

/** A photo as written into a backup file. */
export type ZdjecieKopii = Omit<ZdjecieWlasne, 'blob'> & { dataUrl: string };

/** The browser cannot decode this file (typically HEIC outside Safari). */
export class NieobslugiwanyFormat extends Error {
  // A plain field, not `constructor(public plik)`: Node's type stripping (npm test) has no parameter properties.
  plik: string;
  constructor(plik: string) {
    super(`cannot decode ${plik}`);
    this.plik = plik;
    this.name = 'NieobslugiwanyFormat';
  }
}

const DB = 'wor-zdjecia';
const STORE = 'zdjecia';
const MAKS_BOK = 1600;

/** Listeners get the species that changed, or null when everything did. */
const listeners = new Set<(gatunek: string | null) => void>();
const powiadom = (gatunek: string | null) => listeners.forEach((l) => l(gatunek));

// One connection for the whole page, not one per operation.
let polaczenie: Promise<IDBDatabase> | null = null;

function otworz(): Promise<IDBDatabase> {
  if (polaczenie) return polaczenie;
  polaczenie = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const store = req.result.createObjectStore(STORE, { keyPath: 'id' });
      store.createIndex('gatunek', 'gatunek');
    };
    req.onsuccess = () => {
      const db = req.result;
      // Let a future schema upgrade (in another tab) proceed.
      db.onversionchange = () => {
        db.close();
        polaczenie = null;
      };
      resolve(db);
    };
    req.onerror = () => {
      polaczenie = null;
      reject(req.error);
    };
  });
  return polaczenie;
}

function transakcja<T>(tryb: IDBTransactionMode, praca: (s: IDBObjectStore) => IDBRequest<T>) {
  return otworz().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, tryb);
        const req = praca(tx.objectStore(STORE));
        tx.oncomplete = () => resolve(req.result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      }),
  );
}

async function zmniejsz(plik: File): Promise<{ blob: Blob; width: number; height: number }> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(plik);
  } catch {
    throw new NieobslugiwanyFormat(plik.name);
  }
  const skala = Math.min(1, MAKS_BOK / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * skala);
  const height = Math.round(bitmap.height * skala);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d unavailable');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
  if (!blob) throw new Error('could not encode photo');
  return { blob, width, height };
}

// crypto.randomUUID needs a secure context; testing over http://<LAN-IP> has none.
const noweId = () =>
  typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

export async function dodajZdjecie(gatunek: string, plik: File, dodano: string) {
  const { blob, width, height } = await zmniejsz(plik);
  const zdjecie: ZdjecieWlasne = { id: noweId(), gatunek, blob, width, height, dodano };
  await transakcja('readwrite', (s) => s.put(zdjecie));
  // Ask the browser not to evict this origin's data under storage pressure.
  void navigator.storage?.persist?.();
  powiadom(gatunek);
}

export async function usunZdjecie(id: string, gatunek: string) {
  await transakcja('readwrite', (s) => s.delete(id));
  powiadom(gatunek);
}

export function wszystkieZdjecia() {
  return transakcja<ZdjecieWlasne[]>('readonly', (s) => s.getAll());
}

/**
 * Replaces every stored photo in one transaction. If any put fails, the
 * transaction is aborted, so the old photos are never half-deleted.
 */
export async function zastapZdjecia(zdjecia: ZdjecieWlasne[]) {
  const db = await otworz();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
    try {
      const s = tx.objectStore(STORE);
      s.clear();
      zdjecia.forEach((z) => s.put(z));
    } catch (err) {
      tx.abort();
      reject(err);
    }
  });
  powiadom(null);
}

export function isZdjecieKopii(v: unknown): v is ZdjecieKopii {
  if (typeof v !== 'object' || v === null) return false;
  const z = v as Record<string, unknown>;
  return (
    typeof z.id === 'string' &&
    z.id !== '' &&
    typeof z.gatunek === 'string' &&
    typeof z.dodano === 'string' &&
    typeof z.width === 'number' &&
    Number.isFinite(z.width) &&
    typeof z.height === 'number' &&
    Number.isFinite(z.height) &&
    typeof z.dataUrl === 'string' &&
    z.dataUrl.startsWith('data:image/')
  );
}

export type ZdjecieDoPokazania = ZdjecieWlasne & { url: string };

/**
 * Photos of one species with object URLs for <img>. `null` while loading;
 * an error is surfaced rather than rendered as "no photos".
 */
export function useZdjeciaWlasne(gatunek: string) {
  const [stan, setStan] = useState<{ zdjecia: ZdjecieDoPokazania[] | null; blad: string | null }>({
    zdjecia: null,
    blad: null,
  });

  useEffect(() => {
    let urls: string[] = [];
    let aktywny = true;
    let numer = 0; // only the newest of overlapping loads may win
    const wczytaj = () => {
      const moj = ++numer;
      transakcja<ZdjecieWlasne[]>('readonly', (s) => s.index('gatunek').getAll(gatunek))
        .then((lista) => {
          if (!aktywny || moj !== numer) return;
          urls.forEach(URL.revokeObjectURL);
          const zdjecia = lista
            .sort((a, b) => String(a.dodano).localeCompare(String(b.dodano)))
            .map((z) => ({ ...z, url: URL.createObjectURL(z.blob) }));
          urls = zdjecia.map((z) => z.url);
          setStan({ zdjecia, blad: null });
        })
        .catch((err: unknown) => {
          console.error('[wor-zdjecia] could not read photos', err);
          if (aktywny && moj === numer) {
            setStan({ zdjecia: [], blad: 'Nie udało się wczytać zdjęć z pamięci przeglądarki.' });
          }
        });
    };
    const sluchaj = (zmieniony: string | null) => {
      if (zmieniony === null || zmieniony === gatunek) wczytaj();
    };
    wczytaj();
    listeners.add(sluchaj);
    return () => {
      aktywny = false;
      listeners.delete(sluchaj);
      urls.forEach(URL.revokeObjectURL);
    };
  }, [gatunek]);

  return stan;
}

/** For backups: photo blobs as data URLs, and back. */
export function blobNaDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

/** Only `data:image/…` URLs are decoded: a backup must never make the page fetch anything. */
export async function dataUrlNaBlob(dataUrl: string) {
  if (!dataUrl.startsWith('data:image/')) throw new Error('not an image data URL');
  return (await fetch(dataUrl)).blob();
}
