'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { dopisz, OKNA_WYGLADZANIA, wKursie, wygladz, wykryte, type Uslyszany, type Wynik } from '@/lib/glos';
import { utworzMagazyn } from '@/lib/magazyn';
import { Badge, Button, Checkbox, Progress, StateBlock } from './ds';

/** BirdNET Live's files, laid out by scripts/birdnet.sh. */
const BAZA = '/birdnet';
const CZESTOTLIWOSC = 48000;
const OKNO = CZESTOTLIWOSC * 3;
/** How often the last 3 seconds are scored. */
const CO_ILE_MS = 1500;

/**
 * Whether the model was downloaded before (so the page loads it at once from
 * the browser's cache instead of asking again) and whether to narrow the
 * species to this place and week. A convenience, not in backups.
 */
type Ustawienia = { pobrany?: boolean; zMiejscem?: boolean };
const isUstawienia = (v: unknown): v is Ustawienia => typeof v === 'object' && v !== null && !Array.isArray(v);
const magazyn = utworzMagazyn<Ustawienia>('wor:glos:v1', isUstawienia);

type Stan =
  | { rodzaj: 'sprawdzanie' }
  | { rodzaj: 'komputer' }
  | { rodzaj: 'do-pobrania' }
  | { rodzaj: 'ladowanie'; postep: number }
  | { rodzaj: 'blad-modelu'; webgl: boolean }
  | { rodzaj: 'gotowy' }
  | { rodzaj: 'slucham' }
  | { rodzaj: 'blad-mikrofonu'; odmowa: boolean };

/**
 * "Rozpoznaj po głosie": BirdNET listens through the phone's microphone and
 * names the birds it hears, entirely on the phone. Phones only: the model is
 * meant for the field, and a laptop's microphone hears the room.
 * `poLacinie` maps the atlas's and the marshes' Latin names to their pages.
 */
export function RozpoznajGlos({ poLacinie }: { poLacinie: Record<string, string> }) {
  const ustawienia = magazyn.useMagazyn();
  const [stan, setStan] = useState<Stan>({ rodzaj: 'sprawdzanie' });
  const [teraz, setTeraz] = useState<Wynik[]>([]);
  const [uslyszane, setUslyszane] = useState<Uslyszany[]>([]);
  const [polozenie, setPolozenie] = useState<'brak' | 'szukam' | 'jest' | 'odmowa'>('brak');
  const worker = useRef<Worker | null>(null);
  const audio = useRef<{ kontekst: AudioContext; strumien: MediaStream; wezel: AudioWorkletNode } | null>(null);
  const bufor = useRef({ probki: new Float32Array(OKNO), zapis: 0 });
  const okna = useRef<Wynik[][]>([]);
  const blokada = useRef<WakeLockSentinel | null>(null);
  const zMiejscem = Boolean(ustawienia?.zMiejscem);
  const zMiejscemRef = useRef(zMiejscem);
  const mapa = useMemo(() => new Map(Object.entries(poLacinie)), [poLacinie]);

  useEffect(() => {
    zMiejscemRef.current = zMiejscem;
  }, [zMiejscem]);

  const zaladuj = useCallback(() => {
    worker.current?.terminate();
    setStan({ rodzaj: 'ladowanie', postep: 0 });
    const params = new URLSearchParams({ tf: `${BAZA}/tf.min.js`, root: `${BAZA}/models`, lang: 'pl' });
    const w = new Worker(`/glos-worker.js?${params}`);
    worker.current = w;
    w.onerror = (e) => {
      console.error('[glos] worker failed', e);
      setStan({ rodzaj: 'blad-modelu', webgl: false });
    };
    w.onmessage = ({ data }) => {
      if (typeof data?.progress === 'number') setStan({ rodzaj: 'ladowanie', postep: data.progress });
      if (data?.message === 'error') {
        console.error('[glos] model failed', data.error);
        w.terminate();
        setStan({ rodzaj: 'blad-modelu', webgl: /webgl|not registered/i.test(String(data.error)) });
      }
      if (data?.message === 'loaded') {
        magazyn.zapisz({ ...magazyn.odczytaj(), pobrany: true });
        setStan((s) => (s.rodzaj === 'ladowanie' ? { rodzaj: 'gotowy' } : s));
      }
      if (data?.message === 'pooled') {
        okna.current = [...okna.current, data.pooled as Wynik[]].slice(-OKNA_WYGLADZANIA);
        const wykryteTeraz = wykryte(wygladz(okna.current), { zMiejscem: zMiejscemRef.current }).slice(0, 5);
        setTeraz(wykryteTeraz);
        if (wykryteTeraz.length) setUslyszane((l) => dopisz(l, wykryteTeraz, Date.now()));
      }
    };
  }, []);

  // Phones only; a phone that downloaded the model before loads it straight away.
  useEffect(() => {
    if (!ustawienia || stan.rodzaj !== 'sprawdzanie') return;
    const telefon = window.matchMedia('(pointer: coarse)').matches && Boolean(navigator.mediaDevices?.getUserMedia);
    /* eslint-disable react-hooks/set-state-in-effect -- the device is only known in the browser, after mount */
    if (!telefon) setStan({ rodzaj: 'komputer' });
    else if (ustawienia.pobrany) zaladuj();
    else setStan({ rodzaj: 'do-pobrania' });
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [ustawienia, stan.rodzaj, zaladuj]);

  const zatrzymaj = useCallback(() => {
    const a = audio.current;
    audio.current = null;
    if (a) {
      a.wezel.port.onmessage = null;
      a.wezel.disconnect();
      a.strumien.getTracks().forEach((t) => t.stop());
      void a.kontekst.close();
    }
    void blokada.current?.release().catch(() => {});
    blokada.current = null;
    okna.current = [];
    setTeraz([]);
    setStan((s) => (s.rodzaj === 'slucham' ? { rodzaj: 'gotowy' } : s));
  }, []);

  const sluchaj = async () => {
    try {
      const strumien = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: CZESTOTLIWOSC, echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      const kontekst = new AudioContext({ sampleRate: CZESTOTLIWOSC });
      if (kontekst.state === 'suspended') await kontekst.resume();
      await kontekst.audioWorklet.addModule(`${BAZA}/audio-processor.js`);
      const zrodlo = kontekst.createMediaStreamSource(strumien);
      // Wind and traffic rumble lie below the birds; BirdNET Live filters it the same way.
      const filtr = kontekst.createBiquadFilter();
      filtr.type = 'highpass';
      filtr.frequency.value = 200;
      const wezel = new AudioWorkletNode(kontekst, 'audio-processor');
      bufor.current = { probki: new Float32Array(OKNO), zapis: 0 };
      wezel.port.onmessage = ({ data }: MessageEvent<Float32Array>) => {
        const b = bufor.current;
        for (let i = 0; i < data.length; i++) {
          b.probki[b.zapis] = data[i];
          b.zapis = (b.zapis + 1) % OKNO;
        }
      };
      zrodlo.connect(filtr).connect(wezel).connect(kontekst.destination);
      audio.current = { kontekst, strumien, wezel };
      blokada.current = await navigator.wakeLock?.request('screen').catch(() => null);
      setStan({ rodzaj: 'slucham' });
    } catch (err) {
      console.error('[glos] microphone failed', err);
      zatrzymaj();
      setStan({ rodzaj: 'blad-mikrofonu', odmowa: err instanceof DOMException && err.name === 'NotAllowedError' });
    }
  };

  // Every 1.5 s, the last 3 seconds go to the model, oldest sample first.
  useEffect(() => {
    if (stan.rodzaj !== 'slucham') return;
    const id = window.setInterval(() => {
      const { probki, zapis } = bufor.current;
      const okno = new Float32Array(OKNO);
      okno.set(probki.subarray(zapis));
      okno.set(probki.subarray(0, zapis), OKNO - zapis);
      worker.current?.postMessage({ message: 'predict', pcmAudio: okno, overlapSec: 0 }, [okno.buffer]);
    }, CO_ILE_MS);
    return () => window.clearInterval(id);
  }, [stan.rodzaj]);

  // Listening stops when the phone locks or the page is left, as a recorder would.
  useEffect(() => {
    const ukryta = () => document.visibilityState === 'hidden' && zatrzymaj();
    document.addEventListener('visibilitychange', ukryta);
    return () => {
      document.removeEventListener('visibilitychange', ukryta);
      zatrzymaj();
      worker.current?.terminate();
    };
  }, [zatrzymaj]);

  const ustawMiejsce = (wlacz: boolean) => {
    magazyn.zapisz({ ...magazyn.odczytaj(), zMiejscem: wlacz });
    if (!wlacz || polozenie === 'jest') return;
    setPolozenie('szukam');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        worker.current?.postMessage({ message: 'area-scores', latitude: coords.latitude, longitude: coords.longitude });
        setPolozenie('jest');
      },
      () => {
        setPolozenie('odmowa');
        magazyn.zapisz({ ...magazyn.odczytaj(), zMiejscem: false });
      },
      { maximumAge: 60 * 60 * 1000, timeout: 15000 },
    );
  };

  if (stan.rodzaj === 'sprawdzanie') {
    return <StateBlock state="loading" title="Sprawdzanie telefonu" scope="section" />;
  }
  if (stan.rodzaj === 'komputer') {
    return (
      <StateBlock
        state="empty"
        title="Rozpoznawanie po głosie działa na telefonie"
        description="Otwórz tę stronę na telefonie, w terenie. Mikrofon komputera słyszy głównie pokój."
        scope="section"
      />
    );
  }
  if (stan.rodzaj === 'do-pobrania') {
    return (
      <div className="glos__start">
        <p>
          Model BirdNET waży ok. 58 MB. Pobierz go przez Wi-Fi, jeszcze przed wyjściem w teren. Potem zostaje w
          telefonie, a nagranie nigdy go nie opuszcza: rozpoznawanie dzieje się na miejscu.
        </p>
        <Button onClick={zaladuj}>Pobierz model</Button>
      </div>
    );
  }
  if (stan.rodzaj === 'ladowanie') {
    return <Progress label="Wczytywanie modelu BirdNET" value={stan.postep} max={100} valueText={`${stan.postep}%`} />;
  }
  if (stan.rodzaj === 'blad-modelu') {
    return (
      <StateBlock
        state="error"
        title={stan.webgl ? 'Ta przeglądarka nie uruchomi modelu' : 'Nie udało się wczytać modelu'}
        description={
          stan.webgl
            ? 'Model potrzebuje grafiki WebGL. Spróbuj w aktualnym Safari albo Chrome.'
            : 'Sprawdź połączenie z internetem i spróbuj jeszcze raz.'
        }
        action={stan.webgl ? undefined : <Button onClick={zaladuj}>Spróbuj ponownie</Button>}
        scope="section"
      />
    );
  }
  if (stan.rodzaj === 'blad-mikrofonu') {
    return (
      <StateBlock
        state="error"
        title={stan.odmowa ? 'Brak dostępu do mikrofonu' : 'Nie udało się włączyć mikrofonu'}
        description={
          stan.odmowa
            ? 'Zezwól tej stronie na mikrofon w ustawieniach przeglądarki, a potem spróbuj jeszcze raz.'
            : 'Zamknij inne aplikacje, które nagrywają, i spróbuj jeszcze raz.'
        }
        action={<Button onClick={() => setStan({ rodzaj: 'gotowy' })}>Spróbuj ponownie</Button>}
        scope="section"
      />
    );
  }

  const slucham = stan.rodzaj === 'slucham';
  return (
    <div className="glos">
      <div className="glos__sterowanie" data-slucham={slucham ? '' : undefined}>
        <Button size="lg" fullWidth variant={slucham ? 'secondary' : 'primary'} onClick={slucham ? zatrzymaj : () => void sluchaj()}>
          {slucham ? 'Zatrzymaj' : 'Słuchaj'}
        </Button>
        <Checkbox
          label="Tylko ptaki tego miejsca i pory roku"
          description={
            polozenie === 'szukam'
              ? 'Szukam położenia…'
              : polozenie === 'odmowa'
                ? 'Bez dostępu do położenia pokazuję wszystkie gatunki.'
                : 'Używa położenia telefonu. Nigdzie go nie wysyłam.'
          }
          checked={zMiejscem && polozenie !== 'odmowa'}
          onChange={(e) => ustawMiejsce(e.target.checked)}
        />
      </div>

      <section className="glos__teraz" aria-labelledby="glos-teraz" aria-live="polite">
        <h2 id="glos-teraz" className="glos__naglowek">
          Teraz słyszę
        </h2>
        {!slucham ? (
          <p className="muted">Stuknij „Słuchaj” i skieruj telefon w stronę ptaka.</p>
        ) : teraz.length === 0 ? (
          <p className="muted">Nasłuchuję…</p>
        ) : (
          <ul className="glos__lista">
            {teraz.map((w) => (
              <li key={w.index}>
                <Ptak lat={w.scientificName} pl={w.commonNameI18n} pewnosc={w.confidence} mapa={mapa} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {uslyszane.length > 0 && (
        <section className="glos__sesja" aria-labelledby="glos-sesja">
          <h2 id="glos-sesja" className="glos__naglowek">
            Usłyszane podczas tego wyjścia
          </h2>
          <ul className="glos__lista">
            {uslyszane.map((u) => (
              <li key={u.lat}>
                <Ptak lat={u.lat} pl={u.pl} pewnosc={u.pewnosc} mapa={mapa} czas={u.ostatnio} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Ptak({
  lat,
  pl,
  pewnosc,
  mapa,
  czas,
}: {
  lat: string;
  pl: string;
  pewnosc: number;
  mapa: ReadonlyMap<string, string>;
  czas?: number;
}) {
  const id = wKursie(lat, mapa);
  return (
    <div className="glos__ptak">
      <div className="glos__nazwy">
        <span className="glos__pl">{pl[0]?.toLocaleUpperCase('pl') + pl.slice(1)}</span>
        <span className="glos__lat" lang="la" translate="no">
          {lat}
        </span>
      </div>
      <div className="glos__ocena">
        <span className="glos__pewnosc">
          {Math.round(pewnosc * 100)}%<span className="visually-hidden"> pewności</span>
        </span>
        {czas !== undefined && (
          <span className="muted">{new Date(czas).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}</span>
        )}
      </div>
      {id && (
        <div className="glos__w-kursie">
          <Badge tone="success">W kursie</Badge>
          <Link href={`/gatunki/${id}`} className="text-link">
            Karta gatunku<span className="visually-hidden">: {pl}</span>
          </Link>
        </div>
      )}
    </div>
  );
}
