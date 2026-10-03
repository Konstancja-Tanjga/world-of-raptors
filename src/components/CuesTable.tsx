'use client';

import Link from 'next/link';
import { Table } from './ds';

export type KolumnaCech = {
  id: string;
  pl: string;
  cechy: Record<string, string>;
};

/**
 * The field-guide comparison: one row per cue from the method lessons, one
 * column per species, so the differences between look-alikes read across.
 * Client-side because Big Hat's Table takes cell renderers.
 */
export function CuesTable({
  podpis,
  cechy,
  gatunki,
}: {
  podpis: string;
  /** The cues as [key, label], in the order the lessons teach them. */
  cechy: readonly (readonly [string, string])[];
  /** The species itself first, then its look-alikes. */
  gatunki: KolumnaCech[];
}) {
  const [glowny, ...podobne] = gatunki;
  const wiersze = cechy.filter(([k]) => gatunki.some((g) => g.cechy[k]));
  return (
    <Table
      caption={podpis}
      responsive="scroll"
      rowKey={([k]) => k}
      rows={wiersze}
      columns={[
        { key: 'cecha', header: 'Cecha', cell: ([, nazwa]) => nazwa },
        {
          key: glowny.id,
          header: glowny.pl,
          cell: ([k]) => glowny.cechy[k] ?? '',
        },
        ...podobne.map((g) => ({
          key: g.id,
          header: (
            <Link href={`/gatunki/${g.id}`} className="text-link">
              {g.pl}
            </Link>
          ),
          cell: ([k]: readonly [string, string]) => g.cechy[k] ?? '',
        })),
      ]}
    />
  );
}
