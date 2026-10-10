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
 * Times are local wall-clock strings as Open-Meteo returns them with
 * `timezone=Europe/Madrid` ("2026-10-11T15:45"). They are read as minutes on
 * a naive clock (no time zone), so nothing here depends on the browser's.
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
  data: string;
  od: string;
  do: string;
  /** 0–100: how good the conditions look by the rules above. */
  ocena: number;
  /** Short reasons in Polish, best first. */
  powody: string[];
  /** For the Marismas: the high water this window leads up to. */
  przyplyw?: string;
};

/** Minutes on a naive clock from "YYYY-MM-DDTHH:MM". */
export const minuty = (czas: string) => {
  const [d, t] = czas.split('T');
  const [r, m, dz] = d.split('-').map(Number);
  const [g, mi] = t.split(':').map(Number);
  return Date.UTC(r, m - 1, dz, g, mi) / 60000;
};

/** "YYYY-MM-DDTHH:MM" from minutes on the same naive clock. */
export const zMinut = (n: number) => new Date(n * 60000).toISOString().slice(0, 16);

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
  let ile = 0;
  g.czas.forEach((c, i) => {
    const m = minuty(c);
    if (m < od - 30 || m > doMin) return;
    ile++;
    wiatr = Math.max(wiatr, g.wiatr[i] ?? 0);
    opad += g.opad[i] ?? 0;
    if (g.kierunek[i] !== null && zeWschodu(g.kierunek[i] as number)) wschodnie++;
  });
  return { wiatr, opad, lewant: ile > 0 && wschodnie / ile >= 0.5, ile };
}

/** Daylight of a date: from half an hour after sunrise (light enough to see colours) to sunset. */
function dzien(p: Prognoza, data: string) {
  const i = p.dni.data.indexOf(data);
  if (i < 0) return null;
  return { od: minuty(p.dni.wschod[i]) + 30, do: minuty(p.dni.zachod[i]) };
}

const ogranicz = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/** Rain and wind take points off any window; a light Levante adds them where raptors pass. */
function pogoda(p: Prognoza, od: number, doMin: number, powody: string[], lewantPomaga: boolean) {
  const w = pogodaWOknie(p, od, doMin);
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
    const data = e.czas.slice(0, 10);
    const swiatlo = dzien(p, data);
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
        ? `Woda rośnie przez całe okno w świetle dnia, pełny przypływ ok. ${godzina(e.czas)}.`
        : `Pełny przypływ ok. ${godzina(e.czas)}; część rosnącej wody przypada na zmrok albo noc.`,
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
    okna.push({ data, od: zMinut(od), do: zMinut(doMin), ocena: ogranicz(ocena), powody, przyplyw: e.czas });
  });
  return okna;
}

/**
 * La Janda: no tide, so each day has one window, late morning to
 * mid-afternoon, when the air has warmed and raptors soar and hunt over the
 * fields. It scores by rain and wind, with the Levante as a bonus.
 */
export function oknaLaJanda(p: Prognoza): Okno[] {
  return p.dni.data.flatMap((data) => {
    const swiatlo = dzien(p, data);
    if (!swiatlo) return [];
    const od = Math.max(minuty(`${data}T11:00`), swiatlo.od);
    const doMin = Math.min(minuty(`${data}T16:30`), swiatlo.do);
    const powody = ['Późny poranek i wczesne popołudnie: powietrze się nagrzało, drapieżniki szybują i polują nad polami.'];
    const ocena = 60 + pogoda(p, od, doMin, powody, true);
    return [{ data, od: zMinut(od), do: zMinut(doMin), ocena: ogranicz(ocena), powody }];
  });
}

/**
 * A site's windows from `teraz` on (local "YYYY-MM-DDTHH:MM"): those already
 * over are dropped, one under way starts now, and one with less than an hour
 * left is dropped too.
 */
export function oknaMiejsca(miejsce: MiejscePlanera, p: Prognoza, teraz: string): Okno[] {
  const t = minuty(teraz);
  const okna = miejsce === 'marismas-barbate' ? oknaMarismas(p) : oknaLaJanda(p);
  return okna.flatMap((o) => {
    if (minuty(o.do) - Math.max(t, minuty(o.od)) < 60) return [];
    return [minuty(o.od) < t ? { ...o, od: zMinut(t) } : o];
  });
}

/** The local wall-clock time in Spain now, as Open-Meteo's times are written. */
export function terazWHiszpanii(d = new Date()) {
  const cz = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );
  return `${cz.year}-${cz.month}-${cz.day}T${cz.hour}:${cz.minute}`;
}

/** The best windows first; on a tie, the earlier one. */
export const najlepsze = (okna: Okno[], ile: number) =>
  [...okna].sort((a, b) => b.ocena - a.ocena || minuty(a.od) - minuty(b.od)).slice(0, ile);

/** The two Open-Meteo requests for a site, ten days from today. */
export function adresyPrognozy(miejsce: MiejscePlanera, dni = 10) {
  const m = MIEJSCA_PLANERA.find((x) => x.value === miejsce)!;
  const wspolne = `latitude=${m.szer}&longitude=${m.dl}&timezone=Europe%2FMadrid&forecast_days=${dni}`;
  return {
    pogoda: `https://api.open-meteo.com/v1/forecast?${wspolne}&hourly=wind_speed_10m,wind_direction_10m,precipitation&daily=sunrise,sunset`,
    plywy: m.plywy ? `https://marine-api.open-meteo.com/v1/marine?${wspolne}&minutely_15=sea_level_height_msl` : null,
  };
}

/** The two responses as a Prognoza; null when they do not have the expected shape. */
export function prognozaZOdpowiedzi(pogoda: unknown, plywy: unknown | null): Prognoza | null {
  const p = pogoda as {
    hourly?: { time?: string[]; wind_speed_10m?: (number | null)[]; wind_direction_10m?: (number | null)[]; precipitation?: (number | null)[] };
    daily?: { time?: string[]; sunrise?: string[]; sunset?: string[] };
  };
  const h = p?.hourly;
  const d = p?.daily;
  if (!h?.time || !h.wind_speed_10m || !h.wind_direction_10m || !h.precipitation || !d?.time || !d.sunrise || !d.sunset) return null;
  const wynik: Prognoza = {
    godzinowa: { czas: h.time, wiatr: h.wind_speed_10m, kierunek: h.wind_direction_10m, opad: h.precipitation },
    dni: { data: d.time, wschod: d.sunrise, zachod: d.sunset },
  };
  if (plywy !== null) {
    const m = (plywy as { minutely_15?: { time?: string[]; sea_level_height_msl?: (number | null)[] } })?.minutely_15;
    if (!m?.time || !m.sea_level_height_msl) return null;
    wynik.plywy = { czas: m.time, poziom: m.sea_level_height_msl };
  }
  return wynik;
}
