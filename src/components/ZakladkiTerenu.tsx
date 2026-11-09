import Link from 'next/link';
import { TEREN } from '@/lib/nawigacja';
import { ButtonLink } from './ButtonLink';

/**
 * "Teren": the log, the checklist and my places as one section of three
 * tabs. They are pages, not panels (Big Hat's Tabs switch panels in place),
 * so they are links, with the field's one action, a new sighting, beside them.
 */
export function ZakladkiTerenu({ biezaca }: { biezaca: string }) {
  return (
    <div className="zakladki-terenu">
      <nav aria-label="Teren" className="scroll-x">
        <ul className="zakladki-terenu__lista">
          {TEREN.map((t) => (
            <li key={t.href}>
              <Link href={t.href} className="zakladki-terenu__link" aria-current={t.href === biezaca ? 'page' : undefined}>
                {t.etykieta}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <ButtonLink href="/dziennik/obserwacja" size="sm">
        Dodaj obserwację
      </ButtonLink>
    </div>
  );
}
