'use client';

import { useEffect, useRef, useState } from 'react';
import { kierunekKlawisza, krok, odczytajPodglad, type DanePodgladu } from '@/lib/podglad';
import { Button } from './ds';
import { Kredyt } from './Photo';

type Stan = { zdjecia: DanePodgladu[]; przyciski: HTMLElement[]; i: number };

/**
 * The photo viewer: a photo opened from the page (Photo's button) fills the
 * screen, uncropped, with its caption and credit. In a group (a gallery, a
 * margin with several photos, a species plate: `[data-galeria]`) the buttons
 * and the arrow keys step through it. Escape or a click beside the photo
 * closes it, and the focus goes back to the photo last shown.
 *
 * Not Big Hat's Dialog: that is for a decision or a short task, with a title
 * and a size; a photo needs the whole screen (DS-GAPS.md).
 */
export function PodgladZdjec() {
  const okno = useRef<HTMLDialogElement>(null);
  const zdjecie = useRef<HTMLElement>(null);
  const otwierajacy = useRef<HTMLElement | null>(null);
  const [stan, setStan] = useState<Stan | null>(null);

  useEffect(() => {
    const klik = (e: MouseEvent) => {
      const przycisk = (e.target as Element | null)?.closest<HTMLElement>('.photo__powieksz');
      if (!przycisk) return;
      const grupa = przycisk.closest('[data-galeria]');
      const przyciski = grupa ? [...grupa.querySelectorAll<HTMLElement>('.photo__powieksz')] : [przycisk];
      // Photo checks its data at build, so a photo that cannot be read is a bug: it is left out, not the group.
      const czytelne = przyciski.flatMap((p) => {
        const d = odczytajPodglad(p.dataset.podglad);
        if (!d) console.error('[PodgladZdjec] unreadable data-podglad, photo left out', p);
        return d ? [{ d, p }] : [];
      });
      const i = czytelne.findIndex((c) => c.p === przycisk);
      if (i < 0) return;
      otwierajacy.current = przycisk;
      setStan({ zdjecia: czytelne.map((c) => c.d), przyciski: czytelne.map((c) => c.p), i });
    };
    document.addEventListener('click', klik);
    return () => document.removeEventListener('click', klik);
  }, []);

  useEffect(() => {
    const d = okno.current;
    if (!stan || !d || d.open) return;
    d.showModal();
    // The photo, not the close button: the keyboard reaches the buttons with Tab.
    zdjecie.current?.focus();
  }, [stan]);

  const zamknij = () => okno.current?.close();
  const przejdz = (o: -1 | 1) =>
    setStan((s) => {
      if (!s) return s;
      const i = krok(s.i, s.zdjecia.length, o);
      // Closing returns to the photo now shown, so the reader stays where she looked last.
      otwierajacy.current = s.przyciski[i] ?? otwierajacy.current;
      return { ...s, i };
    });

  const biezace = stan?.zdjecia[stan.i];
  const ile = stan?.zdjecia.length ?? 0;

  return (
    <dialog
      ref={okno}
      className="podglad scena"
      aria-label={biezace?.podpis || biezace?.alt || 'Zdjęcie'}
      onClose={() => {
        setStan(null);
        otwierajacy.current?.focus();
      }}
      onKeyDown={(e) => {
        const o = kierunekKlawisza(e.key);
        if (o !== 0) {
          e.preventDefault();
          przejdz(o);
        }
      }}
      onClick={(e) => {
        // A click on the dark area around the photo; the letterbox around a contained image is the image's box.
        const cel = e.target as Element;
        if (cel instanceof HTMLImageElement) {
          const r = cel.getBoundingClientRect();
          const skala = Math.min(r.width / cel.naturalWidth, r.height / cel.naturalHeight);
          const w = cel.naturalWidth * skala;
          const h = cel.naturalHeight * skala;
          const x = e.clientX - r.left - (r.width - w) / 2;
          const y = e.clientY - r.top - (r.height - h) / 2;
          if (x >= 0 && x <= w && y >= 0 && y <= h) return;
          zamknij();
        } else if (!cel.closest('button, a, figcaption, .podglad__licznik')) zamknij();
      }}
    >
      {biezace && (
        <>
          <div className="podglad__pasek">
            <p className="podglad__licznik" aria-live="polite">
              {ile > 1 ? `Zdjęcie ${stan!.i + 1} z ${ile}` : ''}
            </p>
            <Button variant="secondary" size="sm" onClick={zamknij}>
              Zamknij
            </Button>
          </div>
          <figure ref={zdjecie} className="podglad__zdjecie" tabIndex={-1}>
            <div className="podglad__kadr">
              {/* eslint-disable-next-line @next/next/no-img-element -- Commons serves its own sizes; srcset picks one */}
              <img
                key={biezace.src}
                className="podglad__img"
                src={biezace.src}
                srcSet={biezace.srcSet}
                sizes={biezace.srcSet ? '100vw' : undefined}
                width={biezace.width}
                height={biezace.height}
                alt={biezace.alt}
              />
            </div>
            <figcaption className="podglad__podpis">
              {biezace.podpis && <span className="podglad__tytul">{biezace.podpis}</span>}
              <Kredyt zdjecie={biezace} />
            </figcaption>
          </figure>
          {ile > 1 && (
            <div className="podglad__nawigacja">
              <Button variant="secondary" size="sm" onClick={() => przejdz(-1)}>
                Poprzednie zdjęcie
              </Button>
              <Button variant="secondary" size="sm" onClick={() => przejdz(1)}>
                Następne zdjęcie
              </Button>
            </div>
          )}
        </>
      )}
    </dialog>
  );
}
