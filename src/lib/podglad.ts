/*
 * The photo viewer's rules (PodgladZdjec.tsx), without the browser: what a
 * photo carries to the viewer, how the arrows step through a group, and the
 * `sizes` a photo asks the browser for in each place it appears.
 */

/** What the viewer shows: the photo at full size with its caption and credit. */
export type DanePodgladu = {
  src: string;
  srcSet?: string;
  width: number;
  height: number;
  alt: string;
  podpis?: string;
  autor: string;
  licencja: string;
  licencjaUrl?: string;
  strona?: string;
};

/** What Photo hands the viewer for one photo (written into its button's `data-podglad`). */
export function danePodgladu(
  z: { src: string; width: number; height: number; autor: string; licencja: string; licencjaUrl?: string; strona?: string },
  alt: string,
  podpis: string | undefined,
  srcSet: string | undefined,
): DanePodgladu {
  return {
    src: z.src,
    srcSet,
    width: z.width,
    height: z.height,
    alt,
    podpis,
    autor: z.autor,
    licencja: z.licencja,
    licencjaUrl: z.licencjaUrl || undefined,
    strona: z.strona || undefined,
  };
}

const tekst = (v: unknown) => (typeof v === 'string' && v.trim() ? v : undefined);
const liczba = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : undefined);

/** Reads a photo's `data-podglad`; null when it is not one Photo wrote, so the click does nothing. */
export function odczytajPodglad(json: string | undefined): DanePodgladu | null {
  if (!json) return null;
  let d: Record<string, unknown>;
  try {
    const v: unknown = JSON.parse(json);
    if (!v || typeof v !== 'object') return null;
    d = v as Record<string, unknown>;
  } catch {
    return null;
  }
  const src = tekst(d.src);
  const width = liczba(d.width);
  const height = liczba(d.height);
  const autor = tekst(d.autor);
  const licencja = tekst(d.licencja);
  if (!src || !width || !height || !autor || !licencja) return null;
  return {
    src,
    srcSet: tekst(d.srcSet),
    width,
    height,
    alt: typeof d.alt === 'string' ? d.alt : '',
    podpis: tekst(d.podpis),
    autor,
    licencja,
    licencjaUrl: tekst(d.licencjaUrl),
    strona: tekst(d.strona),
  };
}

/**
 * The next index in a group of `ile` photos, wrapping round at the ends, so
 * neither button ever goes dead under the focus (the counter says where it is).
 */
export function krok(i: number, ile: number, o: -1 | 1): number {
  return ile > 0 ? (i + o + ile) % ile : 0;
}

/** The step an arrow key takes, or 0 for any other key. */
export function kierunekKlawisza(klawisz: string): -1 | 0 | 1 {
  if (klawisz === 'ArrowLeft') return -1;
  if (klawisz === 'ArrowRight') return 1;
  return 0;
}

/**
 * `sizes` for a lesson photo, approximate: the margin is 20rem from about
 * 76rem of window (70rem of article with the page's gutters) and 13 to 20rem
 * below that (it narrows again when the contents column appears, see
 * globals.css); a gallery spans the text and the margin, 57.5rem at most,
 * and each photo asks for its column's share (the main one of three, two
 * thirds). The smallest Commons step is 960 px anyway, so this only decides
 * when a sharper one is worth fetching. A photo outside a gallery is taken
 * to be in the margin, where every lesson photo outside one stands.
 */
export function rozmiaryZdjecia(miejsce: 'margines' | { galeria: number }): string {
  if (miejsce === 'margines') return '(min-width: 76rem) 20rem, (min-width: 56rem) 13rem, 100vw';
  const ile = miejsce.galeria;
  const kolumny = ile <= 1 ? 1 : ile === 3 ? 1.5 : ile <= 4 ? 2 : 3;
  return `(min-width: 76rem) ${Math.round(57 / kolumny)}rem, (min-width: 56rem) ${Math.round(50 / kolumny)}rem, 100vw`;
}
