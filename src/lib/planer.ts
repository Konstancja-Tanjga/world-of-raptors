/**
 * "Kiedy jechać": the best times of the coming days to be at a site, from a
 * forecast of the tide (Open-Meteo Marine) and the weather (Open-Meteo). No
 * directive and no browser APIs, so the rules can be tested; the page fetches
 * the forecast (PlanerWyjazdu.tsx).
 *
 * The rules follow the course: in the Marismas, be there while the tide rises
 * towards high water (B6 lesson 2: two or three hours before it, when the
 * water pushes the waders towards the shore), never at full low water; at La
 * Janda, which has no tide, raptors fly once the day has warmed up and a
 * strong Levante pushes the passage west. They are rules of thumb, not a
 * count of birds, and the page says so.
 *
 * Times are asked for in UTC (`timezone=GMT`) and counted in UTC minutes:
 * with `timezone=Europe/Madrid`, Open-Meteo writes the whole forecast in the
 * offset of its first day, so after the clock change (the last Sunday of
 * October and of March) every time would be an hour off. Only what is shown,
 * and the dates of days, are Madrid wall-clock, through `naMadryt()` (Intl
 * knows the clock changes), so nothing depends on the browser's time zone.
 */

export type MiejscePlanera = 'marismas-barbate' | 'la-janda';

export const MIEJSCA_PLANERA: { value: MiejscePlanera; label: string; szer: number; dl: number; plywy: boolean }[] = [
  // The open water off the river mouth: the marine model's nearest sea cell.
  { value: 'marismas-barbate', label: 'Marismas del Barbate', szer: 36.18, dl: -5.93, plywy: true },
  { value: 'la-janda', label: 'La Janda', szer: 36.25, dl: -5.85, plywy: false },
];

/** The forecast the rules need, as the two Open-Meteo responses give it. */
export type Prognoza = {
  /** Sea level every 15 minutes (metres); absent for a site without tide. */
  plywy?: { czas: string[]; poziom: (number | null)[] };
  /** Hourly wind (km/h, degrees it blows from) and rain (mm). */
  godzinowa: { czas: string[]; wiatr: (number | null)[]; kierunek: (number | null)[]; opad: (number | null)[] };
  /** Each day's sunrise and sunset. */
  dni: { data: string[]; wschod: string[]; zachod: string[] };
};

export type Ekstremum = { czas: string; poziom: number; rodzaj: 'przyplyw' | 'odplyw' };

/** One recommended visit: when to be there, how good it looks and why. */
export type Okno = {
  /** Madrid date and wall-clock times ("YYYY-MM-DD", "YYYY-MM-DDTHH:MM"), for showing. */
  data: string;
  od: string;
  do: string;
  /** The same window in UTC minutes, for comparing. */
  start: number;
  koniec: number;
  /** 0–100: how good the conditions look by the rules above. */
  ocena: number;
  /** Short reasons in Polish, best first. */
  powody: string[];
  /** For the Marismas: the high water this window leads up to (Madrid wall-clock). */
  przyplyw?: string;
};

/** Minutes from "YYYY-MM-DDTHH:MM" read as UTC (as Open-Meteo writes times with `timezone=GMT`). */
export const minuty = (czas: string) => {
  const [d, t] = czas.split('T');
  const [r, m, dz] = d.split('-').map(Number);
  const [g, mi] = t.split(':').map(Number);
  return Date.UTC(r, m - 1, dz, g, mi) / 60000;
};

/** "YYYY-MM-DDTHH:MM" in UTC from minutes. */
export const zMinut = (n: number) => new Date(n * 60000).toISOString().slice(0, 16);

const ZEGAR_MADRYTU = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Madrid',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** UTC minutes as Madrid wall-clock, "YYYY-MM-DDTHH:MM", summer or winter time as it falls. */
export function naMadryt(n: number) {
  const cz = Object.fromEntries(ZEGAR_MADRYTU.formatToParts(new Date(n * 60000)).map((x) => [x.type, x.value]));
  return `${cz.year}-${cz.month}-${cz.day}T${cz.hour}:${cz.minute}`;
}

/** A Madrid wall-clock time on a date, in UTC minutes (Spain is UTC+1 or UTC+2; the offset is read off that date's noon). */
function zMadrytu(data: string, godz: string) {
  const naiwnie = minuty(`${data}T${godz}`);
  const przesuniecie = minuty(naMadryt(minuty(`${data}T12:00`))) - minuty(`${data}T12:00`);
  return naiwnie - przesuniecie;
}

/** "HH:MM" of a time string. */
export const godzina = (czas: string) => czas.slice(11, 16);

/**
 * High and low waters in a sea-level series: the turning points, each the
 * extreme of its stretch, so a flat top of two equal readings counts once.
 */
export function ekstremaPlywow(czas: string[], poziom: (number | null)[]): Ekstremum[] {
  const punkty = czas.flatMap((c, i) => (poziom[i] === null || poziom[i] === undefined ? [] : [{ c, h: poziom[i] as number }]));
  const wynik: Ekstremum[] = [];
  for (let i = 1; i < punkty.length - 1; i++) {
    const [a, b] = [punkty[i - 1].h, punkty[i].h];
    let j = i + 1;
    while (j < punkty.length - 1 && punkty[j].h === b) j++;
    const c = punkty[j].h;
    if (b > a && b > c) wynik.push({ czas: punkty[i].c, poziom: b, rodzaj: 'przyplyw' });
    else if (b < a && b < c) wynik.push({ czas: punkty[i].c, poziom: b, rodzaj: 'odplyw' });
    i = j - 1;
  }
  return wynik;
}

/** The Levante: wind from the east (between NE and SE). */
const zeWschodu = (st: number) => st >= 45 && st <= 135;

/** Wind and rain over a stretch of hours. */
function pogodaWOknie(p: Prognoza, od: number, doMin: number) {
  const g = p.godzinowa;
  let wiatr = 0;
  let opad = 0;
  let wschodnie = 0;
  // Hours with a forecast: a missing value is unknown, not calm or dry.
  let ile = 0;
  g.czas.forEach((c, i) => {
    const m = minuty(c);
    if (m < od - 30 || m > doMin) return;
    if (g.wiatr[i] === null || g.opad[i] === null) return;
    ile++;
    wiatr = Math.max(wiatr, g.wiatr[i] as number);
    opad += g.opad[i] as number;
    if (g.kierunek[i] !== null && zeWschodu(g.kierunek[i] as number)) wschodnie++;
  });
  return { wiatr, opad, lewant: ile > 0 && wschodnie / ile >= 0.5, ile };
}

/** Daylight of a Madrid date, in UTC minutes: from half an hour after sunrise (light enough to see colours) to sunset. */
function dzien(p: Prognoza, data: string) {
  const i = p.dni.wschod.findIndex((w) => naMadryt(minuty(w)).startsWith(data));
  if (i < 0) return null;
  return { od: minuty(p.dni.wschod[i]) + 30, do: minuty(p.dni.zachod[i]) };
}

/** A window as the page gets it: Madrid wall-clock for showing, UTC minutes for comparing. */
const okno = (od: number, doMin: number, ocena: number, powody: string[], przyplyw?: number): Okno => ({
  data: naMadryt(od).slice(0, 10),
  od: naMadryt(od),
  do: naMadryt(doMin),
  start: od,
  koniec: doMin,
  ocena: Math.max(0, Math.min(100, Math.round(ocena))),
  powody,
  ...(przyplyw === undefined ? {} : { przyplyw: naMadryt(przyplyw) }),
});

/** Rain and wind take points off any window; a light Levante adds them where raptors pass. */
function pogoda(p: Prognoza, od: number, doMin: number, powody: string[], lewantPomaga: boolean) {
  const w = pogodaWOknie(p, od, doMin);
  if (w.ile === 0) {
    powody.push('Brak prognozy wiatru i opadów dla tych godzin: ocena tylko z pływów i pory dnia.');
    return -10;
  }
  let punkty = 0;
  if (w.opad >= 2) {
    punkty -= 35;
    powody.push('Prognoza deszczu: ptaki siedzą w ukryciu, a luneta moknie.');
  } else if (w.opad > 0.2) {
    punkty -= 12;
    powody.push('Możliwy przelotny deszcz.');
  }
  if (w.wiatr >= 40) {
    punkty -= 25;
    powody.push(`Bardzo silny wiatr (do ok. ${Math.round(w.wiatr)} km/h): obraz w lunecie drży, małe ptaki się chowają.`);
  } else if (w.wiatr >= 28) {
    punkty -= 10;
    powody.push(`Silny wiatr (do ok. ${Math.round(w.wiatr)} km/h): szukaj miejsca osłoniętego.`);
  }
  if (lewantPomaga && w.lewant && w.wiatr >= 15) {
    punkty += 12;
    powody.push('Wieje lewant: przelot ptaków szybujących przesuwa się na zachód, patrz też w niebo.');
  }
  return punkty;
}

/**
 * The Marismas: for each high water, the rising tide before it. The window
 * starts three hours before high water and ends an hour after, cut to
 * daylight. It scores by how much of the rising tide is in daylight, how big
 * the tide is (a bigger range pushes the birds further and closer), then rain
 * and wind.
 */
export function oknaMarismas(p: Prognoza): Okno[] {
  if (!p.plywy) return [];
  const ekstrema = ekstremaPlywow(p.plywy.czas, p.plywy.poziom);
  const okna: Okno[] = [];
  ekstrema.forEach((e, i) => {
    if (e.rodzaj !== 'przyplyw') return;
    const szczyt = minuty(e.czas);
    const swiatlo = dzien(p, naMadryt(szczyt).slice(0, 10));
    if (!swiatlo) return;
    const od = Math.max(szczyt - 180, swiatlo.od);
    const doMin = Math.min(szczyt + 60, swiatlo.do);
    // Less than an hour and a half of the rising tide in daylight is not worth the trip.
    const rosnieWDzien = Math.min(szczyt, swiatlo.do) - Math.max(szczyt - 180, swiatlo.od);
    if (rosnieWDzien < 90) return;
    const poprzedni = ekstrema.slice(0, i).reverse().find((x) => x.rodzaj === 'odplyw');
    const zakres = poprzedni ? e.poziom - poprzedni.poziom : null;
    const powody: string[] = [];
    let ocena = 45 + Math.round(((Math.min(rosnieWDzien, 180) - 90) / 90) * 25);
    powody.push(
      rosnieWDzien >= 170
        ? `Woda rośnie przez całe okno w świetle dnia, pełny przypływ ok. ${godzina(naMadryt(szczyt))}.`
        : `Pełny przypływ ok. ${godzina(naMadryt(szczyt))}; część rosnącej wody przypada na zmrok albo noc.`,
    );
    if (zakres !== null) {
      // Open-Meteo's range at Barbate: about 2.3 m at spring tides, 0.7 m at neaps.
      if (zakres >= 2) {
        ocena += 15;
        powody.push('Duży pływ: woda przyjdzie daleko i zepchnie ptaki blisko brzegu.');
      } else if (zakres < 1.3) {
        ocena -= 8;
        powody.push('Mały pływ: ptaki mogą zostać dalej na łachach.');
      }
    }
    ocena += pogoda(p, od, doMin, powody, true);
    okna.push(okno(od, doMin, ocena, powody, szczyt));
  });
  return okna;
}

/**
 * La Janda: no tide, so each day has one window, late morning to
 * mid-afternoon, when the air has warmed and raptors soar and hunt over the
 * fields. It scores by rain and wind, with the Levante as a bonus.
 */
export function oknaLaJanda(p: Prognoza): Okno[] {
  return p.dni.wschod.flatMap((wschod) => {
    const data = naMadryt(minuty(wschod)).slice(0, 10);
    const swiatlo = dzien(p, data);
    if (!swiatlo) return [];
    // 11:00 and 16:30 on Spain's clock, summer or winter time.
    const od = Math.max(zMadrytu(data, '11:00'), swiatlo.od);
    const doMin = Math.min(zMadrytu(data, '16:30'), swiatlo.do);
    const powody = ['Późny poranek i wczesne popołudnie: powietrze się nagrzało, drapieżniki szybują i polują nad polami.'];
    return [okno(od, doMin, 60 + pogoda(p, od, doMin, powody, true), powody)];
  });
}

/**
 * A site's windows from `teraz` on (UTC minutes, e.g. Date.now() / 60000):
 * those already over are dropped, one under way starts now, and one with less
 * than an hour left is dropped too.
 */
export function oknaMiejsca(miejsce: MiejscePlanera, p: Prognoza, teraz: number): Okno[] {
  const t = Math.floor(teraz);
  const okna = miejsce === 'marismas-barbate' ? oknaMarismas(p) : oknaLaJanda(p);
  return okna.flatMap((o) => {
    if (o.koniec - Math.max(t, o.start) < 60) return [];
    return [o.start < t ? { ...o, start: t, od: naMadryt(t) } : o];
  });
}

/** The best windows first; on a tie, the earlier one. */
export const najlepsze = (okna: Okno[], ile: number) => [...okna].sort((a, b) => b.ocena - a.ocena || a.start - b.start).slice(0, ile);

/** The two Open-Meteo requests for a site, ten days from today. */
export function adresyPrognozy(miejsce: MiejscePlanera, dni = 10) {
  const m = MIEJSCA_PLANERA.find((x) => x.value === miejsce)!;
  const wspolne = `latitude=${m.szer}&longitude=${m.dl}&timezone=GMT&forecast_days=${dni}`;
  return {
    pogoda: `https://api.open-meteo.com/v1/forecast?${wspolne}&hourly=wind_speed_10m,wind_direction_10m,precipitation&daily=sunrise,sunset`,
    plywy: m.plywy ? `https://marine-api.open-meteo.com/v1/marine?${wspolne}&minutely_15=sea_level_height_msl` : null,
  };
}

/** Why a forecast cannot be used: missing or broken data, as opposed to a forecast with no good time in it. */
export class NiepelnaPrognoza extends Error {
  name = 'NiepelnaPrognoza';
}

const tablica = (v: unknown, dlugosc?: number): v is unknown[] => Array.isArray(v) && (dlugosc === undefined || v.length === dlugosc);
const wartosci = (v: (number | null)[]) => v.filter((x) => typeof x === 'number').length;

/**
 * The two responses as a Prognoza. Throws NiepelnaPrognoza when they lack the
 * expected fields, when the series do not line up, or when they hold too few
 * values to plan on (a tide series of nulls, a wind forecast missing most
 * hours): the page then says the data is missing instead of giving advice
 * built on nothing.
 */
export function prognozaZOdpowiedzi(pogoda: unknown, plywy: unknown | null): Prognoza {
  const p = pogoda as {
    hourly?: { time?: unknown; wind_speed_10m?: unknown; wind_direction_10m?: unknown; precipitation?: unknown };
    daily?: { time?: unknown; sunrise?: unknown; sunset?: unknown };
  };
  const h = p?.hourly;
  const d = p?.daily;
  if (!h || !tablica(h.time) || !d || !tablica(d.time) || d.time.length === 0) throw new NiepelnaPrognoza('weather: no hourly or daily series');
  const n = h.time.length;
  if (!tablica(h.wind_speed_10m, n) || !tablica(h.wind_direction_10m, n) || !tablica(h.precipitation, n)) {
    throw new NiepelnaPrognoza('weather: series missing or of different lengths');
  }
  if (!tablica(d.sunrise, d.time.length) || !tablica(d.sunset, d.time.length) || ![...d.sunrise, ...d.sunset].every((x) => typeof x === 'string')) {
    throw new NiepelnaPrognoza('weather: sunrise or sunset missing');
  }
  const wiatr = h.wind_speed_10m as (number | null)[];
  const opad = h.precipitation as (number | null)[];
  if (wartosci(wiatr) < n / 2 || wartosci(opad) < n / 2) throw new NiepelnaPrognoza('weather: most hours have no forecast');
  const wynik: Prognoza = {
    godzinowa: { czas: h.time as string[], wiatr, kierunek: h.wind_direction_10m as (number | null)[], opad },
    dni: { data: d.time as string[], wschod: d.sunrise as string[], zachod: d.sunset as string[] },
  };
  if (plywy !== null) {
    const m = (plywy as { minutely_15?: { time?: unknown; sea_level_height_msl?: unknown } })?.minutely_15;
    if (!m || !tablica(m.time) || !tablica(m.sea_level_height_msl, m.time.length)) throw new NiepelnaPrognoza('tide: no series');
    const poziom = m.sea_level_height_msl as (number | null)[];
    const czas = m.time as string[];
    // Two days of readings every 15 minutes, and at least one high water in them.
    if (wartosci(poziom) < 2 * 96 || !ekstremaPlywow(czas, poziom).some((e) => e.rodzaj === 'przyplyw')) {
      throw new NiepelnaPrognoza('tide: too few readings to find high water');
    }
    wynik.plywy = { czas, poziom };
  }
  return wynik;
}
