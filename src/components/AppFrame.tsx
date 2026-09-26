'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { kluczLekcji, usePostep } from '@/lib/postep';
import { AppBar, AppShell, Button, NavGroup, NavItem, NavList, SkipLink } from './ds';

type NavEntry = {
  id: string;
  label: string;
  href: string;
  subline?: string;
  icon?: ReactNode;
};

export function AppFrame({
  moduly,
  children,
}: {
  moduly: { slug: string; id: string; tytul: string; sciezka: 'a' | 'b'; lekcje: string[] }[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [navOpen, setNavOpen] = useState(false);
  const { postep } = usePostep();

  const glowne: NavEntry[] = [
    { id: 'start', label: 'Start', href: '/' },
    { id: 'plan', label: 'Plan kursu', href: '/plan' },
  ];
  const narzedzia: NavEntry[] = [
    { id: 'gatunki', label: 'Atlas gatunków', href: '/gatunki' },
    { id: 'checklista', label: 'Moja checklista', href: '/checklista' },
  ];
  const modulySciezki = (sciezka: 'a' | 'b'): NavEntry[] =>
    moduly
      .filter((m) => m.sciezka === sciezka)
      .map((m) => {
        // Icons appear once the browser copy of progress is read. The subline
        // carries partial and complete states in words; ○ with no subline
        // means not started.
        const done = postep ? m.lekcje.filter((l) => postep[kluczLekcji(m.slug, l)]).length : 0;
        const zaliczony = m.lekcje.length > 0 && done === m.lekcje.length;
        return {
          id: m.slug,
          label: `${m.id} · ${m.tytul}`,
          href: `/moduly/${m.slug}`,
          icon: postep ? (zaliczony ? '✓' : '○') : undefined,
          subline: zaliczony ? 'Zaliczony' : done > 0 ? `${done} z ${m.lekcje.length} lekcji` : undefined,
        };
      });
  const biologia = modulySciezki('a');
  const teren = modulySciezki('b');

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

  const go = (entries: NavEntry[]) => (id: string) => {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    setNavOpen(false);
    router.push(entry.href);
  };

  const renderItems = (entries: NavEntry[]) =>
    entries.map((e) => (
      <NavItem
        key={e.id}
        item={{ id: e.id, label: e.label, subline: e.subline, icon: e.icon }}
        active={isActive(e.href)}
        onSelect={go(entries)}
      />
    ));

  return (
    <>
      <SkipLink>Przejdź do treści</SkipLink>
      <AppShell
        navOpen={navOpen}
        onNavToggle={() => setNavOpen((o) => !o)}
        header={
          <AppBar
            brand={<span className="brand">🦅 World of Raptors</span>}
            titleAsHeading={false}
            actions={
              <span className="nav-toggle">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-expanded={navOpen}
                  onClick={() => setNavOpen((o) => !o)}
                >
                  Menu
                </Button>
              </span>
            }
          />
        }
        sidebar={
          <nav aria-label="Nawigacja kursu" className="sidebar">
            <NavList ariaLabel="Główne">{renderItems(glowne)}</NavList>
            {biologia.length > 0 && (
              <NavGroup label="Ścieżka A: Biologia">{renderItems(biologia)}</NavGroup>
            )}
            {teren.length > 0 && (
              <NavGroup label="Ścieżka B: W terenie">{renderItems(teren)}</NavGroup>
            )}
            <NavGroup label="Narzędzia">{renderItems(narzedzia)}</NavGroup>
          </nav>
        }
      >
        {children}
      </AppShell>
    </>
  );
}
