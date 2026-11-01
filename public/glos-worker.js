// "Rozpoznaj po głosie": runs BirdNET Live's worker (public/birdnet/, scripts/birdnet.sh)
// and reports what it cannot: its loading is async, so a failure (no WebGL, a missing
// file) is an unhandled rejection the page would never hear of, and would wait forever.
self.addEventListener('unhandledrejection', (e) => {
  postMessage({ message: 'error', error: String(e.reason && e.reason.message ? e.reason.message : e.reason) });
});
self.addEventListener('error', (e) => {
  postMessage({ message: 'error', error: String(e.message) });
});
importScripts('/birdnet/birdnet-worker.js');
