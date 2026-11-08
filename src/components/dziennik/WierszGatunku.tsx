'use client';

import { useState } from 'react';
import { useZdjeciaWlasne } from '@/lib/zdjeciaWlasne';
import { Button, Input } from '../ds';
import { OwnPhotos } from '../OwnPhotos';

/** One species of a new sighting list: its count, its photos, and a way off the list. */
export type WierszListy = { id: string; gatunek: string; liczba: string };

/**
 * A row of the new-sighting form's species list. Each row is a sighting of
 * its own once saved (its `id`), so its photos are filed under it; a row with
 * photos cannot be dropped, or they would be left under no sighting.
 */
export function WierszGatunku({
  wiersz,
  nazwa,
  lacina,
  bladLiczby,
  onLiczba,
  onUsun,
}: {
  wiersz: WierszListy;
  nazwa: string;
  lacina: string;
  bladLiczby?: string;
  onLiczba: (liczba: string) => void;
  onUsun: () => void;
}) {
  const [zdjecia, setZdjecia] = useState(false);
  const { zdjecia: dodane } = useZdjeciaWlasne(wiersz.gatunek, wiersz.id);
  const maZdjecia = Boolean(dodane?.length);
  return (
    <li className="lista-gatunkow__wiersz">
      <div className="lista-gatunkow__pola">
        <Input
          label={nazwa}
          description={`${lacina}; liczba ptaków, jeśli liczyłam`}
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          value={wiersz.liczba}
          onChange={(e) => onLiczba(e.target.value)}
          error={bladLiczby}
        />
        <Button type="button" variant="ghost" size="sm" aria-expanded={zdjecia} onClick={() => setZdjecia(!zdjecia)}>
          {maZdjecia ? `Zdjęcia (${dodane!.length})` : 'Zdjęcia'}
          <span className="visually-hidden">: {nazwa}</span>
        </Button>
        <Button type="button" variant="ghost" tone="critical" size="sm" onClick={onUsun} disabled={maZdjecia}>
          Usuń<span className="visually-hidden"> z listy: {nazwa}</span>
        </Button>
      </div>
      {maZdjecia && !zdjecia && <p className="muted lista-gatunkow__uwaga">Żeby usunąć ten gatunek z listy, usuń najpierw jego zdjęcia.</p>}
      {zdjecia && <OwnPhotos gatunek={wiersz.gatunek} nazwa={nazwa} wpis={wiersz.id} edycja tytul="Zdjęcia z tej obserwacji" />}
    </li>
  );
}
