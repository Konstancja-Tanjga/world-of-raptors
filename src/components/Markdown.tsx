import Link from 'next/link';
import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import {
  gatunki,
  grupySylwetek,
  grupyDoWyboru,
  ptakiDoMiarki,
  ptakiMokradel,
  ptakiStyluLotu,
  pytaniaSylwetek,
  kominPunktu,
  scenaBudowy,
  sesjaPunktu,
  stronaMorfuLekcji,
  znajdzGatunek,
  znajdzNagranie,
} from '@/lib/content';
import { resolveContentHref } from '@/lib/links';
import { idNaglowkow } from '@/lib/naglowki';
import { sciezkaSonogramu } from '@/lib/nagrania';
import { rozmiaryZdjecia } from '@/lib/podglad';
import type { Zdjecie } from '@/lib/types';
import { oryginalZAtrybutu } from '@/lib/zdjecia';
import { Anatomia } from './Anatomia';
import { Komin, Model3D, MorfGrup, Pikowanie, PtasiaMiarka, PunktObserwacyjny, StyleLotu, SuwakMorfu, ZgadnijSylwetke } from './CwiczeniaLekcji';
import { ArticleMargin } from './ds';
import { Miarka } from './Miarka';
import { Nagranie } from './Nagranie';
import { NazwaPtaka } from './NazwaPtaka';
import { Photo } from './Photo';
import { SpeciesMedia } from './SpeciesMedia';
import { Sylwetka } from './Sylwetka';

type Attrs = Record<string, unknown>;
const attr = (props: Attrs, name: string) => {
  const node = props.node as { properties?: Attrs } | undefined;
  const camel = name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
  const v = props[name] ?? node?.properties?.[name] ?? node?.properties?.[camel];
  return typeof v === 'string' || typeof v === 'number' ? String(v) : '';
};

/**
 * Lesson-only tags, each written with the opening tag on its own line and the
 * closing tag on the next so Markdown treats them as blocks, not inline HTML:
 *
 *   <species-photos data-id="kania-czarna">
 *   </species-photos>
 *
 *   <zdjecie src="…" width="960" height="640" oryginal="2091x1375" alt="…" podpis="…" autor="…" licencja="CC BY-SA 4.0" licencja-url="…" strona="…">
 *   </zdjecie>
 *
 * (the whole opening tag on one line: tagi.ts checks each line)
 *
 * (`oryginal`, the Commons original's size, lets the browser fetch a sharper
 * thumbnail; `scripts/commons.py tag` writes it.) Two wrappers place photos,
 * each written with blank lines inside so the content stays Markdown:
 *
 * `<margines>` puts a photo or a side note in the lesson's margin. Write it
 * right before the paragraph it belongs to:
 *
 *   <margines>
 *
 *   > Side note in **Markdown**.
 *
 *   </margines>
 *
 *   The paragraph the note belongs to.
 *
 * `<galeria>` sets one to six photos (nothing else) across the text and the
 * margin, for what has to be seen large or side by side: a feather against a
 * feather, a skull, a sequence. It clears the margin notes above it, so write
 * it after the paragraph a note belongs to, or at the start of a section:
 *
 *   <galeria>
 *
 *   <zdjecie …>
 *   </zdjecie>
 *
 *   <zdjecie …>
 *   </zdjecie>
 *
 *   </galeria>
 *
 * `<glos>` plays a recording from content/nagrania.json, with what is heard
 * above it and its credit below (an unknown id stops the build):
 *
 *   <glos data-id="puszczyk/samiec">
 *   </glos>
 *
 * B7's drawings and exercises are tags too, each read and checked here, on
 * the server, so a wrong id stops the build. The exercises get drawings, not
 * the silhouette generator; the two morphs animate, so a lesson with one
 * loads it. Each client part loads only where its tag is used
 * (CwiczeniaLekcji.tsx). Every attribute shown is required:
 *
 *   <miarka data-id="myszolow">                       wingspan to scale
 *   <anatomia>                                        the labelled kite plate
 *   <morf-grup>                                       the eight groups, on a patch of sky
 *   <suwak-morfu data-od="myszolow" data-do="trzmielojad">
 *   <ptasia-miarka data-ptaki="wrobel pustulka wrona" data-miara="rozpietosc|dlugosc">
 *   <zgadnij-sylwetke data-gatunki="myszolow kania-ruda pustulka">
 *
 * A9's 3D models are one tag, a scene from src/lib/budowa/sceny.ts with its
 * texts from content/budowa-ptaka.json; three.js loads only when one is near
 * the screen:
 *
 *   <model-3d data-scena="szkielet">
 *
 * A11's flight: a gallery of species flying in their styles, and a falcon's
 * stoop on a slider:
 *
 *   <style-lotu data-gatunki="pustulka kania-ruda krogulec">
 *   <pikowanie>
 *
 * B8's watch point: a session of content/punkt-obserwacyjny.json to count,
 * and a kettle to estimate:
 *
 *   <punkt-obserwacyjny data-sesja="ciesnina-sierpien">
 *   <komin data-gatunek="sep-plowy" data-ile="120">
 */
const lessonTags = {
  // A species name the browser must not translate word by word (see rehypeNazwy).
  'nazwa-ptaka': (props: Attrs) => <NazwaPtaka id={attr(props, 'data-id')} pl={attr(props, 'data-pl')} />,
  // Several photos in one margin step through together in the viewer.
  margines: ({ children }: { children?: ReactNode }) => (
    <ArticleMargin>
      <div className="margines" data-galeria>
        {children}
      </div>
    </ArticleMargin>
  ),
  galeria: ({ children }: { children?: ReactNode }) => {
    const zdjecia = Children.toArray(children).filter(isValidElement) as ReactElement<Attrs>[];
    return (
      <div className="galeria" data-galeria data-ile={Math.min(zdjecia.length, 6)}>
        {zdjecia.map((z) => cloneElement(z, { 'data-w-galerii': zdjecia.length }))}
      </div>
    );
  },
  'species-photos': (props: Attrs) => <SpeciesMedia id={attr(props, 'data-id')} linki={false} />,
  zdjecie: (props: Attrs) => {
    const zdjecie: Zdjecie = {
      src: attr(props, 'src'),
      width: Number(attr(props, 'width')) || 960,
      height: Number(attr(props, 'height')) || 640,
      autor: attr(props, 'autor') || 'nieznany autor',
      licencja: attr(props, 'licencja'),
      licencjaUrl: attr(props, 'licencja-url'),
      strona: attr(props, 'strona'),
      plik: '',
      oryginal: oryginalZAtrybutu(attr(props, 'oryginal')),
    };
    if (!zdjecie.src) throw new Error(`<zdjecie> bez src (alt="${attr(props, 'alt')}")`);
    const wGalerii = Number(attr(props, 'data-w-galerii'));
    return (
      <Photo
        zdjecie={zdjecie}
        alt={attr(props, 'alt')}
        podpis={attr(props, 'podpis') || undefined}
        sizes={rozmiaryZdjecia(wGalerii > 0 ? { galeria: wGalerii } : 'margines')}
      />
    );
  },
  glos: (props: Attrs) => {
    const id = attr(props, 'data-id');
    const n = znajdzNagranie(id);
    if (!n) throw new Error(`<glos>: nie ma w content/nagrania.json nagrania „${id}”`);
    return <Nagranie nagranie={n} opis={n.opis} sonogram={n.sonogram && { src: sciezkaSonogramu(id), khz: n.sonogram.khz }} />;
  },
  miarka: (props: Attrs) => {
    const g = znajdzGatunek(attr(props, 'data-id'));
    if (!g) throw new Error(`<miarka>: nie ma w atlasie gatunku „${attr(props, 'data-id')}”`);
    return (
      <div className="lekcja-cwiczenie">
        <Miarka g={g} />
      </div>
    );
  },
  anatomia: () => (
    <div className="lekcja-cwiczenie">
      <Anatomia podpis="Kania ruda od spodu. Każdą z tych części porównuj z inną częścią tego samego ptaka, nie z centymetrami." />
    </div>
  ),
  'morf-grup': () => (
    <div className="lekcja-scena scena">
      <MorfGrup grupy={grupySylwetek().grupy} />
    </div>
  ),
  'suwak-morfu': (props: Attrs) => (
    <div className="lekcja-cwiczenie">
      <SuwakMorfu od={stronaMorfuLekcji(attr(props, 'data-od'))} do={stronaMorfuLekcji(attr(props, 'data-do'))} />
    </div>
  ),
  'ptasia-miarka': (props: Attrs) => {
    const { miara, ptaki } = ptakiDoMiarki(attr(props, 'data-ptaki'), attr(props, 'data-miara'));
    return (
      <div className="lekcja-cwiczenie">
        <PtasiaMiarka
          miara={miara}
          ptaki={ptaki.map(({ drapieznik, ...p }) => ({
            ...p,
            // Only a wingspan has a drawing: a silhouette from below is as wide as it.
            rysunek: drapieznik && miara === 'rozpietosc' ? <Sylwetka id={p.id} /> : undefined,
          }))}
        />
      </div>
    );
  },
  'model-3d': (props: Attrs) => (
    <div className="lekcja-model">
      <Model3D scena={scenaBudowy(attr(props, 'data-scena'))} />
    </div>
  ),
  'style-lotu': (props: Attrs) => (
    <div className="lekcja-model">
      <StyleLotu ptaki={ptakiStyluLotu(attr(props, 'data-gatunki'))} />
    </div>
  ),
  pikowanie: () => (
    <div className="lekcja-cwiczenie">
      <Pikowanie />
    </div>
  ),
  'punkt-obserwacyjny': (props: Attrs) => {
    const { sesja, ptaki } = sesjaPunktu(attr(props, 'data-sesja'));
    return (
      <div className="lekcja-model">
        <PunktObserwacyjny sesja={sesja} ptaki={ptaki} />
      </div>
    );
  },
  komin: (props: Attrs) => {
    const { ptak, ile } = kominPunktu(attr(props, 'data-gatunek'), attr(props, 'data-ile'));
    return (
      <div className="lekcja-cwiczenie">
        <Komin ptak={ptak} ile={ile} />
      </div>
    );
  },
  'zgadnij-sylwetke': (props: Attrs) => (
    <div className="lekcja-cwiczenie">
      <ZgadnijSylwetke
        grupy={grupyDoWyboru()}
        pytania={pytaniaSylwetek(attr(props, 'data-gatunki')).map((p) => ({
          ...p,
          rysunek: <Sylwetka id={p.id} opis="Sylwetka ptaka od spodu" />,
        }))}
      />
    </div>
  ),
} as unknown as Components;

type HastNode = { type: string; tagName?: string; value?: string; properties?: Attrs; children?: HastNode[] };
const tekstWezla = (n: HastNode): string => n.value ?? (n.children ?? []).map(tekstWezla).join('');

/** Gives every h2 the id the lesson's table of contents links to (see naglowki.ts). */
function rehypeIdNaglowkow() {
  return (drzewo: HastNode) => {
    const h2: HastNode[] = [];
    const zbierz = (n: HastNode) => {
      if (n.type === 'element' && n.tagName === 'h2') h2.push(n);
      n.children?.forEach(zbierz);
    };
    zbierz(drzewo);
    const ids = idNaglowkow(h2.map((n) => tekstWezla(n).trim()));
    h2.forEach((n, i) => (n.properties = { ...n.properties, id: ids[i] }));
  };
}

/** Atlas species by their Latin name, for headings like "### Kania czarna — *Milvus migrans*". */
const PO_LACINIE = new Map([...gatunki, ...ptakiMokradel].map((g) => [g.lat, g]));
const BINOMIAL = /^[A-Z][a-z]+ [a-z]+(?: [a-z]+)?$/;
/** A declined Polish phrase in italics ("*Kronice wielkopolskiej*") looks like a binomial; Latin epithets never end so. */
const POLSKA_KONCOWKA = /(ej|ego|ych|ich|ymi|imi|emu|owi|ami)$/;
const jestLacina = (t: string) => BINOMIAL.test(t) && !POLSKA_KONCOWKA.test(t.split(' ')[1]);
const ANG = /(ang\.\s+)([^,;)]+?)(?=[,;)]|$)/g;

/**
 * Names a browser's translation must leave alone (see src/lib/jezykStrony.ts):
 * italic Latin binomials and the English name after "ang." are marked
 * translate="no", and the Polish name in a species heading becomes a
 * <nazwa-ptaka>, which shows the name in the language the page is
 * translated into. Polish names inside sentences are declined ("myszołowa"),
 * so the translator handles those.
 */
function rehypeNazwy() {
  const tekst = (value: string): HastNode => ({ type: 'text', value });
  return (drzewo: HastNode) => {
    const odwiedz = (n: HastNode) => {
      if (n.type !== 'element' && n.type !== 'root') return;
      if (n.tagName === 'em' && jestLacina(tekstWezla(n).trim())) {
        n.properties = { ...n.properties, translate: 'no', lang: 'la' };
      }
      const dzieci = n.children ?? [];
      // "### Kania czarna — *Milvus migrans* …": the text before the dash is the species' Polish name.
      if (n.tagName && /^h[2-4]$/.test(n.tagName)) {
        const [pierwszy, drugi] = dzieci;
        const nazwa = pierwszy?.type === 'text' ? /^(.+?)\s+—\s+$/.exec(pierwszy.value ?? '') : null;
        const g = drugi?.tagName === 'em' ? PO_LACINIE.get(tekstWezla(drugi).trim()) : undefined;
        if (nazwa && g) {
          dzieci.splice(0, 1, { type: 'element', tagName: 'nazwa-ptaka', properties: { dataId: g.id, dataPl: nazwa[1] }, children: [] }, tekst(' — '));
        }
      }
      // "ang. Common Buzzard": an English name, the same in every language.
      for (let i = 0; i < dzieci.length; i++) {
        const d = dzieci[i];
        if (d.type !== 'text' || !d.value || !ANG.test(d.value)) continue;
        ANG.lastIndex = 0;
        const czesci: HastNode[] = [];
        let od = 0;
        for (const m of d.value.matchAll(ANG)) {
          const poczatek = m.index! + m[1].length;
          czesci.push(tekst(d.value.slice(od, poczatek)));
          czesci.push({ type: 'element', tagName: 'span', properties: { translate: 'no', lang: 'en' }, children: [tekst(m[2])] });
          od = poczatek + m[2].length;
        }
        czesci.push(tekst(d.value.slice(od)));
        dzieci.splice(i, 1, ...czesci);
        i += czesci.length - 1;
      }
      dzieci.forEach(odwiedz);
    };
    odwiedz(drzewo);
  };
}

/** Numbers the Markdown's own tables in reading order, so each scrollable table region gets a name of its own (see `table` below). */
function rehypeNumeryTabel() {
  return (drzewo: HastNode) => {
    let numer = 0;
    const odwiedz = (n: HastNode) => {
      if (n.type === 'element' && n.tagName === 'table') n.properties = { ...n.properties, dataNumer: String(++numer) };
      n.children?.forEach(odwiedz);
    };
    odwiedz(drzewo);
  };
}

/** The region's name: its number and first four column headers, e.g. "Tabela 1: Grupa, Skrzydła, Ogon, Głowa" (B1 lesson 1, without its fifth column, Przykłady). */
function nazwaTabeli(tabela: HastNode | undefined) {
  const naglowki: string[] = [];
  const zbierz = (n: HastNode) => {
    if (n.type === 'element' && n.tagName === 'th') naglowki.push(tekstWezla(n).trim());
    else n.children?.forEach(zbierz);
  };
  if (tabela) zbierz(tabela);
  const numer = tabela?.properties?.dataNumer;
  const kolumny = naglowki.filter(Boolean).slice(0, 4).join(', ');
  return `Tabela${numer ? ` ${numer}` : ''}${kolumny ? `: ${kolumny}` : ''}`;
}

const link = (baseDir: string): Components['a'] =>
  function MarkdownLink({ href = '', children }) {
    const target = resolveContentHref(href, baseDir);
    if (/^https?:/.test(target)) {
      return (
        <a href={target} target="_blank" rel="noreferrer">
          {children}
        </a>
      );
    }
    return <Link href={target}>{children}</Link>;
  };

/**
 * Renders lesson Markdown from `content/`. Raw HTML is allowed for the lesson
 * tags above and the `<details>` answers of the mini-quizzes; the content is
 * authored in this repository, never taken from users. `quiz` is rendered
 * where the lesson has `<quiz-krokowy>`, which only `wyodrebnijQuiz` inserts.
 */
export function Markdown({ source, baseDir, quiz }: { source: string; baseDir: string; quiz?: ReactNode }) {
  return (
    <div className="prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeIdNaglowkow, rehypeNumeryTabel, rehypeNazwy]}
        components={{
          a: link(baseDir),
          // Focusable, so a keyboard can scroll a wide table sideways; named by its number and first four column headers.
          table: ({ node, children }) => (
            <div className="prose__table" role="region" aria-label={nazwaTabeli(node as HastNode | undefined)} tabIndex={0}>
              <table>{children}</table>
            </div>
          ),
          ...lessonTags,
          ...({ 'quiz-krokowy': () => quiz ?? null } as unknown as Components),
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}

/**
 * One paragraph of Markdown rendered without its <p>, for a slot that is
 * already one. `bezLinkow` keeps a link's text but drops the link, for text
 * inside something that is itself a link (a link cannot contain another).
 */
export function MarkdownInline({ source, baseDir, bezLinkow = false }: { source: string; baseDir: string; bezLinkow?: boolean }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeNazwy]}
      disallowedElements={bezLinkow ? ['p', 'a'] : ['p']}
      unwrapDisallowed
      components={{ a: link(baseDir) }}
    >
      {source}
    </ReactMarkdown>
  );
}
