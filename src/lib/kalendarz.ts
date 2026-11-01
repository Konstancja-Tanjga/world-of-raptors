/**
 * The rules of B9's age and moult calendar, kept pure so they can be tested.
 * content/kalendarz-siewkowcow.json gives each species' autumn passage on
 * the Polish Baltic coast (mostly KULING's counts and catches at the Reda
 * mouth) in half-months, 0 = 1–15 July to 7 = 16–31 October: who passes
 * (adults or juveniles), in which plumage, and when numbers peak. The slider
 * moves by weeks, which are mapped to the half-month they mostly fall in.
 */

export const KROKI_KALENDARZA = 8;

export type OkresPrzelotu = {
  /** Half-months, inclusive. */
  od: number;
  do: number;
  kto: 'dorosle' | 'mlode';
  szata: string;
  liczebnosc?: 'nielicznie';
  /** The sources give the passage but not the ages; the split follows the general pattern. */
  przyblizone?: boolean;
  zrodla: string[];
};

export type GatunekKalendarza = { id: string; szczyt?: number[]; okresy: OkresPrzelotu[]; uwaga?: string };

export type KalendarzSiewkowcow = {
  kroki: string[];
  obszar: string;
  zrodla: { id: string; opis: string; url: string }[];
  gatunki: GatunekKalendarza[];
};

/** Weeks from 1 July to 31 October: the slider's steps. */
export const TYGODNIE = 18;
const PIERWSZY = Date.UTC(2026, 6, 1);
const DZIEN = 86_400_000;
const MIESIACE = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];

/** The days a week covers (the last one ends on 31 October). */
export function dniTygodnia(tydzien: number): [Date, Date] {
  const od = new Date(PIERWSZY + tydzien * 7 * DZIEN);
  const koniec = Date.UTC(2026, 9, 31);
  return [od, new Date(Math.min(PIERWSZY + (tydzien * 7 + 6) * DZIEN, koniec))];
}

/** A week as the slider reads it out: "29 lipca – 4 sierpnia", "5–11 sierpnia". */
export function opisTygodnia(tydzien: number): string {
  const [od, doDnia] = dniTygodnia(tydzien);
  const m = (d: Date) => MIESIACE[d.getUTCMonth()];
  return od.getUTCMonth() === doDnia.getUTCMonth()
    ? `${od.getUTCDate()}–${doDnia.getUTCDate()} ${m(doDnia)}`
    : `${od.getUTCDate()} ${m(od)} – ${doDnia.getUTCDate()} ${m(doDnia)}`;
}

/** The half-month a week mostly falls in: the one holding its middle day. */
export function krokTygodnia(tydzien: number): number {
  const [od, doDnia] = dniTygodnia(tydzien);
  const srodek = new Date((od.getTime() + doDnia.getTime()) / 2);
  return (srodek.getUTCMonth() - 6) * 2 + (srodek.getUTCDate() > 15 ? 1 : 0);
}

/** What a species shows in a half-month: the periods running then (adults first) and whether passage peaks. */
export function stanGatunku(g: GatunekKalendarza, krok: number) {
  const okresy = g.okresy.filter((o) => o.od <= krok && krok <= o.do).sort((a, b) => (a.kto === b.kto ? 0 : a.kto === 'dorosle' ? -1 : 1));
  return { okresy, szczyt: Boolean(g.szczyt?.includes(krok)) && okresy.length > 0 };
}

/** Everything wrong with the calendar's data: steps out of range, an unknown source, a period ending before it starts. */
export function problemyKalendarza(k: KalendarzSiewkowcow): string[] {
  const bledy: string[] = [];
  if (k.kroki?.length !== KROKI_KALENDARZA) bledy.push(`kroki: ma być ${KROKI_KALENDARZA}, a jest ${k.kroki?.length ?? 0}`);
  const zrodla = new Set((k.zrodla ?? []).map((z) => z.id));
  const wZakresie = (n: number) => Number.isInteger(n) && n >= 0 && n < KROKI_KALENDARZA;
  if (!k.gatunki?.length) bledy.push('gatunki: kalendarz bez gatunków');
  const widziane = new Set<string>();
  for (const g of k.gatunki ?? []) {
    if (widziane.has(g.id)) bledy.push(`${g.id}: gatunek powtórzony`);
    widziane.add(g.id);
    if (!g.okresy?.length) {
      bledy.push(`${g.id}: brak okresów`);
      continue;
    }
    for (const s of g.szczyt ?? []) {
      if (!wZakresie(s)) bledy.push(`${g.id}: szczyt ${s} poza krokami 0–${KROKI_KALENDARZA - 1}`);
      // stanGatunku shows a peak only where some period runs; one elsewhere would never show.
      else if (!g.okresy.some((o) => o.od <= s && s <= o.do)) bledy.push(`${g.id}: szczyt ${s} poza wszystkimi okresami`);
    }
    for (const o of g.okresy) {
      if (!wZakresie(o.od) || !wZakresie(o.do) || o.od > o.do) bledy.push(`${g.id}: okres ${o.od}–${o.do} poza krokami albo odwrócony`);
      if (o.kto !== 'dorosle' && o.kto !== 'mlode') bledy.push(`${g.id}: kto „${o.kto}”`);
      if (!o.szata?.trim()) bledy.push(`${g.id}: okres ${o.od}–${o.do} bez opisu szaty`);
      for (const z of o.zrodla ?? []) if (!zrodla.has(z)) bledy.push(`${g.id}: nieznane źródło „${z}”`);
      if (!o.zrodla?.length) bledy.push(`${g.id}: okres ${o.od}–${o.do} bez źródła`);
    }
  }
  return bledy;
}
