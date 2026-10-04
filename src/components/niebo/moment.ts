/**
 * Holds a moment's animations on their first frame (each has
 * `fill: 'backwards'`, so the first frame shows) until `element` is in view,
 * then plays them and calls `naStart`: a moment below the fold waits for me
 * to scroll to it, and counts as shown as soon as it starts to play. Returns
 * the cleanup, which cancels them.
 */
export function zagrajGdyWidoczny(element: Element, animacje: Animation[], naStart: () => void, prog = 0.35) {
  for (const a of animacje) a.pause();
  const obserwator = new IntersectionObserver(
    ([wpis]) => {
      // An element taller than the screen (the narrow map on a phone held
      // sideways) may never be `prog` in view: ask for as much of it as fits,
      // worked out anew each time, since the phone may have turned.
      const wysokosc = wpis.boundingClientRect.height;
      const ekran = wpis.rootBounds?.height ?? window.innerHeight;
      const potrzeba = wysokosc > 0 ? Math.min(prog, (0.9 * ekran) / wysokosc) : prog;
      if (!wpis.isIntersecting || wpis.intersectionRatio < potrzeba) return;
      obserwator.disconnect();
      for (const a of animacje) a.play();
      naStart();
    },
    // Every step up to `prog`, so the check above runs as the element comes into view.
    { threshold: Array.from({ length: 21 }, (_, i) => (i / 20) * prog) },
  );
  obserwator.observe(element);
  return () => {
    obserwator.disconnect();
    for (const a of animacje) a.cancel();
  };
}
