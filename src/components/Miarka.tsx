import { obrys, POZA_SZYBOWANIE, ramka, sciezka } from '@/lib/sylwetka';
import { POZY, SYLWETKI } from '@/lib/sylwetki';
import type { Gatunek } from '@/lib/types';

const SKALA_CM = 300;
const CZLOWIEK_CM = 170;

/**
 * The wingspan drawn to scale: the silhouette spans exactly its largest
 * wingspan on a 0–300 cm axis (the atlas's biggest vulture fits), with the
 * species' range and, for comparison, a person's outstretched arms.
 */
export function Miarka({ g }: { g: Gatunek }) {
  const [min, max] = g.rozpietosc_cm;
  const ksztalt = SYLWETKI[g.id];
  const punkty = ksztalt ? obrys(ksztalt, POZY[g.id] ?? POZA_SZYBOWANIE) : null;
  const [, y, , h] = punkty ? ramka(punkty) : [0, 0, 0, 0];
  const s = max / 200;
  const proc = (cm: number) => `${(cm / SKALA_CM) * 100}%`;

  return (
    <figure className="miarka">
      {punkty && (
        <svg className="miarka__rysunek" viewBox={`0 ${y * s - 2} ${SKALA_CM} ${h * s + 4}`} aria-hidden="true">
          <path d={sciezka(punkty, 0.15)} transform={`translate(${max / 2} 0) scale(${s})`} />
        </svg>
      )}
      <div className="miarka__paski" aria-hidden="true">
        <span className="miarka__pasek miarka__pasek--ptak" style={{ left: proc(min), width: proc(max - min) }} />
        <span className="miarka__pasek miarka__pasek--zero" style={{ width: proc(min) }} />
        <span className="miarka__pasek miarka__pasek--czlowiek" style={{ width: proc(CZLOWIEK_CM) }} />
        {[0, 100, 200, 300].map((cm) => (
          <span key={cm} className="miarka__podzialka" style={{ left: proc(cm) }}>
            {cm}
          </span>
        ))}
      </div>
      <figcaption className="miarka__opis">
        <span className="miarka__ptak">
          Rozpiętość skrzydeł: ok. {min}–{max} cm
        </span>
        <span className="miarka__czlowiek">Dla porównania: rozłożone ręce dorosłego człowieka, ok. {CZLOWIEK_CM} cm</span>
      </figcaption>
    </figure>
  );
}
