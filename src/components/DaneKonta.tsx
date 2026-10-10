'use client';

import { useState } from 'react';
import { plikDanychKonta, usunKontoNaSerwerze } from '@/lib/daneKonta';
import { Button, Dialog, StateBlock, useToast } from './ds';

/** "Moje dane": the account's data as a file, and deleting the account. */
export function DaneKonta() {
  const { notify } = useToast();
  const [pobieranie, setPobieranie] = useState(false);
  const [bladPobierania, setBladPobierania] = useState<string>();
  const [pytam, setPytam] = useState(false);
  const [usuwanie, setUsuwanie] = useState(false);
  const [bladUsuwania, setBladUsuwania] = useState<string>();

  const pobierz = async () => {
    setPobieranie(true);
    setBladPobierania(undefined);
    try {
      const { plik, nazwa } = await plikDanychKonta();
      const url = URL.createObjectURL(plik);
      const a = document.createElement('a');
      a.href = url;
      a.download = nazwa;
      a.click();
      URL.revokeObjectURL(url);
      notify({ tone: 'success', title: 'Dane pobrane', description: `Plik ${nazwa} jest w pobranych.` });
    } catch (err) {
      console.error('[konto] export failed', err);
      setBladPobierania(err instanceof Error ? err.message : String(err));
    } finally {
      setPobieranie(false);
    }
  };

  const usun = async () => {
    setUsuwanie(true);
    setBladUsuwania(undefined);
    const { blad } = await usunKontoNaSerwerze();
    setUsuwanie(false);
    if (blad) {
      setBladUsuwania(blad);
      return;
    }
    setPytam(false);
    notify({
      tone: 'success',
      title: 'Konto usunięte',
      description: 'Dane konta zostały usunięte z serwera. Postęp w tej przeglądarce został.',
      duration: null,
    });
  };

  return (
    <section className="stack" aria-labelledby="moje-dane">
      <h2 id="moje-dane" className="section-title">
        Moje dane
      </h2>
      <p className="muted">
        Konto przechowuje ukończone lekcje, checklistę, fiszki i zdobyte odznaki. Można je pobrać w pliku
        albo usunąć razem z kontem.
      </p>
      {bladPobierania && (
        <StateBlock
          state="error"
          title="Nie udało się pobrać danych"
          description={`${bladPobierania} Spróbuj jeszcze raz.`}
          scope="section"
        />
      )}
      <div className="row">
        <Button variant="secondary" onClick={pobierz} disabled={pobieranie}>
          {pobieranie ? 'Pobieram dane…' : 'Pobierz moje dane'}
        </Button>
        <Button variant="secondary" tone="critical" onClick={() => setPytam(true)}>
          Usuń konto
        </Button>
      </div>
      <Dialog
        open={pytam}
        onClose={() => !usuwanie && setPytam(false)}
        dismissible={!usuwanie}
        title="Usunąć konto?"
        description="Z serwera znikną konto i wszystko, co na nim zapisano: lekcje, checklista, fiszki i odznaki. Tego nie da się cofnąć."
        footer={
          <>
            <Button variant="secondary" onClick={() => setPytam(false)} disabled={usuwanie}>
              Zostaw konto
            </Button>
            <Button tone="critical" onClick={usun} disabled={usuwanie}>
              {usuwanie ? 'Usuwam konto…' : 'Usuń konto'}
            </Button>
          </>
        }
      >
        <div className="stack">
          <p>
            Postęp w tej przeglądarce zostaje. Na innych urządzeniach też zostaje to, co już tam jest, ale
            przestanie się synchronizować. Jeśli chcesz zachować dane z konta, najpierw je pobierz.
          </p>
          {bladUsuwania && (
            <StateBlock state="error" title="Konto nie zostało usunięte" description={bladUsuwania} scope="inline" />
          )}
        </div>
      </Dialog>
    </section>
  );
}
