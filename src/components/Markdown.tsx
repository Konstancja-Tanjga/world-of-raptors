import Link from 'next/link';
import type { ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { resolveContentHref } from '@/lib/links';
import { idNaglowkow } from '@/lib/naglowki';
import type { Zdjecie } from '@/lib/types';
import { ArticleMargin } from './ds';
import { Photo } from './Photo';
import { SpeciesMedia } from './SpeciesMedia';

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
 *   <zdjecie src="…" width="960" height="640" alt="…" podpis="…" autor="…"
 *     licencja="CC BY-SA 4.0" licencja-url="…" strona="…">
 *   </zdjecie>
 *
 * `<margines>` is the one wrapper: it puts a photo or a side note in the
 * lesson's margin. Write it right before the paragraph it belongs to, with
 * blank lines inside so the content between the tags is still Markdown:
 *
 *   <margines>
 *
 *   > Side note in **Markdown**.
 *
 *   </margines>
 *
 *   The paragraph the note belongs to.
 */
const lessonTags = {
  margines: ({ children }: { children?: ReactNode }) => (
    <ArticleMargin>
      <div className="margines">{children}</div>
    </ArticleMargin>
  ),
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
    };
    if (!zdjecie.src) return null;
    return <Photo zdjecie={zdjecie} alt={attr(props, 'alt')} podpis={attr(props, 'podpis') || undefined} />;
  },
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
        rehypePlugins={[rehypeRaw, rehypeIdNaglowkow]}
        components={{
          a: link(baseDir),
          table: ({ children }) => (
            <div className="prose__table" role="region" aria-label="Tabela" tabIndex={0}>
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
      disallowedElements={bezLinkow ? ['p', 'a'] : ['p']}
      unwrapDisallowed
      components={{ a: link(baseDir) }}
    >
      {source}
    </ReactMarkdown>
  );
}
