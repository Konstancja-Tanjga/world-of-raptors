import type { NagranieLekcji } from './types';

/*
 * The rules a recording in content/nagrania.json must meet, without reading
 * any file (the build runs them, see sprawdzSpojnosc in content.ts).
 */

const ID = /^[a-z]+(-[a-z]+)*\/[a-z0-9]+(-[a-z0-9]+)*$/;
/** An MP3 on Commons, or Commons' MP3 transcode of an Ogg, WAV or FLAC (Safari plays no Ogg, a WAV is large). */
const COMMONS = /^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/(?:[0-9a-f]\/[0-9a-f]{2}\/[^/]+\.mp3|transcoded\/[0-9a-f]\/[0-9a-f]{2}\/([^/]+\.(?:ogg|oga|wav|flac))\/\1\.mp3)$/i;
const WLASNE = /^\/nagrania\/[a-z0-9-]+\.mp3$/;
const STRONA_COMMONS = /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/;
const LICENCJA = /^(CC0( 1\.0)?|Public domain|PD|CC BY(-SA)? [0-9.]+)$/i;
const BEZ_WARUNKOW = /^(CC0|Public domain|PD)/i;
const ADRES_LICENCJI = /^https?:\/\/creativecommons\.org\//;

/**
 * Everything wrong with one recording: an id not shaped `gatunek/opis` or
 * not starting with its species; a species not in the atlas (`lat` is its
 * Latin name, undefined when missing); a file from elsewhere than Commons or
 * public/nagrania/ (a file served from there must name its xeno-canto page,
 * and `istnieje` says whether it is on disk), or an Ogg or WAV not through
 * Commons' MP3 transcode; a licence that is not free, or a CC BY one without
 * its licence's address; no author, description or length; an xeno-canto
 * mirror on Commons whose title names another species.
 */
export function problemyNagrania(
  id: string,
  n: NagranieLekcji,
  lat: string | undefined,
  istnieje: (sciezka: string) => boolean = () => true,
): string[] {
  const bledy: string[] = [];
  const gdzie = `nagrania.json: ${id}`;
  if (!ID.test(id) || id.split('/')[0] !== n.gatunek) bledy.push(`${gdzie}: id ma mieć postać „gatunek/opis”, z gatunkiem „${n.gatunek}”`);
  if (!lat) bledy.push(`${gdzie}: gatunku „${n.gatunek}” nie ma w atlasie`);
  if (COMMONS.test(n.src)) {
    if (!STRONA_COMMONS.test(n.strona)) bledy.push(`${gdzie}: plik z Commons bez strony pliku`);
    // An xeno-canto mirror's title starts with the binomial ("Strix aluco - Tawny Owl XC583836.mp3").
    const tytul = decodeURIComponent(n.strona.replace(STRONA_COMMONS, '')).replace(/_/g, ' ');
    if (lat && /XC\d+/.test(tytul) && !tytul.startsWith(lat)) bledy.push(`${gdzie}: tytuł pliku „${tytul}” nie zaczyna się od ${lat}`);
  } else if (WLASNE.test(n.src)) {
    if (!n.xc || n.strona !== `https://xeno-canto.org/${n.xc}`) bledy.push(`${gdzie}: plik z public/nagrania/ ma mieć xc i stronę https://xeno-canto.org/<xc>`);
    if (!istnieje(n.src)) bledy.push(`${gdzie}: nie ma pliku public${n.src}`);
  } else {
    bledy.push(`${gdzie}: nagranie spoza Wikimedia Commons i public/nagrania/: ${n.src}`);
  }
  if (!LICENCJA.test(n.licencja ?? '')) bledy.push(`${gdzie}: licencja „${n.licencja}” nie jest wolna (CC0, domena publiczna, CC BY, CC BY-SA)`);
  else if (!BEZ_WARUNKOW.test(n.licencja) && !ADRES_LICENCJI.test(n.licencjaUrl ?? '')) bledy.push(`${gdzie}: licencja ${n.licencja} bez adresu (licencjaUrl), a podpis ma do niej linkować`);
  if (!n.autor?.trim()) bledy.push(`${gdzie}: brak autora`);
  if (!n.opis?.trim()) bledy.push(`${gdzie}: brak opisu, co słychać`);
  if (!(n.sekundy > 0)) bledy.push(`${gdzie}: brak długości (sekundy)`);
  if (n.xc !== undefined && !(Number.isInteger(n.xc) && n.xc > 0)) bledy.push(`${gdzie}: xc ma być numerem z xeno-canto`);
  return bledy;
}
