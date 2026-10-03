import { ImageResponse } from 'next/og';
import { KOCIOL_KARTY, ZNAK } from '@/lib/rysunki';
import { obrys, POZA_SZYBOWANIE, ramka, sciezka } from '@/lib/sylwetka';
import { POZY, SYLWETKI } from '@/lib/sylwetki';

/**
 * The card a link to the course shows when shared (LinkedIn, messengers):
 * the dusk sky of the home page with a kettle of raptors drawn by the same
 * silhouette engine, the opening title and the author. Drawn once, at build.
 */

export const alt =
  'Niebo o zmierzchu z krążącymi sylwetkami ptaków drapieżnych i tytułem „Naucz się czytać niebo”. World of Raptors, kurs Konstancji Tanjgi.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const MARKA = 'World of Raptors';
const TYTUL = ['Naucz się', 'czytać niebo'];
const PODTYTUL = 'Kurs o drapieżnikach dziennych i nocnych, od polskich pól po Cieśninę Gibraltarską';
const AUTORKA = 'Konstancja Tanjga';

// Every font gets every letter on the card, so moving a line to the other
// font cannot leave a letter out (ImageResponse would quietly draw it in a
// fallback face instead).
const WSZYSTKIE_LITERY = [MARKA, ...TYTUL, PODTYTUL, AUTORKA].join('');

/**
 * A Google font as TrueType (ImageResponse cannot read woff2), subset to the
 * card's letters, fetched once at build like next/font's own fonts. Any
 * failure stops the build: a card that failed later would fail every share.
 */
async function krojGoogle(rodzina: string) {
  const zGoogle = (adres: string) => fetch(adres, { cache: 'force-cache', signal: AbortSignal.timeout(15_000) });
  const adres = `https://fonts.googleapis.com/css2?family=${rodzina}&text=${encodeURIComponent(WSZYSTKIE_LITERY)}`;
  const odpowiedzCss = await zGoogle(adres);
  if (!odpowiedzCss.ok) throw new Error(`opengraph-image: Google Fonts odpowiedział ${odpowiedzCss.status} dla ${rodzina}`);
  const css = await odpowiedzCss.text();
  const plik = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
  if (!plik) throw new Error(`opengraph-image: Google Fonts nie zwrócił pliku TTF dla ${rodzina}: ${css.slice(0, 200)}`);
  const odpowiedz = await zGoogle(plik);
  if (!odpowiedz.ok) throw new Error(`opengraph-image: nie udało się pobrać kroju ${rodzina} (${odpowiedz.status})`);
  return odpowiedz.arrayBuffer();
}

/** A species' silhouette in its resting pose (POZY, else POZA_SZYBOWANIE), as Sylwetka.tsx draws the logo and the plates. */
function rysunek(id: string) {
  const ksztalt = SYLWETKI[id];
  if (!ksztalt) throw new Error(`opengraph-image: ${id} nie ma sylwetki`);
  const punkty = obrys(ksztalt, POZY[id] ?? POZA_SZYBOWANIE);
  const [x, y, w, h] = ramka(punkty);
  return { d: sciezka(punkty, 0.3), viewBox: `${x} ${y} ${w} ${h}`, proporcja: h / w };
}

export default async function ObrazDoUdostepniania() {
  const [poltawski, newsreader] = await Promise.all([krojGoogle('Poltawski+Nowy:wght@600'), krojGoogle('Newsreader:wght@400')]);
  const znak = rysunek(ZNAK);

  return new ImageResponse(
    (
      <div style={{ position: 'relative', display: 'flex', width: '100%', height: '100%', background: '#0a1018' }}>
        {/* The home page's dusk sky, its glow on the horizon behind the birds. The colours copy motyw.css
            (--wor-niebo-zmierzch, an sRGB stand-in for its oklch gradient, --wor-zar-horyzontu,
            --wor-cien-tekstu, --wor-scena-tekst, --wor-zloto, --wor-sylwetka): ImageResponse cannot
            read CSS variables, so a change to the palette is made in both places. */}
        <div
          style={{
            position: 'absolute',
            top: 0, right: 0, bottom: 0, left: 0,
            display: 'flex',
            backgroundImage: 'linear-gradient(180deg, #1c2c51 0%, #6b3f5c 38%, #a85556 66%, #f5bc69 100%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 0, right: 0, bottom: 0, left: 0,
            display: 'flex',
            // Fading to the glow's own colour: `transparent` would fade through black and darken the horizon.
            backgroundImage: 'radial-gradient(ellipse 70% 60% at 78% 112%, rgba(255, 186, 112, 0.55), rgba(255, 186, 112, 0) 70%)',
          }}
        />
        {KOCIOL_KARTY.map((p) => {
          const r = rysunek(p.id);
          return (
            <svg
              key={p.id}
              width={p.szer}
              height={p.szer * r.proporcja}
              viewBox={r.viewBox}
              style={{ position: 'absolute', left: p.x, top: p.y, transform: `rotate(${p.obrot}deg)`, opacity: p.krycie }}
            >
              <path d={r.d} fill="#0d131b" />
            </svg>
          );
        })}
        {/* A stronger version of the home page's reading shade (start.css .niebo::before): bone text stays AA anywhere on the card. */}
        <div
          style={{
            position: 'absolute',
            top: 0, right: 0, bottom: 0, left: 0,
            display: 'flex',
            backgroundImage: 'linear-gradient(90deg, rgba(4, 7, 14, 0.68) 0%, rgba(4, 7, 14, 0.5) 46%, transparent 72%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 0, right: 0, bottom: 0, left: 0,
            display: 'flex',
            backgroundImage: 'linear-gradient(0deg, rgba(4, 7, 14, 0.68) 0%, transparent 38%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 0, right: 0, bottom: 0, left: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '56px 72px 52px',
            color: '#f2eee6',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <svg width={52} height={52 * znak.proporcja} viewBox={znak.viewBox}>
              <path d={znak.d} fill="#f2eee6" />
            </svg>
            <span style={{ fontFamily: 'Poltawski Nowy', fontSize: 34, letterSpacing: '-0.01em' }}>{MARKA}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                fontFamily: 'Poltawski Nowy',
                fontSize: 108,
                lineHeight: 1,
                letterSpacing: '-0.022em',
              }}
            >
              {TYTUL.map((linia) => (
                <span key={linia}>{linia}</span>
              ))}
            </div>
            <span style={{ maxWidth: 600, fontFamily: 'Newsreader', fontSize: 31, lineHeight: 1.3 }}>{PODTYTUL}</span>
          </div>
          <span style={{ fontFamily: 'Poltawski Nowy', fontSize: 26, color: '#f5b75b' }}>{AUTORKA}</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Poltawski Nowy', data: poltawski, style: 'normal', weight: 600 },
        { name: 'Newsreader', data: newsreader, style: 'normal', weight: 400 },
      ],
    },
  );
}
