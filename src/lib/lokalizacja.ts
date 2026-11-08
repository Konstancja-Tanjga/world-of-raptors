/**
 * The phone's position, once, for "Gdzie stanąć", "Moje miejsca" and the
 * checklist's place field. It never leaves the browser.
 *
 * The browser's own timeout starts only once access is allowed, and a prompt
 * closed without an answer calls neither callback, so a watchdog gives up
 * once the browser's time and `NA_ZGODE_MS` for the prompt have passed.
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

/** How long the permission prompt may take before the watchdog gives up. */
export const NA_ZGODE_MS = 30_000;
const PRECYZYJNIE = { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 };
const ZGRUBNIE = { enableHighAccuracy: false, timeout: 15_000, maximumAge: 10 * 60 * 1000 };

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
    const opcje = dokladnie ? PRECYZYJNIE : ZGRUBNIE;
    const czuwanie = setTimeout(() => {
      console.warn('[lokalizacja] no answer from the browser');
      koniec(() => reject(new BladLokalizacji('cisza')));
    }, opcje.timeout + NA_ZGODE_MS);
    try {
      navigator.geolocation.getCurrentPosition(
        (p) => koniec(() => resolve({ szer: p.coords.latitude, dl: p.coords.longitude, dokladnosc: p.coords.accuracy })),
        (err) => {
          console.error('[lokalizacja] failed', err.code, err.message);
          const powod: PowodBledu =
            err.code === err.PERMISSION_DENIED ? 'odmowa' : err.code === err.POSITION_UNAVAILABLE ? 'niedostepna' : 'czas';
          koniec(() => reject(new BladLokalizacji(powod, err.message)));
        },
        opcje,
      );
    } catch (err) {
      // Some browsers throw at once (e.g. outside a secure context) instead of calling back.
      console.error('[lokalizacja] the browser refused the request', err);
      koniec(() => reject(new BladLokalizacji('niedostepna', String(err))));
    }
  });
}

/** What to tell the owner when `pobierzPozycje` failed; an error that is not about the location is logged, not passed off as one. */
export function opisBleduLokalizacji(err: unknown) {
  if (err instanceof BladLokalizacji) return OPIS_BLEDU_LOKALIZACJI[err.powod];
  console.error('[lokalizacja] unexpected error', err);
  return 'Nie udało się ustalić lokalizacji.';
}
