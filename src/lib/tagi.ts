import { oryginalZAtrybutu } from './zdjecia';

/*
 * The photo tags written in lessons and module overviews, read and checked
 * without rendering anything (the build runs these, see sprawdzSpojnosc in
 * content.ts; Markdown.tsx renders the same tags).
 */

/** HTML entities in a tag attribute (`&amp;`, `&#x27;`, `&quot;`…) as the characters they stand for. */
export function odkoduj(tekst: string) {
  const nazwane: Record<string, string> = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' };
  return tekst.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (calosc, kod: string) => {
    if (kod[0] !== '#') return nazwane[kod.toLowerCase()] ?? calosc;
    const punkt = kod[1].toLowerCase() === 'x' ? parseInt(kod.slice(2), 16) : Number(kod.slice(1));
    // Not a character: left as written, rather than stopping the build without saying where.
    return punkt <= 0x10ffff ? String.fromCodePoint(punkt) : calosc;
  });
}

/** A tag's attributes, decoded: `<zdjecie src="…" autor="…">` → { src, autor }. */
export function atrybuty(tag: string): Record<string, string> {
  return Object.fromEntries([...tag.matchAll(/([a-z-]+)="([^"]*)"/g)].map(([, k, v]) => [k, odkoduj(v)]));
}

const COMMONS = /^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\//;
const MINIATURA = /^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/thumb\//;
const STRONA = /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/;
const WLASNE = /^\/zdjecia\/[a-z0-9-]+\.(jpg|jpeg|png|webp)$/;
const NAJWIECEJ_W_GALERII = 6;

/** Commons thumbnails also come from thumb.wikimedia.org, the same files under another host. */
const zrodlo = (src: string) => src.replace(/^https:\/\/thumb\.wikimedia\.org\//, 'https://upload.wikimedia.org/');

/**
 * Everything wrong with the photo tags of one Markdown file, each problem
 * prefixed with the file and line: a photo from elsewhere than Commons or the
 * author's own folder; without alt, author, licence or size; from Commons
 * without its file page, or, for a Commons thumbnail, without its original's
 * size; a tag not written in lowercase on one line of its own with the closing
 * tag on the next (Markdown would wrap it in a paragraph, and a tag over
 * several lines would escape these checks); a gallery with anything but one
 * to six photos inside.
 */
export function problemyTagow(md: string, plik: string): string[] {
  const bledy: string[] = [];
  const linie = md.split('\n');
  const gdzie = (i: number) => `${plik}:${i + 1}`;

  for (let i = 0; i < linie.length; i++) {
    const linia = linie[i];
    // rehype reads a tag in capitals, or over several lines, just the same: neither may slip past.
    if ([...linia.matchAll(/<\/?zdjecie\b/gi)].some(([t]) => t !== t.toLowerCase())) {
      bledy.push(`${gdzie(i)}: znacznik zdjecie pisz małymi literami`);
    }
    if (/<zdjecie\b(?![^\n]*>)/i.test(linia)) {
      bledy.push(`${gdzie(i)}: <zdjecie> rozbity na kilka linii: cały znacznik ma stać w jednej`);
      continue;
    }
    for (const [tag] of linia.matchAll(/<zdjecie\b[^>]*>/gi)) {
      const a = atrybuty(tag);
      const src = zrodlo(a.src ?? '');
      if (linia.trim() !== tag || linie[i + 1]?.trim() !== '</zdjecie>') {
        // A ">" inside an attribute ends the tag early, and the rest reads as text.
        const wskazowka = linia.trim().startsWith(tag) && linia.trim().length > tag.length ? ' (znak > w atrybucie? zapisz go jako &gt;)' : '';
        bledy.push(`${gdzie(i)}: <zdjecie> ma stać sam w linii, a </zdjecie> w następnej${wskazowka}`);
      }
      if (!COMMONS.test(src) && !WLASNE.test(src)) bledy.push(`${gdzie(i)}: zdjęcie spoza Wikimedia Commons i /zdjecia/: ${a.src}`);
      for (const pole of ['alt', 'autor', 'licencja']) if (!a[pole]?.trim()) bledy.push(`${gdzie(i)}: <zdjecie> bez atrybutu ${pole}`);
      if (!(Number(a.width) > 0 && Number(a.height) > 0)) bledy.push(`${gdzie(i)}: <zdjecie> bez wymiarów width i height`);
      if (COMMONS.test(src) && !STRONA.test(a.strona ?? '')) bledy.push(`${gdzie(i)}: zdjęcie z Commons bez strony pliku (strona="https://commons.wikimedia.org/wiki/File:…")`);
      if (MINIATURA.test(src) && !oryginalZAtrybutu(a.oryginal ?? '')) {
        bledy.push(`${gdzie(i)}: miniatura z Commons bez oryginal="SZERxWYS" (python3 scripts/commons.py rozmiary-lekcji)`);
      }
    }
  }

  let otwarta: number | null = null;
  let zdjecWGalerii = 0;
  for (let i = 0; i < linie.length; i++) {
    const t = linie[i].trim();
    if (/<\/?galeria\b/.test(t) && t !== '<galeria>' && t !== '</galeria>') {
      bledy.push(`${gdzie(i)}: <galeria> i </galeria> mają stać same w linii`);
      continue;
    }
    if (t === '<galeria>') {
      if (otwarta !== null) bledy.push(`${gdzie(i)}: galeria w galerii`);
      otwarta = i;
      zdjecWGalerii = 0;
    } else if (t === '</galeria>') {
      if (otwarta === null) bledy.push(`${gdzie(i)}: </galeria> bez <galeria>`);
      else if (zdjecWGalerii < 1 || zdjecWGalerii > NAJWIECEJ_W_GALERII) {
        bledy.push(`${gdzie(otwarta)}: galeria ma ${zdjecWGalerii} zdjęć, a może mieć od 1 do ${NAJWIECEJ_W_GALERII}`);
      }
      otwarta = null;
    } else if (otwarta !== null && t) {
      if (t.startsWith('<zdjecie')) zdjecWGalerii++;
      else if (t !== '</zdjecie>') bledy.push(`${gdzie(i)}: w galerii mogą być tylko zdjęcia (<zdjecie>), a jest: ${t.slice(0, 40)}`);
    }
  }
  if (otwarta !== null) bledy.push(`${gdzie(otwarta)}: <galeria> bez </galeria>`);
  return bledy;
}
