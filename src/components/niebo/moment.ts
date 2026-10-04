/**
 * Holds a moment's animations on their first frame (each has
 * `fill: 'backwards'`, so the first frame shows) until `element` is in view,
 * then plays them and calls `naStart`: a moment below the fold waits for me
 * to scroll to it, and it counts as shown only once it has played. Returns
 * the cleanup, which cancels them.
 */
export function zagrajGdyWidoczny(element: Element, animacje: Animation[], naStart: () => void, prog = 0.35) {
  for (const a of animacje) a.pause();
  const obserwator = new IntersectionObserver(
    ([wpis]) => {
      if (!wpis.isIntersecting) return;
      obserwator.disconnect();
      for (const a of animacje) a.play();
      naStart();
    },
    { threshold: prog },
  );
  obserwator.observe(element);
  return () => {
    obserwator.disconnect();
    for (const a of animacje) a.cancel();
  };
}
