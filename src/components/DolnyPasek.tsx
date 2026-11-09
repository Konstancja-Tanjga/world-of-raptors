'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { biezacy, DOLNY_PASEK } from '@/lib/nawigacja';

/**
 * The phone's bottom bar: the sections used most (globals.css shows it where
 * the menu sheet replaces the top bar's links). It sits outside the top bar,
 * whose backdrop filter would make it the containing block of a fixed child.
 */
export function DolnyPasek() {
  const pathname = usePathname();
  // A lesson is for reading: the module bar above already leads on, and the screen keeps its height.
  if (/^\/moduly\/[^/]+\/[^/]+$/.test(pathname)) return null;
  return (
    <nav aria-label="Na skróty" className="dolny-pasek">
      <ul>
        {DOLNY_PASEK.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="dolny-pasek__link" aria-current={biezacy(l, pathname)}>
              {l.etykieta}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
