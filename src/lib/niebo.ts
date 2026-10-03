/**
 * The sky over Warsaw at a given moment, for the home page's opening scene:
 * the sun's elevation from a standard low-precision solar position (good to
 * a fraction of a degree, plenty for choosing a colour of sky), and the part
 * of the day it means.
 */

export type PoraDnia = 'swit' | 'dzien' | 'zmierzch' | 'noc';

const WARSZAWA = { lat: 52.23, lon: 21.01 };
const RAD = Math.PI / 180;

/** Sun elevation in degrees and whether it is still rising (morning). */
export function slonce(kiedy: Date, { lat, lon } = WARSZAWA) {
  // Days since J2000.0 (2000-01-01 12:00 UTC).
  const d = (kiedy.getTime() - Date.UTC(2000, 0, 1, 12)) / 86_400_000;
  const g = (357.529 + 0.98560028 * d) * RAD;
  const q = 280.459 + 0.98564736 * d;
  const dlugoscEkl = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD;
  const nachylenie = (23.439 - 0.00000036 * d) * RAD;
  const deklinacja = Math.asin(Math.sin(nachylenie) * Math.sin(dlugoscEkl));
  const rektascensja = Math.atan2(Math.cos(nachylenie) * Math.sin(dlugoscEkl), Math.cos(dlugoscEkl));
  const gmst = (((18.697374558 + 24.06570982441908 * d) % 24) + 24) % 24;
  let katGodzinny = gmst * 15 * RAD + lon * RAD - rektascensja;
  katGodzinny = Math.atan2(Math.sin(katGodzinny), Math.cos(katGodzinny));
  const wysokosc = Math.asin(
    Math.sin(lat * RAD) * Math.sin(deklinacja) + Math.cos(lat * RAD) * Math.cos(deklinacja) * Math.cos(katGodzinny),
  );
  return { wysokosc: wysokosc / RAD, rano: katGodzinny < 0 };
}

/** Day while the sun is well up, dawn and dusk around the horizon, night below civil twilight. */
export function poraDnia(kiedy: Date): PoraDnia {
  const { wysokosc, rano } = slonce(kiedy);
  if (wysokosc > 8) return 'dzien';
  if (wysokosc > -6) return rano ? 'swit' : 'zmierzch';
  return 'noc';
}
