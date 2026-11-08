/**
 * "Co tu zobaczę": the birds likely to be seen where I stand, from what
 * eBird's observers reported nearby in the last weeks, weighed by the weather
 * there now. No React and no browser APIs: the route (src/app/podpowiedzi)
 * fetches eBird and Open-Meteo and runs these rules, and tests run them on
 * sample answers.
 *
 * eBird's "recent nearby observations" give each species' latest report
 * within the radius, so how recently a bird was seen stands for how likely it
 * is: a bird reported this morning is probably still about, one last seen
 * four weeks ago probably not. The weather only moves the soaring raptors
 * (rain and strong wind keep them down; a dry, calm middle of the day gives
 * thermals); everything else is ranked by recency alone.
 */
import { odleglosc, type Wspolrzedne } from './punkty';

/** One record of eBird's `data/obs/geo/recent` answer, the fields used here. */
export type ObserwacjaEbird = {
  speciesCode: string;
  comName: string;
  sciName: string;
  locName: string;
  /** Local time of the observation, "YYYY-MM-DD HH:mm" or "YYYY-MM-DD". */
  obsDt: string;
  howMany?: number;
};

const jestSlownikiem = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** The usable records of an eBird answer; throws when the answer is not a list at all. */
export function obserwacjeZEbird(odp: unknown): ObserwacjaEbird[] {
  if (!Array.isArray(odp)) throw new Error('eBird: the answer is not a list');
  return odp.flatMap((o): ObserwacjaEbird[] => {
    if (!jestSlownikiem(o)) return [];
    const { speciesCode, comName, sciName, locName, obsDt, howMany } = o;
    if (typeof speciesCode !== 'string' || typeof comName !== 'string' || typeof sciName !== 'string' || typeof obsDt !== 'string') return [];
    if (!/^\d{4}-\d{2}-\d{2}/.test(obsDt)) return [];
    return [
      {
        speciesCode,
        comName,
        sciName,
        locName: typeof locName === 'string' ? locName : '',
        obsDt,
        ...(typeof howMany === 'number' && howMany > 0 ? { howMany } : {}),
      },
    ];
  });
}

/** Whole days between two local dates (YYYY-MM-DD…), never negative. */
export function dniOd(obsDt: string, dzis: string) {
  const dzien = (t: string) => {
    const [r, m, d] = t.slice(0, 10).split('-').map(Number);
    return Date.UTC(r, m - 1, d);
  };
  return Math.max(0, Math.round((dzien(dzis) - dzien(obsDt)) / 86_400_000));
}

/** The weather at the point now, as Open-Meteo's `current` gives it. */
export type Pogoda = {
  /** mm in the last 15 minutes (Open-Meteo's `current` comes from 15-minute data). */
  opad: number;
  /** km/h at 10 m. */
  wiatr: number;
  /** Degrees the wind blows from. */
  kierunek: number;
  /** Local hour (0–23). */
  godzina: number;
};

export function pogodaZOpenMeteo(odp: unknown): Pogoda {
  const c = jestSlownikiem(odp) && jestSlownikiem(odp.current) ? odp.current : null;
  const liczba = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  const opad = liczba(c?.precipitation);
  const wiatr = liczba(c?.wind_speed_10m);
  const kierunek = liczba(c?.wind_direction_10m);
  const godzina = typeof c?.time === 'string' ? Number(c.time.slice(11, 13)) : NaN;
  if (opad === null || wiatr === null || kierunek === null || !Number.isInteger(godzina)) {
    throw new Error('Open-Meteo: incomplete current weather');
  }
  return { opad, wiatr, kierunek, godzina };
}

/** Tarifa, for "near the Strait": where the course's wind rule (B3 lesson 1) applies. */
const TARIFA: Wspolrzedne = { szer: 36.0129, dl: -5.6058 };
const CIESNINA_KM = 40;

/** Rain worth a note, in mm per 15 minutes. */
const PADA = 0.1;

export type Warunki = {
  /** How the weather moves the soaring raptors (1: not at all). */
  mnoznik: number;
  /** What the weather means for watching, in my words. */
  uwagi: string[];
};

/** What the weather now means for the birds at `z`. */
export function warunki(p: Pogoda, z: Wspolrzedne): Warunki {
  let mnoznik = 1;
  const uwagi: string[] = [];
  // 0.1 mm in a quarter of an hour: light rain, about 0.4 mm an hour.
  if (p.opad >= PADA) {
    mnoznik *= 0.6;
    uwagi.push('Pada: drapieżniki rzadko krążą, więcej ich siedzi. Ptaki wodne i siewkowce widać jak zwykle.');
  }
  if (p.wiatr >= 40) {
    mnoznik *= 0.8;
    uwagi.push('Silny wiatr: ptaki trzymają się zacisza, a szybujące latają nisko.');
  }
  if (p.opad < PADA && p.wiatr < 30 && p.godzina >= 10 && p.godzina <= 16) {
    mnoznik *= 1.2;
    uwagi.push('Sucho i spokojnie w środku dnia: dobre termiki, czas na krążące drapieżniki.');
  } else if (p.godzina < 9 || p.godzina > 17) {
    mnoznik *= 0.85;
    uwagi.push('Rano i pod wieczór drapieżniki zwykle siedzą; to dobra pora na ptaki śpiewające i wodne.');
  }
  if (odleglosc(z, TARIFA) <= CIESNINA_KM && p.wiatr >= 15) {
    if (p.kierunek >= 45 && p.kierunek <= 135) {
      uwagi.push('Wieje lewant: przelot nad cieśniną przesuwa się na zachód, w stronę Tarify.');
    } else if (p.kierunek >= 225 && p.kierunek <= 315) {
      uwagi.push('Wieje poniente: przelot nad cieśniną przesuwa się na wschód, w stronę Algeciras i Gibraltaru.');
    }
  }
  return { mnoznik, uwagi };
}

/** A bird of the course or of the rest of Europe, found by its eBird code. */
export type PtakKursu = { id: string; pl: string; wKursie: boolean; szybujacy: boolean };

export type Podpowiedz = {
  kod: string;
  /** Polish name: the course's, else eBird's (asked for in Polish). */
  pl: string;
  lat: string;
  /** The checklist id, when the course knows the bird. */
  id?: string;
  /** It has a page in the atlas. */
  wKursie: boolean;
  /** Days since the latest report. */
  dni: number;
  liczba?: number;
  miejsce: string;
  /** eBird flags it as notable here (rare, or out of season). */
  rzadki: boolean;
  wynik: number;
};

/** Recency: a report today counts 1, a week ago about a half, four weeks ago a twentieth. */
const swiezosc = (dni: number) => Math.exp(-dni / 10);

/**
 * The birds to expect, most likely first: eBird's latest report per species,
 * ranked by how recent it is, a little by how many were seen, and for the
 * soaring raptors by the weather (`mnoznik`). `ptaki` maps eBird codes to the
 * course's birds; a bird it does not know keeps eBird's name.
 */
export function podpowiedzi(
  obserwacje: ObserwacjaEbird[],
  rzadkie: ReadonlySet<string>,
  dzis: string,
  ptaki: ReadonlyMap<string, PtakKursu>,
  mnoznik = 1,
): Podpowiedz[] {
  const najnowsze = new Map<string, ObserwacjaEbird>();
  for (const o of obserwacje) {
    // Hybrids, slashes and spuhs ("Accipiter sp.") are not species one can expect.
    if (/ sp\.|\/| x /.test(o.sciName)) continue;
    const byla = najnowsze.get(o.speciesCode);
    if (!byla || o.obsDt > byla.obsDt) najnowsze.set(o.speciesCode, o);
  }
  return [...najnowsze.values()]
    .map((o): Podpowiedz => {
      const ptak = ptaki.get(o.speciesCode);
      const dni = dniOd(o.obsDt, dzis);
      const wynik = swiezosc(dni) * (1 + 0.15 * Math.log10(1 + (o.howMany ?? 1))) * (ptak?.szybujacy ? mnoznik : 1);
      return {
        kod: o.speciesCode,
        pl: ptak?.pl ?? o.comName,
        lat: o.sciName,
        ...(ptak ? { id: ptak.id } : {}),
        wKursie: ptak?.wKursie ?? false,
        dni,
        ...(o.howMany ? { liczba: o.howMany } : {}),
        miejsce: o.locName,
        rzadki: rzadkie.has(o.speciesCode),
        wynik,
      };
    })
    .sort((a, b) => b.wynik - a.wynik || a.pl.localeCompare(b.pl, 'pl'));
}

/** Whether a point is already rounded as `zaokraglij` rounds it: the route takes only such points, so one place is one cache entry. */
export const jestZaokraglony = (p: Wspolrzedne) => {
  const z = zaokraglij(p);
  return z.szer === p.szer && z.dl === p.dl;
};

/** A point rounded to about a kilometre: what leaves the phone, and what the answers are cached by. */
export const zaokraglij = (p: Wspolrzedne): Wspolrzedne => ({ szer: Math.round(p.szer * 100) / 100, dl: Math.round(p.dl * 100) / 100 });

/** How far eBird is asked to look: km and days. */
export const PROMIEN_KM = 25;
export const DNI_WSTECZ = 30;

export const adresyZrodel = (p: Wspolrzedne) => {
  const geo = `lat=${p.szer}&lng=${p.dl}&dist=${PROMIEN_KM}`;
  return {
    ostatnie: `https://api.ebird.org/v2/data/obs/geo/recent?${geo}&back=${DNI_WSTECZ}&sppLocale=pl`,
    rzadkie: `https://api.ebird.org/v2/data/obs/geo/recent/notable?${geo}&back=14&detail=simple`,
    pogoda: `https://api.open-meteo.com/v1/forecast?latitude=${p.szer}&longitude=${p.dl}&current=precipitation,wind_speed_10m,wind_direction_10m&timezone=auto`,
  };
};

/** "dziś", "wczoraj", "3 dni temu". */
export const kiedySlownie = (dni: number) => (dni === 0 ? 'dziś' : dni === 1 ? 'wczoraj' : `${dni} dni temu`);
