/**
 * Holds a moment's animations on their first frame (each has
 * `fill: 'backwards'`, so the first frame shows) until `element` is in view,
 * then plays them and calls `naStart`: a moment below the fold waits for me
 * to scroll to it, and counts as shown as soon as it starts to play. Returns
 * the cleanup, which cancels them.
 */
export function zagrajGdyWidoczny(element: Element, animacje: Animation[], naStart: () => void, prog = 0.35) {
  for (const a of animacje) a.pause();
  // An element taller than the screen (the narrow map on a phone held sideways)
  // may never be `prog` in view: ask for as much of it as fits.
  const wysokosc = element.getBoundingClientRect().height;
  const widac = wysokosc > 0 ? Math.min(prog, (0.9 * window.innerHeight) / wysokosc) : prog;
  const obserwator = new IntersectionObserver(
    ([wpis]) => {
      if (!wpis.isIntersecting) return;
      obserwator.disconnect();
      for (const a of animacje) a.play();
      naStart();
    },
    { threshold: widac },
  );
  obserwator.observe(element);
  return () => {
    obserwator.disconnect();
    for (const a of animacje) a.cancel();
  };
}
