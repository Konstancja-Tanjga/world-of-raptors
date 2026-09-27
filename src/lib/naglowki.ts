/**
 * Heading ids for the lesson table of contents. The server lists the `##`
 * headings from the Markdown source and the renderer gives each rendered h2
 * its id; both go through `idNaglowkow`, so the links and the targets match as
 * long as the heading text is the same in both places (lesson `##` headings
 * are plain text, without inline Markdown).
 */
export function slug(tekst: string) {
  return (
    tekst
      .toLowerCase()
      .replace(/ł/g, 'l')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'sekcja'
  );
}

/** Ids for headings in document order; a repeated heading gets "-2", "-3"… */
export function idNaglowkow(teksty: string[]) {
  const uzyte = new Map<string, number>();
  return teksty.map((t) => {
    const s = slug(t);
    const n = (uzyte.get(s) ?? 0) + 1;
    uzyte.set(s, n);
    return n === 1 ? s : `${s}-${n}`;
  });
}
