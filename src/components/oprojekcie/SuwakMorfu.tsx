'use client';

import { useMemo, useState } from 'react';
import { obrys, posredni, posredniaPoza, POZA_SZYBOWANIE, sciezka } from '@/lib/sylwetka';
import { POZY, SYLWETKI } from '@/lib/sylwetki';
import { Slider } from '../ds';

export type StronaMorfu = { id: string; pl: string; cechy: { etykieta: string; tekst: string }[] };

/**
 * Two look-alikes and a slider between them: the drawing morphs by
 * interpolating the numbers behind both silhouettes, and each species' cues
 * fade in as the drawing comes closer to it. What moves while sliding is
 * exactly what tells the two apart.
 */
export function SuwakMorfu({ od, do: doGatunku }: { od: StronaMorfu; do: StronaMorfu }) {
  const [wartosc, setWartosc] = useState(0);
  const t = wartosc / 100;
  const d = useMemo(() => {
    const a = SYLWETKI[od.id];
    const b = SYLWETKI[doGatunku.id];
    if (!a || !b) return '';
    const poza = posredniaPoza(POZY[od.id] ?? POZA_SZYBOWANIE, POZY[doGatunku.id] ?? POZA_SZYBOWANIE, t);
    return sciezka(obrys(posredni(a, b, t), poza));
  }, [od.id, doGatunku.id, t]);

  const slownie = (v: number) =>
    v === 0 ? od.pl : v === 100 ? doGatunku.pl : `${v}% drogi od gatunku ${od.pl.toLowerCase()} do gatunku ${doGatunku.pl.toLowerCase()}`;

  return (
    <div className="suwak-morfu">
      <div className="suwak-morfu__niebo">
        <svg viewBox="-108 -34 216 150" role="img" aria-label={`Sylwetka od spodu: ${slownie(wartosc)}`}>
          <path d={d} />
        </svg>
      </div>
      <div className="suwak-morfu__sterowanie">
        <Slider
          label={`Od gatunku ${od.pl.toLowerCase()} do gatunku ${doGatunku.pl.toLowerCase()}`}
          value={wartosc}
          onChange={setWartosc}
          min={0}
          max={100}
          step={1}
          formatValue={slownie}
          hideValue
        />
        <div className="suwak-morfu__strony">
          {[od, doGatunku].map((strona, i) => (
            <div key={strona.id} className="suwak-morfu__strona" style={{ opacity: 0.35 + 0.65 * (i === 0 ? 1 - t : t) }}>
              <p className="suwak-morfu__nazwa">{strona.pl}</p>
              <dl>
                {strona.cechy.map((c) => (
                  <div key={c.etykieta}>
                    <dt>{c.etykieta}</dt>
                    <dd>{c.tekst}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
