import Image from 'next/image';
import type { Zdjecie } from '@/lib/types';
import { polozenie } from '@/lib/zdjecia';

/**
 * A photo with the attribution its licence requires: author, licence and,
 * for Wikimedia Commons files, a link back to the file page.
 */
export function Photo({
  zdjecie,
  alt,
  podpis,
  maly = false,
  wazne = false,
}: {
  zdjecie: Zdjecie;
  alt: string;
  podpis?: string;
  maly?: boolean;
  /** The page's main image (above the fold): load it first, not lazily. */
  wazne?: boolean;
}) {
  return (
    <figure className={maly ? 'photo photo--small' : 'photo'}>
      <Image
        src={zdjecie.src}
        alt={alt}
        width={zdjecie.width}
        height={zdjecie.height}
        loading={wazne ? 'eager' : 'lazy'}
        fetchPriority={wazne ? 'high' : undefined}
        className="photo__img"
        style={{ objectPosition: polozenie(zdjecie) }}
      />
      <figcaption className="photo__caption">
        {podpis && <span className="photo__title">{podpis}</span>}
        {!maly && (
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
        )}
      </figcaption>
    </figure>
  );
}
