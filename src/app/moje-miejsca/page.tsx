import type { Metadata } from 'next';
import Link from 'next/link';
import { MojeMiejscaView } from '@/components/MojeMiejscaView';
import { ptakiNaLiscie, punktyObserwacji } from '@/lib/content';
import '../kiedy-i-gdzie/kiedy-i-gdzie.css';
import './moje-miejsca.css';

// Personal: where I watch birds, kept in this browser (and my account); nothing for a search engine.
export const metadata: Metadata = { title: 'Moje miejsca', robots: { index: false } };

export default function MojeMiejscaPage() {
  return (
    <div className="page">
      <header className="naglowek-strony">
        <p className="eyebrow">W teren</p>
        <h1 className="naglowek-strony__tytul">Moje miejsca</h1>
        <p className="naglowek-strony__lead">
          Miejsca, w których obserwuję ptaki. Dodaję je na telefonie, stojąc na miejscu: aplikacja zapisuje położenie, a ja
          nazwę, datę pierwszej wizyty i notatkę. Pojawiają się też w{' '}
          <Link href="/kiedy-i-gdzie#gdzie" className="text-link">
            Gdzie stanąć
          </Link>{' '}
          i w podpowiedziach przy obserwacjach w{' '}
          <Link href="/checklista" className="text-link">
            checkliście
          </Link>
          .
        </p>
      </header>
      <MojeMiejscaView
        ptaki={Object.fromEntries(ptakiNaLiscie.map((p) => [p.id, { pl: p.pl, href: `/gatunki/${p.id}` }]))}
        punkty={punktyObserwacji.map(({ nazwa, szer, dl }) => ({ nazwa, szer, dl }))}
      />
    </div>
  );
}
