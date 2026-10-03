'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { kluczLekcji, usePostep } from '@/lib/postep';

/** `lead` comes rendered from the server (it is Markdown, and the renderer is server-only). */
export type LekcjaSylabusu = { slug: string; tytul: string; minuty: number; progQuizu: number | null; lead: ReactNode };

/** Reading time, short: "ok. 12 min". */
const czas = (minuty: number) => (minuty === 1 ? 'ok. minuty' : `ok. ${minuty} min`);

/**
 * The module's lessons as a numbered syllabus: each lesson is one link with
 * its title, the first lines of its lead, the reading time, the quiz pass
 * mark and whether I finished it (shown once the browser copy of progress
 * is read).
 */
export function SylabusModulu({ modul, lekcje }: { modul: string; lekcje: LekcjaSylabusu[] }) {
  const { postep } = usePostep();
  return (
    <ol className="sylabus">
      {lekcje.map((l, i) => {
        const data = postep?.[kluczLekcji(modul, l.slug)];
        return (
          <li key={l.slug}>
            <Link href={`/moduly/${modul}/${l.slug}`} className="sylabus__lekcja" data-gotowa={data ? '' : undefined}>
              <span className="sylabus__nr" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="sylabus__tresc">
                <span className="sylabus__tytul">
                  <span className="visually-hidden">Lekcja {i + 1}: </span>
                  {l.tytul}
                </span>
                {l.lead && <span className="sylabus__lead">{l.lead}</span>}
                <span className="sylabus__meta">
                  <span>{czas(l.minuty)}</span>
                  {l.progQuizu !== null && <span>quiz, próg {l.progQuizu}%</span>}
                  {data && <span className="sylabus__gotowa">Ukończona {data}</span>}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
