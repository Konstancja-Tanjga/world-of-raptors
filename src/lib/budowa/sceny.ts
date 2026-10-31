/*
 * The 3D views of module A9 (Budowa ptaka), as data: which model each view
 * shows, which of its parts can be picked and named, which layers can be
 * switched, where the cut and the camera start. Pure (no three.js), so the
 * build can check it against content/budowa-ptaka.json, which holds the
 * parts' names and descriptions, and the client can lay out its controls
 * before the 3D engine arrives. The geometry is in modele.ts; every part id
 * here must be drawn there (modele.test.ts checks).
 */

/** A model's layers, outside in. Only the bird has more than one. */
export const WARSTWY = ['zewnatrz', 'miesnie', 'narzady', 'worki', 'szkielet'] as const;
export type Warstwa = (typeof WARSTWY)[number];

export const NAZWY_WARSTW: Record<Warstwa, string> = {
  zewnatrz: 'Pióra i skóra',
  miesnie: 'Mięśnie lotu',
  narzady: 'Narządy',
  worki: 'Worki powietrzne',
  szkielet: 'Szkielet',
};

export type IdModelu = 'ptak' | 'pioro' | 'promienie' | 'haczyki' | 'kosc-ptaka' | 'kosc-ssaka';

/** [x, y, z] in model units (the bird: 1 = 10 cm, the head towards +z, the right wing towards +x). */
export type Punkt = [number, number, number];

/** A slider the model itself answers (it moves its own parts). */
export type Suwak = { id: string; etykieta: string; min: string; max: string; domyslnie: number };

export type Widok = {
  id: string;
  /** The view's name in the view switch (only when a scene has several). */
  nazwa: string;
  model: IdModelu;
  /** The parts that can be picked, in the order the list shows them. */
  czesci: string[];
  /** Layers shown at the start; `przelaczane` are the ones with a checkbox. */
  warstwy: Warstwa[];
  przelaczane?: Warstwa[];
  /** The outer layer's opacity at the start (0–1); a slider when set. */
  przezroczystosc?: number;
  /**
   * A cut that hides everything beyond a plane across `os`: the slider runs
   * from `od` (nothing cut) to `do`; `domyslnie` is where it starts.
   */
  przekroj?: { os: 'x' | 'z'; od: number; do: number; domyslnie: number };
  kamera: { pozycja: Punkt; cel: Punkt };
  suwaki?: Suwak[];
  /** Inside the plumage, show only the parts this view lists (the breathing cycle needs no liver). */
  tylkoTeCzesci?: boolean;
};

export type Scena = {
  widoki: Widok[];
  /** Steps the model plays (the breathing cycle); their texts are in the JSON. */
  kroki?: string[];
  /** A self-test: the scene asks for parts instead of explaining them. */
  sprawdzian?: boolean;
};

const TOPOGRAFIA = [
  'czolo', 'ciemie', 'brew', 'kantarek', 'policzek', 'potylica', 'gardlo', 'oko',
  'woskowka', 'nozdrze', 'dziob-gorny', 'dziob-dolny',
  'kark', 'plaszcz', 'grzbiet', 'kuper', 'piers', 'brzuch', 'boki',
  'barkowki', 'pokrywy-male', 'pokrywy-srednie', 'pokrywy-duze', 'pokrywy-lotek-1', 'skrzydelko',
  'lotki-1', 'lotki-2', 'lotki-3',
  'pokrywy-nadogonowe', 'sterowki', 'pokrywy-podogonowe',
  'portki', 'skok', 'palce', 'szpony',
];

const KOSCI = [
  'czaszka', 'pierscien-twardowkowy', 'kregi-szyjne', 'kregoslup-piersiowy', 'zebra', 'wyrostki-haczykowate',
  'mostek', 'grzebien-mostka', 'kosc-krucza', 'widelki', 'lopatka',
  'kosc-ramienna', 'kosc-lokciowa', 'kosc-promieniowa', 'brodawki-lotkowe', 'nadgarstkowo-srodreczna', 'palce-skrzydla', 'palec-skrzydelka',
  'synsakrum', 'miednica', 'kregi-ogonowe', 'pygostyl',
  'kosc-udowa', 'piszczelowo-stepowa', 'strzalka', 'stepowo-srodstopie', 'palce-stopy',
];

const WNETRZE = [
  'miesien-piersiowy', 'miesien-nadkruczy', 'sciegno-nadkruczego',
  'tchawica', 'krtan-dolna', 'przelyk', 'wole', 'zoladek-gruczolowy', 'zoladek-miesniowy', 'jelita', 'stek',
  'watroba', 'serce', 'pluca', 'nerki',
];

const WORKI = ['worki-szyjne', 'worek-obojczykowy', 'worki-piersiowe-przednie', 'worki-piersiowe-tylne', 'worki-brzuszne'];

/** The whole bird from front left and a little above, as a field guide's plate would show it. */
const NA_PTAKA = { pozycja: [-7.5, 4.2, 7.5] as Punkt, cel: [0, -0.1, -0.3] as Punkt };
/** From the right, where the cut opens the body. */
const Z_PRAWEJ = { pozycja: [6.3, 1.2, 0.8] as Punkt, cel: [0, 0.05, -0.15] as Punkt };

export const SCENY: Record<string, Scena> = {
  topografia: {
    widoki: [{ id: 'ptak', nazwa: 'Ptak', model: 'ptak', czesci: TOPOGRAFIA, warstwy: ['zewnatrz'], kamera: NA_PTAKA }],
  },
  skrzydlo: {
    widoki: [
      {
        id: 'ptak',
        nazwa: 'Skrzydło',
        model: 'ptak',
        czesci: [
          'lotki-1', 'lotki-2', 'lotki-3', 'pokrywy-lotek-1', 'pokrywy-duze', 'pokrywy-srednie', 'pokrywy-male', 'skrzydelko', 'barkowki',
          'kosc-ramienna', 'kosc-lokciowa', 'kosc-promieniowa', 'brodawki-lotkowe', 'nadgarstkowo-srodreczna', 'palce-skrzydla', 'palec-skrzydelka',
        ],
        warstwy: ['zewnatrz', 'szkielet'],
        przezroczystosc: 0.45,
        kamera: { pozycja: [3.4, 6.2, 1.2], cel: [2.3, 0.4, -0.4] },
      },
    ],
  },
  szkielet: {
    widoki: [
      {
        id: 'ptak',
        nazwa: 'Szkielet',
        model: 'ptak',
        czesci: KOSCI,
        warstwy: ['zewnatrz', 'szkielet'],
        przelaczane: ['zewnatrz', 'miesnie', 'szkielet'],
        przezroczystosc: 0.12,
        przekroj: { os: 'x', od: 5.5, do: -0.4, domyslnie: 5.5 },
        kamera: { pozycja: [-6.2, 2.6, 5.4], cel: [0, -0.1, 0] },
      },
    ],
  },
  wnetrze: {
    widoki: [
      {
        id: 'ptak',
        nazwa: 'Wnętrze',
        model: 'ptak',
        czesci: [...WNETRZE, ...WORKI],
        warstwy: ['zewnatrz', 'miesnie', 'narzady', 'worki', 'szkielet'],
        przelaczane: ['zewnatrz', 'miesnie', 'narzady', 'worki', 'szkielet'],
        przezroczystosc: 1,
        przekroj: { os: 'x', od: 5.5, do: -0.4, domyslnie: 0.02 },
        kamera: Z_PRAWEJ,
      },
    ],
  },
  oddech: {
    widoki: [
      {
        id: 'ptak',
        nazwa: 'Oddech',
        model: 'ptak',
        czesci: ['tchawica', 'krtan-dolna', 'pluca', ...WORKI],
        warstwy: ['zewnatrz', 'narzady', 'worki'],
        przezroczystosc: 0.1,
        tylkoTeCzesci: true,
        kamera: { pozycja: [5.6, 1.7, 2.2], cel: [0, 0.2, 0.05] },
      },
    ],
    kroki: ['wdech-1', 'wydech-1', 'wdech-2', 'wydech-2'],
  },
  pioro: {
    widoki: [
      {
        id: 'pioro',
        nazwa: 'Całe pióro',
        model: 'pioro',
        czesci: ['dudka', 'stosina', 'choragiewka-zewnetrzna', 'choragiewka-wewnetrzna', 'czesc-puchowa', 'wciecie'],
        warstwy: ['zewnatrz'],
        kamera: { pozycja: [0.4, 6.4, 3.2], cel: [0.3, 0, 0] },
      },
      {
        id: 'promienie',
        nazwa: 'Promienie',
        model: 'promienie',
        czesci: ['stosina-z-bliska', 'promien', 'promyki'],
        warstwy: ['zewnatrz'],
        kamera: { pozycja: [-1.5, 6.5, 5.5], cel: [0, 0, 1.6] },
      },
      {
        id: 'haczyki',
        nazwa: 'Promyki i haczyki',
        model: 'haczyki',
        czesci: ['promien-z-bliska', 'promyki-proksymalne', 'promyki-dystalne', 'haczyki'],
        warstwy: ['zewnatrz'],
        kamera: { pozycja: [2.2, 4.4, 4.6], cel: [0, 0.2, 0.6] },
        suwaki: [{ id: 'rozsun', etykieta: 'Rozsuń promienie', min: 'zapięte', max: 'rozpięte', domyslnie: 0 }],
      },
    ],
  },
  kosc: {
    widoki: [
      {
        id: 'ptak',
        nazwa: 'Kość ramienna ptaka',
        model: 'kosc-ptaka',
        czesci: ['sciana-kosci', 'beleczki', 'otwor-pneumatyczny', 'uchylek-worka'],
        warstwy: ['zewnatrz'],
        przekroj: { os: 'z', od: 1, do: -0.3, domyslnie: 0 },
        kamera: { pozycja: [1.6, 3.2, 7.2], cel: [0, 0, 0] },
        suwaki: [{ id: 'wejdz', etykieta: 'Wejdź do środka kości', min: 'z zewnątrz', max: 'w środku', domyslnie: 0 }],
      },
      {
        id: 'ssak',
        nazwa: 'Kość ramienna ssaka',
        model: 'kosc-ssaka',
        czesci: ['sciana-kosci-ssaka', 'szpik', 'kosc-gabczasta'],
        warstwy: ['zewnatrz'],
        przekroj: { os: 'z', od: 1, do: -0.3, domyslnie: 0 },
        kamera: { pozycja: [1.6, 3.2, 7.2], cel: [0, 0, 0] },
        suwaki: [{ id: 'wejdz', etykieta: 'Wejdź do środka kości', min: 'z zewnątrz', max: 'w środku', domyslnie: 0 }],
      },
    ],
  },
  sprawdzian: {
    widoki: [
      {
        id: 'ptak',
        nazwa: 'Sprawdzian',
        model: 'ptak',
        czesci: [
          'ciemie', 'brew', 'kantarek', 'woskowka', 'gardlo', 'plaszcz', 'kuper', 'boki', 'barkowki', 'pokrywy-duze', 'skrzydelko',
          'lotki-1', 'lotki-2', 'sterowki', 'pokrywy-podogonowe', 'portki', 'skok',
          'mostek', 'grzebien-mostka', 'widelki', 'kosc-krucza', 'kosc-ramienna', 'kosc-lokciowa', 'nadgarstkowo-srodreczna', 'pygostyl',
          'piszczelowo-stepowa', 'stepowo-srodstopie', 'pierscien-twardowkowy', 'wyrostki-haczykowate',
          'miesien-piersiowy', 'miesien-nadkruczy', 'serce', 'pluca', 'wole', 'zoladek-miesniowy', 'worki-brzuszne', 'krtan-dolna',
        ],
        warstwy: ['zewnatrz', 'miesnie', 'narzady', 'worki', 'szkielet'],
        przezroczystosc: 1,
        przekroj: { os: 'x', od: 5.5, do: -0.4, domyslnie: 5.5 },
        kamera: NA_PTAKA,
      },
    ],
    sprawdzian: true,
  },
};

/** A part as the viewer lists it: its id, name, Latin name if it has one, and what to know about it. */
export type OpisCzesci = { id: string; nazwa: string; lac?: string; opis: string };
/** A step of a cycle; its text may hold **bold**. */
export type OpisKroku = { id: string; nazwa: string; opis: string };
/** A scene as the page hands it to the viewer: the views with their parts described. */
export type DaneSceny = {
  id: string;
  tytul: string;
  podpis: string;
  widoki: (Omit<Widok, 'czesci'> & { czesci: OpisCzesci[] })[];
  kroki: OpisKroku[];
  sprawdzian: boolean;
};

/** How many questions a self-test asks. */
export const PYTAN_W_SPRAWDZIANIE = 10;

/** Every part id any scene names (the build checks each has a name and a description). */
export const wszystkieCzesci = () => [...new Set(Object.values(SCENY).flatMap((s) => s.widoki.flatMap((w) => w.czesci)))];
