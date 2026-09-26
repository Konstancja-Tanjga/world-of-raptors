import Link from 'next/link';
import ReactMarkdown, { type Components } from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { resolveContentHref } from '@/lib/links';
import type { Zdjecie } from '@/lib/types';
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
 */
const lessonTags = {
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

/**
 * Renders lesson Markdown from `content/`. Raw HTML is allowed because the
 * lessons use <details> for quiz answers, and the content is authored in this
 * repository, never taken from users.
 */
export function Markdown({ source, baseDir }: { source: string; baseDir: string }) {
  return (
    <div className="prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          a: ({ href = '', children }) => {
            const target = resolveContentHref(href, baseDir);
            if (/^https?:/.test(target)) {
              return (
                <a href={target} target="_blank" rel="noreferrer">
                  {children}
                </a>
              );
            }
            return <Link href={target}>{children}</Link>;
          },
          table: ({ children }) => (
            <div className="prose__table" role="region" aria-label="Tabela" tabIndex={0}>
              <table>{children}</table>
            </div>
          ),
          ...lessonTags,
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
