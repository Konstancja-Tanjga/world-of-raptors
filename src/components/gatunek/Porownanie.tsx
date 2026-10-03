'use client';

import { useState } from 'react';
import { SegmentedControl } from '../ds';
import { SuwakMorfu, type StronaMorfu } from '../SuwakMorfu';

/**
 * A species against each of its look-alikes in turn: choose one, then slide
 * from one silhouette to the other. The slider starts again at this species
 * whenever another look-alike is chosen.
 */
export function Porownanie({ gatunek, podobne }: { gatunek: StronaMorfu; podobne: StronaMorfu[] }) {
  const [wybrany, setWybrany] = useState(podobne[0]?.id);
  const druga = podobne.find((p) => p.id === wybrany) ?? podobne[0];
  if (!druga) return null;
  return (
    <div className="porownanie">
      {podobne.length > 1 && (
        <div className="scroll-x">
          <SegmentedControl
            legend="Porównaj z"
            showLegend
            value={druga.id}
            onChange={setWybrany}
            options={podobne.map((p) => ({ value: p.id, label: p.pl }))}
          />
        </div>
      )}
      <SuwakMorfu key={druga.id} od={gatunek} do={druga} />
    </div>
  );
}
