import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { resolveContentHref } from '@/lib/links';

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
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
