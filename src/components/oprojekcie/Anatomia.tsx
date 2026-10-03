import { obrys, ramka, sciezka } from '@/lib/sylwetka';
import { POZY, SYLWETKI } from '@/lib/sylwetki';

/**
 * The red kite's silhouette as a labelled plate: leader lines from the points
 * the generator works with (wrist, fingers, wing root, tail fork, head) to the
 * numbers they stand for. The lines draw themselves as the plate scrolls in.
 */
export function Anatomia() {
  const k = SYLWETKI['kania-ruda'];
  const poza = POZY['kania-ruda'] ?? { wznios: 0, zgiecie: 0, ogon: 0.6 };
  const punkty = obrys(k, poza);
  const [x, y, w, h] = ramka(punkty);
  const margines = 16;
  const box = { x: x - margines - 70, y: y - margines - 6, w: w + 2 * margines + 140, h: h + 2 * margines + 12 };

  // Points on the drawing (units: wingspan 200), each with where its label sits.
  const ogonY = Math.max(k.tulowDl, k.ramie + 2) + k.ogonDl;
  const opisy: { id: string; punkt: [number, number]; etykieta: [number, number]; tekst: string; strona: 'l' | 'p' }[] = [
    { id: 'glowa', punkt: [0, -k.glowa + 2], etykieta: [-70, -k.glowa - 6], tekst: 'Głowa: jak daleko wystaje przed skrzydła', strona: 'l' },
    { id: 'nadgarstek', punkt: [100 * k.nadgarstek, k.nadgarstekY + 2], etykieta: [70, k.nadgarstekY - 22], tekst: 'Nadgarstek: gdzie skrzydło się łamie', strona: 'p' },
    { id: 'palce', punkt: [96, k.koniecY + 8], etykieta: [118, k.koniecY + 30], tekst: '„Palce”: ile ich jest i jak głęboko sięgają szczeliny', strona: 'p' },
    { id: 'ramie', punkt: [-(k.tulow / 2 + 8), k.ramie / 2], etykieta: [-118, k.ramie / 2 + 26], tekst: 'Szerokość skrzydła przy tułowiu i w nadgarstku', strona: 'l' },
    { id: 'ogon', punkt: [0, ogonY - 8], etykieta: [56, ogonY + 2], tekst: 'Ogon: długość, wachlarz i wcięcie', strona: 'p' },
  ];
  const proc = (px: number, py: number) => ({
    left: `${((px - box.x) / box.w) * 100}%`,
    top: `${((py - box.y) / box.h) * 100}%`,
  });

  return (
    <figure className="anatomia">
      <div className="anatomia__plansza">
        <svg viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`} aria-hidden="true">
          <path className="anatomia__ptak" d={sciezka(punkty, 0.08)} />
          {opisy.map((o) => (
            <g key={o.id} className="anatomia__odnosnik">
              <line x1={o.punkt[0]} y1={o.punkt[1]} x2={o.etykieta[0]} y2={o.etykieta[1]} pathLength={1} />
              <circle cx={o.punkt[0]} cy={o.punkt[1]} r={1.6} />
            </g>
          ))}
        </svg>
        {opisy.map((o) => (
          <span key={o.id} className={`anatomia__opis anatomia__opis--${o.strona}`} style={proc(o.etykieta[0], o.etykieta[1])}>
            {o.tekst}
          </span>
        ))}
      </div>
      <figcaption className="anatomia__podpis">
        Kania ruda z dwudziestu kilku liczb. Rozpiętość skrzydeł to zawsze 200 jednostek, reszta jest proporcją.
      </figcaption>
    </figure>
  );
}
