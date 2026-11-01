'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase, useKonto } from '@/lib/konto';
import { MAKS_TRESCI, RODZAJE, TYPY_FRAGMENTU, type Rodzaj, type Zgloszenie } from '@/lib/zgloszenie';
import { Button, Dialog, SegmentedControl, StateBlock, Textarea, useToast } from '../ds';
import { kandydat, moznaWskazywac, opisz, tytulStrony, wszyscyKandydaci, zaznaczenie, type Miejsce } from './wskazywanie';

/**
 * "Zgłoś poprawkę" in the footer, for signed-in people only. Selected text
 * goes straight into the form; otherwise the page switches to pointing (on
 * the person's own pages the form opens at once): the piece of content under
 * the pointer (or the keyboard's focus) is outlined, and choosing it opens the
 * form with that piece quoted. The note goes to the owner by mail
 * (src/app/zgloszenie/route.ts).
 */
export function ZglosPoprawke() {
  const konto = useKonto();
  const sciezka = usePathname();
  const { notify } = useToast();
  const przycisk = useRef<HTMLButtonElement>(null);
  const zaznaczone = useRef<Miejsce | null>(null);
  const [etap, setEtap] = useState<'nic' | 'wskazywanie' | 'formularz'>('nic');
  const [miejsce, setMiejsce] = useState<Miejsce>({});
  const [rodzaj, setRodzaj] = useState<Rodzaj>('popraw');
  const [tresc, setTresc] = useState('');
  const [wysylanie, setWysylanie] = useState(false);
  const [blad, setBlad] = useState<string>();

  if (konto.stan !== 'zalogowana') return null;

  const otworzFormularz = (m: Miejsce) => {
    setMiejsce(m);
    setBlad(undefined);
    setEtap('formularz');
  };

  // Pressing the button would clear a selection on some browsers, so it is read on pointer down.
  const zapamietajZaznaczenie = () => {
    zaznaczone.current = zaznaczenie(sciezka);
  };

  const zacznij = () => {
    const z = zaznaczone.current ?? zaznaczenie(sciezka);
    zaznaczone.current = null;
    if (z) otworzFormularz(z);
    else if (moznaWskazywac(sciezka)) setEtap('wskazywanie');
    else otworzFormularz({});
  };

  // Back to the button: the form would hand focus back to the piece of
  // content it was opened from, which no longer takes focus once pointing ends.
  const zamknij = () => {
    setEtap('nic');
    requestAnimationFrame(() => przycisk.current?.focus());
  };

  const wyslij = async () => {
    setWysylanie(true);
    setBlad(undefined);
    let b: string | undefined;
    try {
      const zgloszenie: Zgloszenie = { rodzaj, tresc, strona: sciezka, tytul: tytulStrony(sciezka), ...miejsce };
      b = (await wyslijNaSerwer(zgloszenie)).blad;
    } catch (err) {
      console.error('[ZglosPoprawke] sending failed', err);
      b = 'Coś poszło nie tak przy wysyłaniu. Spróbuj jeszcze raz.';
    } finally {
      setWysylanie(false);
    }
    if (b) {
      setBlad(b);
      return;
    }
    zamknij();
    setTresc('');
    setRodzaj('popraw');
    setMiejsce({});
    notify({
      tone: 'success',
      title: 'Dziękuję, zgłoszenie dotarło',
      description: 'Autorka je przeczyta i w razie pytań odpisze na Twój adres e-mail.',
    });
  };

  const { sekcja, fragment } = miejsce;

  return (
    <div className="stopka__zglos">
      <p>Widzisz błąd albo czegoś tu brakuje?</p>
      <Button ref={przycisk} variant="secondary" size="sm" onPointerDown={zapamietajZaznaczenie} onClick={zacznij}>
        Zgłoś poprawkę
      </Button>
      {etap === 'wskazywanie' && (
        <TrybWskazywania
          onWybierz={(el) => otworzFormularz(opisz(el))}
          onBezWskazywania={() => otworzFormularz({})}
          onAnuluj={zamknij}
        />
      )}
      <Dialog
        open={etap === 'formularz'}
        onClose={() => !wysylanie && zamknij()}
        dismissible={!wysylanie}
        title="Zgłoś poprawkę"
        description={`Strona: ${tytulStrony(sciezka)}${sekcja ? `, sekcja „${sekcja.tekst}”` : ''}.`}
        footer={
          <>
            {moznaWskazywac(sciezka) && (
              <Button variant="ghost" onClick={() => setEtap('wskazywanie')} disabled={wysylanie}>
                Wskaż inne miejsce
              </Button>
            )}
            <Button variant="secondary" onClick={zamknij} disabled={wysylanie}>
              Anuluj
            </Button>
            <Button onClick={wyslij} loading={wysylanie} loadingLabel="Wysyłam zgłoszenie" disabled={!tresc.trim()}>
              Wyślij
            </Button>
          </>
        }
      >
        <div className="stack">
          {fragment ? (
            <figure className="zgloszenie__fragment">
              <figcaption>Wskazany fragment: {TYPY_FRAGMENTU[fragment.typ]}</figcaption>
              {fragment.tekst && <blockquote>{fragment.tekst}</blockquote>}
            </figure>
          ) : (
            <p className="muted">Bez wskazanego fragmentu: zgłoszenie dotyczy całej strony.</p>
          )}
          <SegmentedControl
            legend="Rodzaj zgłoszenia"
            showLegend
            options={Object.entries(RODZAJE).map(([value, label]) => ({ value, label }))}
            value={rodzaj}
            onChange={(v) => setRodzaj(v as Rodzaj)}
          />
          <Textarea
            label="Co trzeba zmienić?"
            description={`Do ${MAKS_TRESCI} znaków. Autorka dostanie razem ze zgłoszeniem Twój adres e-mail, żeby mogła odpowiedzieć.`}
            value={tresc}
            onChange={(e) => setTresc(e.target.value)}
            maxLength={MAKS_TRESCI}
            rows={5}
            required
          />
          {blad && <StateBlock state="error" title="Zgłoszenie nie zostało wysłane" description={blad} scope="inline" />}
        </div>
      </Dialog>
    </div>
  );
}

async function wyslijNaSerwer(zgloszenie: Zgloszenie): Promise<{ blad?: string }> {
  const sb = supabase();
  if (!sb) return { blad: 'Konta są wyłączone.' };
  const { data, error } = await sb.auth.getSession();
  if (error) console.error('[ZglosPoprawke] reading the session failed', error);
  const token = data.session?.access_token;
  if (!token) return { blad: 'Brak sesji. Zaloguj się ponownie.' };
  let odpowiedz: Response;
  try {
    odpowiedz = await fetch('/zgloszenie', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(zgloszenie),
    });
  } catch (err) {
    console.error('[ZglosPoprawke] request failed', err);
    return { blad: 'Nie udało się połączyć z serwerem. Sprawdź internet i spróbuj jeszcze raz.' };
  }
  const cialo = (await odpowiedz.json().catch(() => null)) as { wyslano?: true; blad?: string } | null;
  if (odpowiedz.ok && cialo?.wyslano) return {};
  return { blad: cialo?.blad ?? `Serwer odpowiedział kodem ${odpowiedz.status}. Spróbuj jeszcze raz za chwilę.` };
}

/**
 * Pointing: a bar at the top says what to do, the piece of content under the
 * pointer or focus is outlined, and a click, a tap or Enter chooses it. While
 * it lasts, clicks choose instead of following links, and every piece of
 * content can be reached with Tab (one that was focusable only from code, like
 * a quiz's result title, too).
 */
function TrybWskazywania({
  onWybierz,
  onBezWskazywania,
  onAnuluj,
}: {
  onWybierz: (el: HTMLElement) => void;
  onBezWskazywania: () => void;
  onAnuluj: () => void;
}) {
  const pasek = useRef<HTMLDivElement>(null);
  const instrukcja = useRef<HTMLParagraphElement>(null);
  const [ramka, setRamka] = useState<DOMRect | null>(null);

  // The handlers are new on every render of ZglosPoprawke; the listeners read the latest ones.
  const wywolania = useRef({ onWybierz, onAnuluj });
  useEffect(() => {
    wywolania.current = { onWybierz, onAnuluj };
  });

  useEffect(() => {
    let podswietlony: HTMLElement | null = null;
    let klatka = 0;
    const odswiez = () => {
      cancelAnimationFrame(klatka);
      klatka = requestAnimationFrame(() => setRamka(podswietlony?.getBoundingClientRect() ?? null));
    };
    const podswietl = (el: HTMLElement | null) => {
      if (el === podswietlony) return;
      podswietlony = el;
      odswiez();
    };
    const wPasku = (cel: EventTarget | null) => cel instanceof Node && Boolean(pasek.current?.contains(cel));

    // Tab reaches every piece of content while pointing; afterwards each gets back the tabindex it had.
    const kandydaci = wszyscyKandydaci();
    const poprzednie = new Map<HTMLElement, string | null>();
    for (const el of kandydaci) {
      const t = el.getAttribute('tabindex');
      if (t !== null && Number(t) >= 0) continue;
      poprzednie.set(el, t);
      el.setAttribute('tabindex', '0');
    }

    const ruch = (e: PointerEvent) => podswietl(kandydat(document.elementFromPoint(e.clientX, e.clientY)));
    const fokus = (e: FocusEvent) => podswietl(kandydat(e.target));
    const klik = (e: MouseEvent) => {
      if (wPasku(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      const k = kandydat(e.target);
      if (k) wywolania.current.onWybierz(k);
    };
    const klawisz = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        wywolania.current.onAnuluj();
        return;
      }
      // The bar comes last in the document; Tab from its last button goes on to the first piece of content.
      const przyciski = pasek.current?.querySelectorAll('button');
      if (e.key === 'Tab' && !e.shiftKey && przyciski?.length && e.target === przyciski[przyciski.length - 1] && kandydaci[0]) {
        e.preventDefault();
        kandydaci[0].focus();
        return;
      }
      if ((e.key === 'Enter' || e.key === ' ') && !wPasku(e.target)) {
        const k = kandydat(e.target);
        if (!k) return;
        e.preventDefault();
        e.stopPropagation();
        wywolania.current.onWybierz(k);
      }
    };

    document.documentElement.classList.add('wskazywanie-aktywne');
    document.addEventListener('pointermove', ruch, { passive: true });
    document.addEventListener('focusin', fokus);
    document.addEventListener('click', klik, true);
    document.addEventListener('keydown', klawisz, true);
    window.addEventListener('scroll', odswiez, { passive: true });
    window.addEventListener('resize', odswiez);
    instrukcja.current?.focus();

    return () => {
      cancelAnimationFrame(klatka);
      for (const [el, t] of poprzednie) {
        if (t === null) el.removeAttribute('tabindex');
        else el.setAttribute('tabindex', t);
      }
      document.documentElement.classList.remove('wskazywanie-aktywne');
      document.removeEventListener('pointermove', ruch);
      document.removeEventListener('focusin', fokus);
      document.removeEventListener('click', klik, true);
      document.removeEventListener('keydown', klawisz, true);
      window.removeEventListener('scroll', odswiez);
      window.removeEventListener('resize', odswiez);
    };
  }, []);

  return createPortal(
    <>
      <div className="wskazywanie" ref={pasek} role="region" aria-label="Wskazywanie miejsca zgłoszenia">
        <p ref={instrukcja} tabIndex={-1}>
          Wskaż miejsce, którego dotyczy zgłoszenie: kliknij fragment albo przejdź do niego klawiszem Tab i naciśnij
          Enter.
        </p>
        <div className="row">
          <Button variant="secondary" size="sm" onClick={onBezWskazywania}>
            Bez wskazywania
          </Button>
          <Button variant="ghost" size="sm" onClick={onAnuluj}>
            Anuluj
          </Button>
        </div>
      </div>
      {ramka && (
        <div
          className="wskazywanie__ramka"
          aria-hidden="true"
          style={{ top: ramka.top, left: ramka.left, width: ramka.width, height: ramka.height }}
        />
      )}
    </>,
    document.body,
  );
}
