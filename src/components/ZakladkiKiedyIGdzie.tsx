'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Tab, TabList, TabPanel, Tabs } from './ds';

/** The three panels, by the #hash each answers to (lessons and the points' planner link use them). */
const ZAKLADKI = [
  { id: 'kiedy', etykieta: 'Kiedy jechać' },
  { id: 'gdzie', etykieta: 'Gdzie stanąć' },
  { id: 'co-tu', etykieta: 'Co tu teraz' },
] as const;
type Zakladka = (typeof ZAKLADKI)[number]['id'];
const zHasha = (h: string): Zakladka | null => ZAKLADKI.find((z) => `#${z.id}` === h)?.id ?? null;

/**
 * "Kiedy i gdzie" as three panels of one screen: the planner, the points and
 * eBird's latest. The #hash picks the panel (a lesson's link to #gdzie, a
 * point's "Najbliższe dobre godziny" to #kiedy), and choosing a tab writes it
 * back, so a shared address opens the same panel. All three stay mounted:
 * the planner keeps its forecast while the reader looks at the points.
 */
export function ZakladkiKiedyIGdzie({ kiedy, gdzie, coTu }: { kiedy: ReactNode; gdzie: ReactNode; coTu: ReactNode }) {
  const [aktywna, setAktywna] = useState<Zakladka>('kiedy');
  const korzen = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const zAdresu = (przewin: boolean) => {
      const z = zHasha(location.hash);
      if (!z) return;
      setAktywna(z);
      // A link inside the page (a point's planner link) hid the panel it sat in: bring the tabs
      // back into view and give focus to the chosen tab, so the keyboard does not fall to the page's start.
      if (przewin) {
        korzen.current?.scrollIntoView({ block: 'start' });
        requestAnimationFrame(() => korzen.current?.querySelector<HTMLElement>(`[role="tab"][aria-selected="true"]`)?.focus());
      }
    };
    zAdresu(false);
    const naZmiane = () => zAdresu(true);
    window.addEventListener('hashchange', naZmiane);
    return () => window.removeEventListener('hashchange', naZmiane);
  }, []);

  const panele: Record<Zakladka, ReactNode> = { kiedy, gdzie, 'co-tu': coTu };
  return (
    <div ref={korzen} className="kiedy-i-gdzie__zakladki">
      <Tabs
        value={aktywna}
        onChange={(id) => {
          setAktywna(id as Zakladka);
          history.replaceState(null, '', `#${id}`);
        }}
      >
        <TabList ariaLabel="Kiedy i gdzie">
          {ZAKLADKI.map((z) => (
            <Tab key={z.id} id={z.id}>
              {z.etykieta}
            </Tab>
          ))}
        </TabList>
        {ZAKLADKI.map((z) => (
          <TabPanel key={z.id} id={z.id}>
            <div className="kiedy-i-gdzie__panel">{panele[z.id]}</div>
          </TabPanel>
        ))}
      </Tabs>
    </div>
  );
}
