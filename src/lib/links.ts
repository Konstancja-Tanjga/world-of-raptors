import path from 'node:path';

/**
 * Lessons link to each other with relative Markdown paths so they stay
 * readable on GitHub. This maps those paths onto app routes.
 *
 * `baseDir` is the Markdown file's directory relative to `content/`.
 */
export function resolveContentHref(href: string, baseDir: string): string {
  if (/^[a-z]+:/i.test(href) || href.startsWith('/') || href.startsWith('#')) return href;

  const [target, hash] = href.split('#');
  const resolved = path.posix.normalize(path.posix.join(baseDir, target));
  const suffix = hash ? `#${hash}` : '';

  if (resolved === 'PLAN-KURSU.md') return `/plan${suffix}`;
  if (resolved === 'gatunki.json') return `/gatunki${suffix}`;

  const lesson = resolved.match(/^moduly\/([^/]+)\/(.+)\.md$/);
  if (lesson) {
    const [, modul, plik] = lesson;
    return plik === 'README' ? `/moduly/${modul}${suffix}` : `/moduly/${modul}/${plik}${suffix}`;
  }
  return href;
}
