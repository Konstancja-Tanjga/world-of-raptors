/**
 * Pages taken off the site for now, kept in the code to come back. With
 * KIEDY_I_GDZIE false, "Kiedy i gdzie" (the planner, the observation points
 * and "Co tu zobaczę") is a 404, out of the navigation and the sitemap, its
 * old addresses no longer redirect to it, the buttons leading there hide,
 * and links to it in lessons render as their plain text. Setting it to true
 * brings all of that back.
 */
export const KIEDY_I_GDZIE = false;

const SCIEZKI = ['/kiedy-i-gdzie', '/kiedy-jechac', '/punkty-obserwacji'];

/** Whether an in-site link leads to a page taken off the site. */
export const prowadziDoUkrytej = (href: string) =>
  !KIEDY_I_GDZIE && SCIEZKI.some((s) => href === s || /^[#?/]/.test(href.slice(s.length)) && href.startsWith(s));
