import type { ReactNode } from 'react';

/**
 * The header of a tool page (the atlas, the checklist, the log, flashcards…):
 * a compact title, at most one line of lead, and
 * the page's actions on the same row, so the first thing to do is above the
 * fold on a phone. Course pages (home, plan, modules, lessons, About) keep
 * their editorial headers.
 */
export function NaglowekStrony({
  tytul,
  lead,
  akcje,
}: {
  tytul: ReactNode;
  lead?: ReactNode;
  akcje?: ReactNode;
}) {
  return (
    <header className="naglowek-strony naglowek-strony--narzedzie">
      <div className="naglowek-strony__tekst">
        <h1 className="naglowek-strony__tytul">{tytul}</h1>
        {lead && <p className="naglowek-strony__lead">{lead}</p>}
      </div>
      {akcje && <div className="naglowek-strony__akcje">{akcje}</div>}
    </header>
  );
}
