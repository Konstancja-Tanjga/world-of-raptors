import { obrys, POZA_SZYBOWANIE, ramka, sciezka } from '@/lib/sylwetka';
import { POZY, SYLWETKI } from '@/lib/sylwetki';
import type { Gatunek } from '@/lib/types';

/**
 * A species' field-guide plate: its silhouette from below with leader lines
 * from the head, the wing, the wingtip and the tail to what this species'
 * cues say about each (gatunki.json, `sylwetka`). Owls are told apart by
 * voice first, so their plate leads with the voice and lists the rest.
 */
export function PlanszaGatunku({ g }: { g: Gatunek }) {
  const k = SYLWETKI[g.id];
  if (!k) return null;
  const punkty = obrys(k, POZY[g.id] ?? POZA_SZYBOWANIE);
  const [x, y, w, h] = ramka(punkty);

  if (g.aktywnosc === 'nocny') {
    const c = g.sylwetka;
    return (
      <figure className="plansza plansza--sowa">
        <svg className="plansza__ptak" viewBox={`${x - 6} ${y - 6} ${w + 12} ${h + 12}`} aria-hidden="true">
          <path d={sciezka(punkty, 0.1)} />
        </svg>
        <figcaption className="plansza__sowa">
          <p className="plansza__glos-etykieta">Głos</p>
          <p className="plansza__glos">{c.glos}</p>
          <dl>
            <div>
              <dt>„Uszy”</dt>
              <dd>{c.uszy}</dd>
            </div>
            <div>
              <dt>Oczy</dt>
              <dd>{c.oczy}</dd>
            </div>
            <div>
              <dt>Głowa i szlara</dt>
              <dd>{c.glowa}</dd>
            </div>
            <div>
              <dt>Sylwetka</dt>
              <dd>{c.sylwetka}</dd>
            </div>
          </dl>
        </figcaption>
      </figure>
    );
  }

  const c = g.sylwetka;
  // Room on both sides for the cue texts, which sit outside the bird.
  const box = { x: x - 128, y: y - 26, w: w + 256, h: h + 52 };
  const ogonY = Math.max(k.tulowDl, k.ramie + 2) + k.ogonDl;
  const opisy = [
    { id: 'glowa', punkt: [0, -k.glowa + 1.5], etykieta: [-52, y - 10], tytul: 'Głowa', tekst: c.glowa, strona: 'l' },
    { id: 'skrzydla', punkt: [-52, k.ramie * 0.4], etykieta: [-104, k.ramie + 22], tytul: 'Skrzydła', tekst: c.skrzydla, strona: 'l' },
    { id: 'palce', punkt: [97, k.koniecY + k.koniecSzer * 0.4], etykieta: [104, k.koniecY - 14], tytul: '„Palce”', tekst: c.palce, strona: 'p' },
    { id: 'ogon', punkt: [0, ogonY - 6], etykieta: [42, ogonY + 8], tytul: 'Ogon', tekst: c.ogon, strona: 'p' },
  ] as const;
  // A cue sits beside its anchor and may only be as wide as the space on its side.
  const polozenie = (px: number, py: number, strona: 'l' | 'p') => ({
    left: `${((px - box.x) / box.w) * 100}%`,
    top: `${((py - box.y) / box.h) * 100}%`,
    maxWidth: `${((strona === 'l' ? px - box.x : box.x + box.w - px) / box.w) * 100 - 1}%`,
  });

  return (
    <figure className="plansza">
      <div className="plansza__rysunek">
        <div className="plansza__scena">
          <svg viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`} aria-hidden="true">
            <path className="plansza__ksztalt" d={sciezka(punkty, 0.08)} />
            {opisy.map((o) => (
              <g key={o.id} className="plansza__odnosnik">
                <line x1={o.punkt[0]} y1={o.punkt[1]} x2={o.etykieta[0]} y2={o.etykieta[1]} pathLength={1} />
                <circle cx={o.punkt[0]} cy={o.punkt[1]} r={1.6} />
              </g>
            ))}
          </svg>
          {opisy.map((o) => (
            <p
              key={o.id}
              className={`plansza__opis plansza__opis--${o.strona}`}
              style={polozenie(o.etykieta[0], o.etykieta[1], o.strona)}
            >
              <span className="plansza__tytul">{o.tytul}</span> {o.tekst}
            </p>
          ))}
        </div>
      </div>
      <figcaption className="plansza__podpis">
        Grupa: {c.grupa}. Sylwetka od spodu, jak widać ją na tle nieba.
      </figcaption>
    </figure>
  );
}
