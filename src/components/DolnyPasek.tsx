'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { biezacy, DOLNY_PASEK } from '@/lib/nawigacja';

/**
 * The phone's bottom bar: the sections used most (globals.css shows it where
 * the menu sheet replaces the top bar's links). It sits outside the top bar,
 * whose backdrop filter would make it the containing block of a fixed child.
 * Like the top bar, it turns light-on-dark while a scene (`data-scena`, the
 * home sky) covers its middle line.
 */
export function DolnyPasek() {
  const pathname = usePathname();
  const pasek = useRef<HTMLElement>(null);
  const [nadScena, setNadScena] = useState({ dla: pathname, nad: false });
  const lekcja = /^\/moduly\/[^/]+\/[^/]+$/.test(pathname);

  useEffect(() => {
    if (lekcja) return;
    const pod = new Set<Element>();
    let obserwator: IntersectionObserver | null = null;
    const obserwuj = () => {
      obserwator?.disconnect();
      pod.clear();
      const sceny = document.querySelectorAll('[data-scena]');
      const wysokosc = pasek.current?.getBoundingClientRect().height ?? 0;
      // Hidden (a wide screen) or no scene on the page: paper.
      if (sceny.length === 0 || wysokosc === 0) {
        setNadScena({ dla: pathname, nad: false });
        return;
      }
      // A 2px strip at the bar's middle line, counted from the window's bottom.
      const srodek = Math.round(wysokosc / 2);
      obserwator = new IntersectionObserver(
        (wpisy) => {
          for (const w of wpisy) {
            if (w.isIntersecting) pod.add(w.target);
            else pod.delete(w.target);
          }
          setNadScena({ dla: pathname, nad: pod.size > 0 });
        },
        { rootMargin: `${-(window.innerHeight - srodek - 1)}px 0px ${-(srodek - 1)}px 0px` },
      );
      sceny.forEach((s) => obserwator?.observe(s));
    };
    let klatka = requestAnimationFrame(obserwuj);
    const odswiez = () => {
      cancelAnimationFrame(klatka);
      klatka = requestAnimationFrame(obserwuj);
    };
    window.addEventListener('resize', odswiez);
    return () => {
      window.removeEventListener('resize', odswiez);
      cancelAnimationFrame(klatka);
      obserwator?.disconnect();
    };
  }, [pathname, lekcja]);

  // A lesson is for reading: the module bar above already leads on, and the screen keeps its height.
  if (lekcja) return null;
  const nad = nadScena.dla === pathname && nadScena.nad;
  return (
    <nav ref={pasek} aria-label="Na skróty" className="dolny-pasek" data-nad-scena={nad ? '' : undefined}>
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
