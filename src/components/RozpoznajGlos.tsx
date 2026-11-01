'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CZESTOTLIWOSC,
  dopisz,
  dopiszProbki,
  nowyBufor,
  rozwin,
  wKursie,
  wygladz,
  wykryte,
  type Uslyszany,
  type Wynik,
} from '@/lib/glos';
import { utworzMagazyn } from '@/lib/magazyn';
import { Badge, Button, Checkbox, Progress, StateBlock } from './ds';
import { useOstrzezenieZapisu } from './useOstrzezenieZapisu';

/** BirdNET Live's files, laid out by scripts/birdnet.sh in a folder named after its commit. */
const WERSJA = '6ab67ac';
const BAZA = `/birdnet/${WERSJA}`;
/** How often the last 3 seconds are scored. */
const CO_ILE_MS = 1500;
/** Loading gives up when no progress arrives for this long (a field connection that stalls). */
const LIMIT_LADOWANIA_MS = 45_000;
/** Listening gives up when the model has not answered for this long (the phone killed the worker). */
const LIMIT_ODPOWIEDZI_MS = 10_000;
/** How long the worker may take to apply a location before the filter says it failed. */
const LIMIT_MIEJSCA_MS = 15_000;

/**
 * Whether the model was downloaded before and whether to narrow the species to
 * this place and week. A phone that downloaded it loads it at once, from the
 * browser's cache (or again, without asking, if the browser evicted it). A
 * convenience, not in backups.
 */
type Ustawienia = { pobrany?: boolean; zMiejscem?: boolean };
const isUstawienia = (v: unknown): v is Ustawienia => typeof v === 'object' && v !== null && !Array.isArray(v);
const magazyn = utworzMagazyn<Ustawienia>('wor:glos:v1', isUstawienia);

type PowodMikrofonu = 'odmowa' | 'brak' | 'zajety' | 'nieobslugiwana' | 'inny';
type Stan =
  | { rodzaj: 'sprawdzanie' }
  | { rodzaj: 'komputer' }
  | { rodzaj: 'brak-webgl' }
  | { rodzaj: 'do-pobrania' }
  | { rodzaj: 'ladowanie'; postep: number }
  | { rodzaj: 'blad-modelu'; webgl: boolean }
  | { rodzaj: 'gotowy'; ekranZgasl?: boolean }
  | { rodzaj: 'uruchamianie' }
  | { rodzaj: 'slucham' }
  | { rodzaj: 'blad-rozpoznawania' }
  | { rodzaj: 'blad-mikrofonu'; powod: PowodMikrofonu };

type Polozenie = 'brak' | 'szukam' | 'jest' | 'odmowa' | 'blad';

/** Thrown inside the start when it was cancelled (stopped, hidden or left) while waiting. */
const ANULOWANO = Symbol('anulowano');

class NieobslugiwanaPrzegladarka extends Error {}

function powodMikrofonu(err: unknown): PowodMikrofonu {
  if (err instanceof NieobslugiwanaPrzegladarka || err instanceof TypeError) return 'nieobslugiwana';
  const nazwa = err instanceof DOMException ? err.name : '';
  if (nazwa === 'NotAllowedError' || nazwa === 'SecurityError') return 'odmowa';
  if (nazwa === 'NotFoundError' || nazwa === 'OverconstrainedError') return 'brak';
  if (nazwa === 'NotReadableError' || nazwa === 'AbortError') return 'zajety';
  if (nazwa === 'NotSupportedError') return 'nieobslugiwana';
  return 'inny';
}

/** A first, cheap check for WebGL in workers, which the model needs; glos-worker.js asks TensorFlow.js itself before downloading anything. */
function jestWebGL() {
  if (typeof OffscreenCanvas === 'undefined') return false;
  const canvas = new OffscreenCanvas(1, 1);
  return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
}

/**
 * "Rozpoznaj po głosie": BirdNET listens through the phone's microphone and
 * names the birds it hears, entirely on the phone. Phones only (a coarse
 * pointer, so tablets too): the model is meant for the field, and a laptop's
 * microphone hears the room. `poLacinie` maps the atlas's and the marshes'
 * Latin names to their pages.
 */
export function RozpoznajGlos({ poLacinie }: { poLacinie: Record<string, string> }) {
  const ustawienia = magazyn.useMagazyn();
  const sprawdzZapis = useOstrzezenieZapisu();
  const [stan, setStan] = useState<Stan>({ rodzaj: 'sprawdzanie' });
  const [teraz, setTeraz] = useState<Wynik[]>([]);
  const [uslyszane, setUslyszane] = useState<Uslyszany[]>([]);
  const [polozenie, setPolozenie] = useState<Polozenie>('brak');
  const mapa = useMemo(() => new Map(Object.entries(poLacinie)), [poLacinie]);

  const worker = useRef<Worker | null>(null);
  /** Whether the current worker has loaded the model, and has sent a result yet (it repeats the last one when given a location). */
  const model = useRef({ wczytany: false, bylWynik: false, pominNastepny: false });
  const audio = useRef<{ kontekst: AudioContext; strumien: MediaStream; wezel: AudioWorkletNode } | null>(null);
  const blokada = useRef<WakeLockSentinel | null>(null);
  const bufor = useRef(nowyBufor());
  const okna = useRef<Wynik[][]>([]);
  /** Bumped by every start and stop, so a start still waiting on the phone knows it was cancelled. */
  const sesja = useRef(0);
  const slucham = useRef(false);
  /** When the prediction now in the worker was sent (one at a time, so a slow phone does not fall behind). */
  const wToku = useRef<number | null>(null);
  const wspolrzedne = useRef<{ latitude: number; longitude: number } | null>(null);
  const filtrMiejsca = useRef(false);
  const timerLadowania = useRef<number | undefined>(undefined);
  const timerMiejsca = useRef<number | undefined>(undefined);

  const zMiejscem = Boolean(ustawienia?.zMiejscem);
  useEffect(() => {
    filtrMiejsca.current = zMiejscem && polozenie === 'jest';
  }, [zMiejscem, polozenie]);

  const zwolnijAudio = useCallback(() => {
    sesja.current++;
    slucham.current = false;
    wToku.current = null;
    const a = audio.current;
    audio.current = null;
    if (a) {
      a.wezel.port.onmessage = null;
      a.wezel.disconnect();
      a.strumien.getTracks().forEach((t) => t.stop());
      a.kontekst.close().catch((err) => console.warn('[glos] could not close audio', err));
    }
    blokada.current?.release().catch((err) => console.warn('[glos] could not release the wake lock', err));
    blokada.current = null;
    okna.current = [];
    setTeraz([]);
  }, []);

  const zatrzymaj = useCallback(
    (ekranZgasl = false) => {
      zwolnijAudio();
      setStan((s) => (s.rodzaj === 'slucham' || s.rodzaj === 'uruchamianie' ? { rodzaj: 'gotowy', ekranZgasl } : s));
    },
    [zwolnijAudio],
  );

  /** Sends the location to a loaded model; the filter counts once the worker confirms. */
  const wyslijPolozenie = useCallback(() => {
    const w = worker.current;
    if (!w || !model.current.wczytany) return; // sent on 'loaded'
    const wyslij = (c: { latitude: number; longitude: number }) => {
      model.current.pominNastepny = model.current.bylWynik;
      w.postMessage({ message: 'area-scores', latitude: c.latitude, longitude: c.longitude });
      window.clearTimeout(timerMiejsca.current);
      timerMiejsca.current = window.setTimeout(() => {
        console.error('[glos] the location model did not answer');
        setPolozenie('blad');
      }, LIMIT_MIEJSCA_MS);
    };
    setPolozenie('szukam');
    if (wspolrzedne.current) return wyslij(wspolrzedne.current);
    if (!navigator.geolocation) return setPolozenie('blad');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        wspolrzedne.current = { latitude: coords.latitude, longitude: coords.longitude };
        if (worker.current === w) wyslij(wspolrzedne.current);
      },
      (err) => {
        console.warn('[glos] no location', err.code, err.message);
        if (err.code === err.PERMISSION_DENIED) {
          setPolozenie('odmowa');
          sprawdzZapis(magazyn.zapisz({ ...magazyn.odczytaj(), zMiejscem: false }));
        } else setPolozenie('blad');
      },
      { maximumAge: 60 * 60 * 1000, timeout: LIMIT_MIEJSCA_MS },
    );
  }, [sprawdzZapis]);

  const zakonczWorker = useCallback(() => {
    window.clearTimeout(timerLadowania.current);
    window.clearTimeout(timerMiejsca.current);
    worker.current?.terminate();
    worker.current = null;
  }, []);

  /** A worker failure: while loading it is the model's; after that, recognition stopped, and so does the microphone. */
  const awaria = useCallback(
    (blad: string) => {
      console.error('[glos] model failed', blad);
      zakonczWorker();
      zwolnijAudio();
      const webgl = /webgl|not registered/i.test(blad);
      setStan((s) =>
        s.rodzaj === 'blad-modelu' ? s : s.rodzaj === 'ladowanie' || webgl ? { rodzaj: 'blad-modelu', webgl } : { rodzaj: 'blad-rozpoznawania' },
      );
    },
    [zakonczWorker, zwolnijAudio],
  );

  const zaladuj = useCallback(() => {
    zakonczWorker();
    model.current = { wczytany: false, bylWynik: false, pominNastepny: false };
    setPolozenie('brak');
    setStan({ rodzaj: 'ladowanie', postep: 0 });
    const params = new URLSearchParams({
      worker: `${BAZA}/birdnet-worker.js`,
      tfjs: `${BAZA}/tf.min.js`,
      tf: '/glos-tf-wczytany.js',
      root: `${BAZA}/models`,
      lang: 'pl',
    });
    const w = new Worker(`/glos-worker.js?${params}`);
    worker.current = w;
    const czuwaj = () => {
      window.clearTimeout(timerLadowania.current);
      timerLadowania.current = window.setTimeout(() => awaria('loading stalled'), LIMIT_LADOWANIA_MS);
    };
    czuwaj();
    w.onerror = (e) => awaria(e.message || 'worker error');
    w.onmessage = ({ data }) => {
      if (worker.current !== w) return;
      if (typeof data?.progress === 'number') {
        czuwaj();
        setStan((s) => (s.rodzaj === 'ladowanie' ? { rodzaj: 'ladowanie', postep: data.progress } : s));
      }
      if (data?.message === 'error') awaria(String(data.error));
      if (data?.message === 'loaded') {
        window.clearTimeout(timerLadowania.current);
        model.current.wczytany = true;
        magazyn.zapisz({ ...magazyn.odczytaj(), pobrany: true }); // bookkeeping: if refused, the next visit just asks again
        setStan((s) => (s.rodzaj === 'ladowanie' ? { rodzaj: 'gotowy' } : s));
        if (magazyn.odczytaj().zMiejscem) wyslijPolozenie();
      }
      if (data?.message === 'area-scores') {
        window.clearTimeout(timerMiejsca.current);
        setPolozenie('jest');
      }
      if (data?.message === 'pooled') {
        wToku.current = null;
        // The worker repeats its last result after a location; it is not a new window.
        if (model.current.pominNastepny) {
          model.current.pominNastepny = false;
          return;
        }
        model.current.bylWynik = true;
        if (!slucham.current) return;
        okna.current = [...okna.current, data.pooled as Wynik[]];
        const wykryteTeraz = wykryte(wygladz(okna.current), { zMiejscem: filtrMiejsca.current });
        setTeraz(wykryteTeraz);
        if (wykryteTeraz.length) setUslyszane((l) => dopisz(l, wykryteTeraz, Date.now()));
      }
    };
  }, [awaria, wyslijPolozenie, zakonczWorker]);

  // Phones with WebGL only; a phone that downloaded the model before loads it straight away.
  useEffect(() => {
    if (!ustawienia || stan.rodzaj !== 'sprawdzanie') return;
    const telefon = window.matchMedia('(pointer: coarse)').matches && Boolean(navigator.mediaDevices?.getUserMedia);
    /* eslint-disable react-hooks/set-state-in-effect -- the device is only known in the browser, after mount */
    if (!telefon) setStan({ rodzaj: 'komputer' });
    else if (!jestWebGL()) setStan({ rodzaj: 'brak-webgl' });
    else if (ustawienia.pobrany) zaladuj();
    else setStan({ rodzaj: 'do-pobrania' });
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [ustawienia, stan.rodzaj, zaladuj]);

  const sluchaj = async () => {
    if (stan.rodzaj !== 'gotowy') return;
    setStan({ rodzaj: 'uruchamianie' });
    const moja = ++sesja.current;
    const sprawdz = () => {
      if (sesja.current !== moja) throw ANULOWANO;
    };
    let strumien: MediaStream | undefined;
    let kontekst: AudioContext | undefined;
    let lock: WakeLockSentinel | null = null;
    try {
      if (typeof AudioWorkletNode === 'undefined') throw new NieobslugiwanaPrzegladarka('no AudioWorklet');
      strumien = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: CZESTOTLIWOSC, echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      sprawdz();
      kontekst = new AudioContext({ sampleRate: CZESTOTLIWOSC });
      // The model hears time in samples: at another rate every call would be pitched and paced wrongly.
      if (kontekst.sampleRate !== CZESTOTLIWOSC) throw new NieobslugiwanaPrzegladarka(`sample rate ${kontekst.sampleRate}`);
      if (kontekst.state === 'suspended') await kontekst.resume();
      await kontekst.audioWorklet.addModule(`${BAZA}/audio-processor.js`);
      sprawdz();
      const zrodlo = kontekst.createMediaStreamSource(strumien);
      // Wind and traffic rumble lie below the birds: a 200 Hz Butterworth highpass, as in BirdNET Live.
      const filtr = kontekst.createBiquadFilter();
      filtr.type = 'highpass';
      filtr.frequency.value = 200;
      filtr.Q.value = 0.707;
      const wezel = new AudioWorkletNode(kontekst, 'audio-processor');
      bufor.current = nowyBufor();
      wezel.port.onmessage = ({ data }: MessageEvent<Float32Array>) => dopiszProbki(bufor.current, data);
      zrodlo.connect(filtr).connect(wezel).connect(kontekst.destination);
      lock = (await navigator.wakeLock?.request('screen').catch((err) => console.warn('[glos] no wake lock', err))) ?? null;
      sprawdz();
      audio.current = { kontekst, strumien, wezel };
      blokada.current = lock;
      okna.current = [];
      slucham.current = true;
      setStan({ rodzaj: 'slucham' });
    } catch (err) {
      strumien?.getTracks().forEach((t) => t.stop());
      kontekst?.close().catch((e) => console.warn('[glos] could not close audio', e));
      lock?.release().catch((e) => console.warn('[glos] could not release the wake lock', e));
      if (err === ANULOWANO) return;
      console.error('[glos] microphone failed', err);
      setStan({ rodzaj: 'blad-mikrofonu', powod: powodMikrofonu(err) });
    }
  };

  // Every 1.5 s the last 3 seconds go to the model, unless it is still busy with the previous ones.
  useEffect(() => {
    if (stan.rodzaj !== 'slucham') return;
    const id = window.setInterval(() => {
      if (wToku.current !== null) {
        if (Date.now() - wToku.current > LIMIT_ODPOWIEDZI_MS) awaria('no answer while listening');
        return;
      }
      const okno = rozwin(bufor.current);
      wToku.current = Date.now();
      worker.current?.postMessage({ message: 'predict', pcmAudio: okno, overlapSec: 0 }, [okno.buffer]);
    }, CO_ILE_MS);
    return () => window.clearInterval(id);
  }, [stan.rodzaj, awaria]);

  // Listening stops when the screen goes off or the page is left, as a recorder would.
  useEffect(() => {
    // Also cancels a start still waiting for the microphone.
    const ukryta = () => document.visibilityState === 'hidden' && zatrzymaj(slucham.current);
    document.addEventListener('visibilitychange', ukryta);
    return () => {
      document.removeEventListener('visibilitychange', ukryta);
      zwolnijAudio();
      zakonczWorker();
    };
  }, [zatrzymaj, zwolnijAudio, zakonczWorker]);

  const ustawMiejsce = (wlacz: boolean) => {
    sprawdzZapis(magazyn.zapisz({ ...magazyn.odczytaj(), zMiejscem: wlacz }));
    if (!wlacz) {
      window.clearTimeout(timerMiejsca.current);
      setPolozenie((p) => (p === 'jest' ? p : 'brak'));
      return;
    }
    if (polozenie !== 'jest') wyslijPolozenie();
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
  if (stan.rodzaj === 'brak-webgl') {
    return (
      <StateBlock
        state="error"
        title="Ta przeglądarka nie uruchomi modelu"
        description="Model potrzebuje grafiki WebGL. Spróbuj w aktualnym Safari albo Chrome."
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
    return (
      <div className="glos__start">
        <Progress label="Wczytywanie modelu BirdNET" value={stan.postep} max={100} valueText={`${stan.postep}%`} />
        <Button
          variant="secondary"
          onClick={() => {
            zakonczWorker();
            setStan({ rodzaj: 'do-pobrania' });
          }}
        >
          Przerwij
        </Button>
      </div>
    );
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
  if (stan.rodzaj === 'blad-rozpoznawania') {
    return (
      <StateBlock
        state="error"
        title="Rozpoznawanie przerwało się"
        description="Model przestał odpowiadać, a mikrofon jest już wyłączony. Wczytaj model jeszcze raz."
        action={<Button onClick={zaladuj}>Wczytaj model ponownie</Button>}
        scope="section"
      />
    );
  }
  if (stan.rodzaj === 'blad-mikrofonu') {
    const { tytul, opis } = BLEDY_MIKROFONU[stan.powod];
    return (
      <StateBlock
        state="error"
        title={tytul}
        description={opis}
        action={stan.powod === 'nieobslugiwana' ? undefined : <Button onClick={() => setStan({ rodzaj: 'gotowy' })}>Spróbuj ponownie</Button>}
        scope="section"
      />
    );
  }

  const slucha = stan.rodzaj === 'slucham';
  return (
    <div className="glos">
      <div className="glos__sterowanie">
        <Button
          size="lg"
          fullWidth
          variant={slucha ? 'secondary' : 'primary'}
          loading={stan.rodzaj === 'uruchamianie'}
          loadingLabel="Włączanie mikrofonu"
          onClick={slucha ? () => zatrzymaj() : () => void sluchaj()}
        >
          {slucha ? 'Zatrzymaj' : 'Słuchaj'}
        </Button>
        <Checkbox
          label="Tylko ptaki tego miejsca i pory roku"
          description={OPIS_POLOZENIA[zMiejscem ? polozenie : 'brak']}
          checked={zMiejscem}
          onChange={(e) => ustawMiejsce(e.target.checked)}
        />
      </div>

      <section className="glos__teraz" aria-labelledby="glos-teraz" aria-live="polite">
        <h2 id="glos-teraz" className="glos__naglowek">
          Teraz słyszę
        </h2>
        {!slucha ? (
          <p className="muted">
            {stan.rodzaj === 'gotowy' && stan.ekranZgasl
              ? 'Nasłuch zatrzymał się, kiedy ekran zgasł albo zamknęłam stronę. Stuknij „Słuchaj”, żeby słuchać dalej.'
              : 'Stuknij „Słuchaj” i skieruj telefon w stronę ptaka.'}
          </p>
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

const BLEDY_MIKROFONU: Record<PowodMikrofonu, { tytul: string; opis: string }> = {
  odmowa: {
    tytul: 'Brak dostępu do mikrofonu',
    opis: 'Zezwól tej stronie na mikrofon w ustawieniach przeglądarki, a potem spróbuj jeszcze raz.',
  },
  brak: { tytul: 'Nie widzę mikrofonu', opis: 'Ten telefon nie udostępnia przeglądarce mikrofonu.' },
  zajety: { tytul: 'Mikrofon jest zajęty', opis: 'Zamknij inne aplikacje, które nagrywają, i spróbuj jeszcze raz.' },
  nieobslugiwana: {
    tytul: 'Ta przeglądarka nie nagra dźwięku dla modelu',
    opis: 'Spróbuj w aktualnym Safari albo Chrome.',
  },
  inny: { tytul: 'Nie udało się włączyć mikrofonu', opis: 'Spróbuj jeszcze raz.' },
};

const OPIS_POLOZENIA: Record<Polozenie, string> = {
  brak: 'Używa położenia telefonu. Nigdzie go nie wysyłam.',
  szukam: 'Szukam położenia…',
  jest: 'Pokazuję tylko ptaki spotykane tu w tym tygodniu.',
  odmowa: 'Bez dostępu do położenia pokazuję wszystkie gatunki.',
  blad: 'Nie udało się zawęzić listy do tego miejsca, więc pokazuję wszystkie gatunki.',
};

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
