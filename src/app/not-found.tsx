import { ButtonLink } from '@/components/ButtonLink';
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
          <ButtonLink href="/" size="sm">
            Wróć na start
          </ButtonLink>
        }
        scope="page"
      />
    </div>
  );
}
