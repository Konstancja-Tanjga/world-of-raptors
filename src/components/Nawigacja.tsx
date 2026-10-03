'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useKontynuuj } from '@/lib/kontynuuj';
import type { ModulNawigacji } from './AppFrame';

const LINKI: { href: string; etykieta: string; aktywny: (p: string) => boolean }[] = [
  { href: '/plan', etykieta: 'Kurs', aktywny: (p) => p === '/plan' || p.startsWith('/moduly') },
  { href: '/gatunki', etykieta: 'Atlas', aktywny: (p) => p.startsWith('/gatunki') },
  { href: '/fiszki', etykieta: 'Fiszki', aktywny: (p) => p === '/fiszki' },
  { href: '/checklista', etykieta: 'Checklista', aktywny: (p) => p === '/checklista' },
];

/** Pages that open on a dark scene: the bar starts light-on-dark there, before the observer has run. */
const zaczynaSieScena = (p: string) => p === '/' || /^\/gatunki\/[^/]+$/.test(p);

/**
 * The global navigation: a translucent bar like a product site's. It turns
 * light-on-dark while a dark scene (`data-scena`) is beneath it. On module
 * pages it scrolls away and the module bar sticks instead, so a lesson keeps
 * one bar of chrome, not two.
 */
export function Nawigacja({
  moduly,
  przyklejona,
  znak,
}: {
  moduly: ModulNawigacji[];
  przyklejona: boolean;
  /** The logo, drawn on the server so the silhouette generator stays out of this bundle. */
  znak: ReactNode;
}) {
  const pathname = usePathname();
  const [scena, setScena] = useState({ dla: pathname, nad: zaczynaSieScena(pathname) });
  const nadScena = scena.dla === pathname ? scena.nad : zaczynaSieScena(pathname);
  // The menu belongs to the page it was opened on, so navigating closes it.
  const [menuNa, setMenuNa] = useState<string | null>(null);
  const menu = menuNa === pathname;
  const przycisk = useRef<HTMLButtonElement>(null);
  const arkusz = useRef<HTMLDivElement>(null);
  const idArkusza = useId();
  const dokad = useKontynuuj(moduly);
  const naMiejscu = dokad?.href === pathname;

  useEffect(() => {
    const sceny = document.querySelectorAll('[data-scena]');
    if (sceny.length === 0) {
      const t = requestAnimationFrame(() => setScena({ dla: pathname, nad: false }));
      return () => cancelAnimationFrame(t);
    }
    const pasmo = document.querySelector('.nav')?.getBoundingClientRect().height ?? 52;
    const pod = new Set<Element>();
    const obserwator = new IntersectionObserver(
      (wpisy) => {
        for (const w of wpisy) {
          // A scene that only touches the bar's lower edge is not under it.
          if (w.isIntersecting && w.intersectionRect.height > 1) pod.add(w.target);
          else pod.delete(w.target);
        }
        setScena({ dla: pathname, nad: pod.size > 0 });
      },
      // Only the strip under the bar counts.
      { rootMargin: `0px 0px ${-(window.innerHeight - pasmo)}px 0px` },
    );
    sceny.forEach((s) => obserwator.observe(s));
    return () => obserwator.disconnect();
  }, [pathname]);

  useEffect(() => {
    if (!menu) return;
    document.documentElement.dataset.menu = 'otwarte';
    arkusz.current?.querySelector<HTMLElement>('a')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuNa(null);
        przycisk.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      delete document.documentElement.dataset.menu;
      window.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  return (
    <header
      className="nav"
      data-nad-scena={nadScena && !menu ? '' : undefined}
      data-przyklejona={przyklejona ? '' : undefined}
      data-menu={menu ? '' : undefined}
    >
      <div className="nav__pasek">
        <Link href="/" className="nav__marka" aria-current={pathname === '/' ? 'page' : undefined}>
          {znak}
          <span>World of Raptors</span>
        </Link>
        <nav aria-label="Główna" className="nav__glowna">
          <ul className="nav__linki">
            {LINKI.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="nav__link"
                  aria-current={pathname === l.href ? 'page' : l.aktywny(pathname) ? 'true' : undefined}
                >
                  {l.etykieta}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="nav__akcje">
          {dokad && !naMiejscu && (
            <Link href={dokad.href} className="nav__dalej">
              {dokad.etykieta}
              <span className="visually-hidden">: {dokad.opis}</span>
            </Link>
          )}
          <button
            ref={przycisk}
            type="button"
            className="nav__menu"
            aria-expanded={menu}
            aria-controls={idArkusza}
            onClick={() => setMenuNa(menu ? null : pathname)}
          >
            {menu ? 'Zamknij' : 'Menu'}
          </button>
        </div>
      </div>
      <div id={idArkusza} ref={arkusz} className="nav__arkusz" hidden={!menu}>
        <nav aria-label="Menu">
          <ul>
            <li>
              <Link href="/" className="nav__arkusz-link" aria-current={pathname === '/' ? 'page' : undefined}>
                Start
              </Link>
            </li>
            {LINKI.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="nav__arkusz-link"
                  aria-current={pathname === l.href ? 'page' : l.aktywny(pathname) ? 'true' : undefined}
                >
                  {l.etykieta}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/o-projekcie" className="nav__arkusz-link" aria-current={pathname === '/o-projekcie' ? 'page' : undefined}>
                O projekcie
              </Link>
            </li>
          </ul>
        </nav>
        {dokad && !naMiejscu && (
          <Link href={dokad.href} className="nav__arkusz-dalej">
            <span className="nav__arkusz-etykieta">{dokad.etykieta}</span>
            <span>{dokad.opis}</span>
          </Link>
        )}
      </div>
    </header>
  );
}
