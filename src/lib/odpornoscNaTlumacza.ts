/**
 * Keeps React working while a browser translates the page. Google Translate
 * (in Chrome and Edge) replaces text nodes with its own <font> elements, so
 * when React later removes or inserts next to a text node it rendered, that
 * node is no longer where React left it and the DOM call throws ("The node to
 * be removed is not a child of this node"), breaking the quiz, the flashcards
 * or the checklist. These two calls then do nothing instead of throwing; the
 * translator re-translates whatever React renders next.
 * See https://github.com/facebook/react/issues/11538.
 */
export function odpornoscNaTlumacza() {
  if (typeof Node !== 'function' || (Node.prototype as { __tlumacz?: boolean }).__tlumacz) return;
  (Node.prototype as { __tlumacz?: boolean }).__tlumacz = true;

  const usun = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(this: Node, dziecko: T): T {
    if (dziecko.parentNode !== this) return dziecko;
    return usun.call(this, dziecko) as T;
  };

  const wstaw = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(this: Node, nowy: T, przed: Node | null): T {
    if (przed && przed.parentNode !== this) return nowy;
    return wstaw.call(this, nowy, przed) as T;
  };
}
