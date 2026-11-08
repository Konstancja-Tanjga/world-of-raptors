/**
 * The phone's position, once, for "Gdzie stanąć", "Moje miejsca" and the
 * checklist's place field. It never leaves the browser.
 *
 * The browser's own timeout starts only once access is allowed, and a prompt
 * closed without an answer calls neither callback, so a watchdog gives up
 * after `CZEKANIE_MS` with its own reason.
 */
import type { Wspolrzedne } from './punkty';

export type Pozycja = Wspolrzedne & { /** Metres, as the browser estimates them. */ dokladnosc: number };

export type PowodBledu = 'brak' | 'odmowa' | 'niedostepna' | 'czas' | 'cisza';

export class BladLokalizacji extends Error {
  name = 'BladLokalizacji';
  powod: PowodBledu;
  constructor(powod: PowodBledu, opis: string = powod) {
    super(opis);
    this.powod = powod;
  }
}

/** What to tell the owner for each reason, in Polish. */
export const OPIS_BLEDU_LOKALIZACJI: Record<PowodBledu, string> = {
  brak: 'Ta przeglądarka nie podaje lokalizacji.',
  odmowa: 'Przeglądarka nie dała dostępu do lokalizacji. Możesz na to pozwolić w ustawieniach strony.',
  niedostepna: 'Przeglądarka nie zna teraz Twojej lokalizacji (sprawdź, czy usługi lokalizacji są włączone).',
  czas: 'Przeglądarka nie zdążyła ustalić, gdzie jesteś. Spróbuj jeszcze raz.',
  cisza: 'Przeglądarka nie odpowiedziała na prośbę o lokalizację. Spróbuj jeszcze raz.',
};

/** How long to wait for the browser, the permission prompt included. */
export const CZEKANIE_MS = 30_000;

/**
 * The current position. `dokladnie` asks for GPS (a place to save), which takes
 * longer; without it a recent, coarser fix will do (distances to the points).
 */
export function pobierzPozycje({ dokladnie = false }: { dokladnie?: boolean } = {}): Promise<Pozycja> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      reject(new BladLokalizacji('brak'));
      return;
    }
    let skonczone = false;
    // Both callbacks and the watchdog run later, after `czuwanie` is set.
    const koniec = (f: () => void) => {
      if (skonczone) return;
      skonczone = true;
      clearTimeout(czuwanie);
      f();
    };
    const czuwanie = setTimeout(() => koniec(() => reject(new BladLokalizacji('cisza'))), CZEKANIE_MS);
    navigator.geolocation.getCurrentPosition(
      (p) => koniec(() => resolve({ szer: p.coords.latitude, dl: p.coords.longitude, dokladnosc: p.coords.accuracy })),
      (err) => {
        console.error('[lokalizacja] failed', err.code, err.message);
        const powod: PowodBledu =
          err.code === err.PERMISSION_DENIED ? 'odmowa' : err.code === err.POSITION_UNAVAILABLE ? 'niedostepna' : 'czas';
        koniec(() => reject(new BladLokalizacji(powod, err.message)));
      },
      dokladnie
        ? { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 }
        : { enableHighAccuracy: false, timeout: 15_000, maximumAge: 10 * 60 * 1000 },
    );
  });
}
