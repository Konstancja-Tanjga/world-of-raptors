import { danePodgladu, odczytajPodglad } from '@/lib/podglad';
import type { Zdjecie } from '@/lib/types';
import { polozenie, srcSetCommons } from '@/lib/zdjecia';

/**
 * A photo with the attribution its licence requires: author, licence and,
 * for Wikimedia Commons files, a link back to the file page.
 *
 * Every photo but the small look-alike thumbnails opens full screen in the
 * photo viewer (PodgladZdjec, mounted by the page), uncropped, with the same
 * caption and credit; the button carries what the viewer needs (only pages
 * that mount the viewer may show a Photo). Commons thumbnails whose original
 * is at least 1280 px wide get a `srcset`, so the browser picks a sharp
 * thumbnail for the place the photo has (`sizes`).
 */
export function Photo({
  zdjecie,
  alt,
  podpis,
  maly = false,
  wazne = false,
  sizes = '(min-width: 56rem) 40rem, 100vw',
}: {
  zdjecie: Zdjecie;
  alt: string;
  podpis?: string;
  maly?: boolean;
  /** The page's main image (above the fold): load it first, not lazily. */
  wazne?: boolean;
  /** How wide the photo is shown, for choosing among the `srcset` widths. */
  sizes?: string;
}) {
  const srcSet = srcSetCommons(zdjecie);
  const obraz = (
    // eslint-disable-next-line @next/next/no-img-element -- Commons serves its own sizes; srcset picks one
    <img
      src={zdjecie.src}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={alt}
      width={zdjecie.width}
      height={zdjecie.height}
      loading={wazne ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={wazne ? 'high' : undefined}
      className="photo__img"
      style={{ objectPosition: polozenie(zdjecie) }}
    />
  );
  const podglad = JSON.stringify(danePodgladu(zdjecie, alt, podpis, srcSet));
  // Rendered at build: a photo the viewer would refuse (no author, licence or size) stops it here, not as a dead button.
  if (!maly && !odczytajPodglad(podglad)) throw new Error(`Photo: zdjęciu ${zdjecie.src} brakuje autora, licencji albo wymiarów`);
  return (
    <figure className={maly ? 'photo photo--small' : 'photo'}>
      {maly ? (
        obraz
      ) : (
        <button
          type="button"
          className="photo__powieksz"
          data-podglad={podglad}
          aria-label={`Powiększ zdjęcie${alt ? `: ${alt}` : ''}`}
          aria-haspopup="dialog"
        >
          {obraz}
        </button>
      )}
      <figcaption className="photo__caption">
        {podpis && <span className="photo__title">{podpis}</span>}
        {!maly && <Kredyt zdjecie={zdjecie} />}
      </figcaption>
    </figure>
  );
}

/** "Fot. author, licence, Wikimedia Commons", each linked where there is a page to link to. */
export function Kredyt({ zdjecie }: { zdjecie: { autor: string; licencja: string; licencjaUrl?: string; strona?: string } }) {
  return (
    <span>
      Fot. {zdjecie.autor},{' '}
      {zdjecie.licencjaUrl ? (
        <a href={zdjecie.licencjaUrl} target="_blank" rel="noreferrer">
          {zdjecie.licencja}
        </a>
      ) : (
        zdjecie.licencja
      )}
      {/* Own photos have no Commons page to credit. */}
      {zdjecie.strona && (
        <>
          ,{' '}
          <a href={zdjecie.strona} target="_blank" rel="noreferrer">
            Wikimedia Commons
          </a>
        </>
      )}
    </span>
  );
}
