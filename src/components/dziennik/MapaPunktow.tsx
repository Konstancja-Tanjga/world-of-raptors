'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import type { Wspolrzedne } from '@/lib/punkty';

/** Where the map opens with nothing to show: Poland, whole. */
const POLSKA: Wspolrzedne = { szer: 52.1, dl: 19.4 };

export type PunktNaMapie = Wspolrzedne & { etykieta: string };

/**
 * An OpenStreetMap map (Leaflet), loaded only where a page asks for it
 * (`next/dynamic`, no server render: Leaflet needs the window). Big Hat has
 * no map (DS-GAPS.md); the colours come from the theme's accent.
 *
 * With `onWybierz` it is a picker: a tap or click places the point, shown
 * with the GPS accuracy as a circle when it has one. Picking needs a pointer,
 * so the form beside it always offers typed coordinates and "Użyj mojej
 * lokalizacji" too (WCAG 2.5.7); the map itself pans and zooms by keyboard.
 * Without it the map shows `punkty`, each with its label in a popup.
 */
export default function MapaPunktow({
  punkty = [],
  wybrany,
  dokladnosc,
  onWybierz,
  etykieta,
}: {
  punkty?: PunktNaMapie[];
  wybrany?: Wspolrzedne | null;
  /** Metres around `wybrany`. */
  dokladnosc?: number;
  onWybierz?: (p: Wspolrzedne) => void;
  etykieta: string;
}) {
  const kontener = useRef<HTMLDivElement>(null);
  const mapa = useRef<L.Map | null>(null);
  const warstwa = useRef<L.LayerGroup | null>(null);
  const wybierz = useRef(onWybierz);
  const [kafelkiNieDochodza, setKafelkiNieDochodza] = useState(false);
  const bladKafelkow = useRef<(() => void) | null>(null);
  useEffect(() => {
    wybierz.current = onWybierz;
    bladKafelkow.current = () => setKafelkiNieDochodza(true);
  }, [onWybierz]);

  // The map, once.
  useEffect(() => {
    if (!kontener.current) return;
    const m = L.map(kontener.current, { zoomControl: true, attributionControl: true });
    const kafelki = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(m);
    m.setView([POLSKA.szer, POLSKA.dl], 6);
    // wrap(): zoomed out, the world repeats sideways, and a tap on a copy would give a longitude past ±180.
    m.on('click', (e: L.LeafletMouseEvent) => {
      const p = e.latlng.wrap();
      wybierz.current?.({ szer: p.lat, dl: p.lng });
    });
    // Tiles that do not arrive (no signal in the field) leave a blank grid that still takes taps: say so.
    let bledyKafelkow = 0;
    kafelki.on('tileerror', () => {
      if (++bledyKafelkow === 3) bladKafelkow.current?.();
    });
    kafelki.on('tileload', () => {
      bledyKafelkow = 0;
    });
    warstwa.current = L.layerGroup().addTo(m);
    mapa.current = m;
    // The container may have been sized after Leaflet measured it (a section opened, fonts loaded).
    const obserwator = new ResizeObserver(() => m.invalidateSize());
    obserwator.observe(kontener.current);
    return () => {
      obserwator.disconnect();
      m.remove();
      mapa.current = null;
    };
  }, []);

  // What it shows, whenever that changes.
  useEffect(() => {
    const m = mapa.current;
    const w = warstwa.current;
    if (!m || !w) return;
    w.clearLayers();
    const akcent = getComputedStyle(kontener.current!).getPropertyValue('--wor-akcent').trim() || 'currentColor';
    const styl = { color: akcent, fillColor: akcent, weight: 2, fillOpacity: 0.6 };
    for (const p of punkty) {
      L.circleMarker([p.szer, p.dl], { ...styl, radius: 7 }).bindPopup(p.etykieta).addTo(w);
    }
    if (wybrany) {
      if (dokladnosc) L.circle([wybrany.szer, wybrany.dl], { ...styl, radius: dokladnosc, fillOpacity: 0.12, weight: 1 }).addTo(w);
      L.circleMarker([wybrany.szer, wybrany.dl], { ...styl, radius: 9, fillOpacity: 0.9 }).addTo(w);
      if (!m.getBounds().pad(-0.2).contains([wybrany.szer, wybrany.dl]) || m.getZoom() < 13) {
        m.setView([wybrany.szer, wybrany.dl], Math.max(m.getZoom(), 15));
      }
    } else if (punkty.length) {
      m.fitBounds(L.latLngBounds(punkty.map((p) => [p.szer, p.dl] as [number, number])).pad(0.2), { maxZoom: 14 });
    }
  }, [punkty, wybrany, dokladnosc]);

  return (
    <>
      <div ref={kontener} className="mapa-punktow" role="region" aria-label={etykieta} />
      {kafelkiNieDochodza && (
        <p role="status" className="muted">
          Mapa nie wczytuje się (słaby zasięg?). {onWybierz ? 'Wpisz współrzędne albo użyj lokalizacji telefonu.' : ''}
        </p>
      )}
    </>
  );
}
