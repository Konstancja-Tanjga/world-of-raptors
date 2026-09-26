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

const DB = 'wor-zdjecia';
const STORE = 'zdjecia';
const MAKS_BOK = 1600;

const listeners = new Set<() => void>();
const powiadom = () => listeners.forEach((l) => l());

function otworz(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const store = req.result.createObjectStore(STORE, { keyPath: 'id' });
      store.createIndex('gatunek', 'gatunek');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
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

async function zmniejsz(plik: Blob): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(plik);
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

export async function dodajZdjecie(gatunek: string, plik: File, dodano: string) {
  const { blob, width, height } = await zmniejsz(plik);
  const zdjecie: ZdjecieWlasne = { id: crypto.randomUUID(), gatunek, blob, width, height, dodano };
  await transakcja('readwrite', (s) => s.put(zdjecie));
  // Ask the browser not to evict this origin's data under storage pressure.
  void navigator.storage?.persist?.();
  powiadom();
}

export async function usunZdjecie(id: string) {
  await transakcja('readwrite', (s) => s.delete(id));
  powiadom();
}

export function wszystkieZdjecia() {
  return transakcja<ZdjecieWlasne[]>('readonly', (s) => s.getAll());
}

export async function zastapZdjecia(zdjecia: ZdjecieWlasne[]) {
  const db = await otworz();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const s = tx.objectStore(STORE);
    s.clear();
    zdjecia.forEach((z) => s.put(z));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  powiadom();
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
    const wczytaj = () =>
      transakcja<ZdjecieWlasne[]>('readonly', (s) => s.index('gatunek').getAll(gatunek))
        .then((lista) => {
          if (!aktywny) return;
          urls.forEach(URL.revokeObjectURL);
          const zdjecia = lista
            .sort((a, b) => a.dodano.localeCompare(b.dodano))
            .map((z) => ({ ...z, url: URL.createObjectURL(z.blob) }));
          urls = zdjecia.map((z) => z.url);
          setStan({ zdjecia, blad: null });
        })
        .catch((err: unknown) => {
          console.error('[wor-zdjecia] could not read photos', err);
          if (aktywny) setStan({ zdjecia: [], blad: 'Nie udało się wczytać zdjęć z pamięci przeglądarki.' });
        });
    wczytaj();
    listeners.add(wczytaj);
    return () => {
      aktywny = false;
      listeners.delete(wczytaj);
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

export async function dataUrlNaBlob(dataUrl: string) {
  return (await fetch(dataUrl)).blob();
}
