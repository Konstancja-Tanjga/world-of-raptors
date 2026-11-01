import type { StylLotu } from './sylwetki';

/*
 * Module A11 (Lot w praktyce): what each flight style looks like in the
 * field, and a falcon's stoop as simple physics. Pure, so the tests and the
 * build run it.
 */

/** Each flight style as the gallery names and explains it (the styles are the ones STYL_LOTU gives the species). */
export const OPIS_STYLU: Record<StylLotu, { nazwa: string; opis: string }> = {
  szybuje: { nazwa: 'Szybuje', opis: 'Krąży na nieruchomych, rozłożonych skrzydłach, prawie nie machając; oddycha tylko ogon.' },
  'kreci-ogonem': { nazwa: 'Kręci ogonem', opis: 'Szybuje i steruje długim, wciętym ogonem, który ciągle rozkłada, składa i przekręca.' },
  zawisa: { nazwa: 'Zawisa', opis: 'Stoi w miejscu w powietrzu: szybkie uderzenia skrzydeł, ogon szeroko rozłożony, głowa nieruchoma.' },
  'macha-i-szybuje': { nazwa: 'Macha i szybuje', opis: 'Kilka szybkich uderzeń, krótki ślizg, i znowu: rytm ptaka lasu, który musi przyspieszyć w każdej chwili.' },
  szybki: { nazwa: 'Szybki lot', opis: 'Płytkie, szybkie uderzenia spiczastych skrzydeł, prawie bez szybowania: lot sokoła.' },
  kolysze: { nazwa: 'Kołysze się', opis: 'Leci nisko i wolno, ze skrzydłami uniesionymi w literę V, przechylając się z boku na bok.' },
};

/** A falcon of this mass (kg) in still air at sea level, as in Tucker's (1998) model of an ideal diving falcon. */
const G = 9.81;
const GESTOSC = 1.2;
/** Drag area C·S (m²) with wings spread flat and with wings fully tucked: the slider moves between them, evenly on a log scale. */
const OPOR_ROZLOZONY = 0.08;
const OPOR_ZLOZONY = 0.002;

/** The drag area at `zlozenie` from 0 (wings spread) to 1 (wings tucked against the body). */
export const powierzchniaOporu = (zlozenie: number) => OPOR_ROZLOZONY * (OPOR_ZLOZONY / OPOR_ROZLOZONY) ** Math.min(1, Math.max(0, zlozenie));

/**
 * A vertical dive: the top speed (where drag equals weight), and the time
 * and the height it takes to reach 90% of it. Simplified: no lift, still air,
 * constant air density.
 */
export function pikowanie(zlozenie: number, masa = 0.9) {
  const opor = powierzchniaOporu(zlozenie);
  const vMaks = Math.sqrt((2 * masa * G) / (GESTOSC * opor));
  const a = Math.atanh(0.9);
  return {
    vMaks,
    kmh: vMaks * 3.6,
    czas90: (vMaks / G) * a,
    wysokosc90: ((vMaks * vMaks) / G) * Math.log(Math.cosh(a)),
  };
}
