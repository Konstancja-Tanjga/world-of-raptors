import Link from 'next/link';
import { StateBlock } from '@/components/ds';

export default function NotFound() {
  return (
    <div className="page">
      <StateBlock
        state="empty"
        icon="🪶"
        title="Nie ma takiej strony"
        description="Ten moduł, lekcja albo gatunek nie istnieje."
        action={
          <Link href="/" className="text-link">
            Wróć na start
          </Link>
        }
        scope="page"
      />
    </div>
  );
}
