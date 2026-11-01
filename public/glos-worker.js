// "Rozpoznaj po głosie": runs BirdNET Live's worker (public/birdnet/<commit>/, scripts/birdnet.sh,
// passed as ?worker=) and reports what it cannot. Its loading is async, so a failure (a
// missing model file, a lost WebGL context) is an unhandled rejection the page would never
// hear of and would wait for forever. Without WebGL it would fall back to the CPU, download
// the whole model (~58 MB) and only then fail, so TensorFlow.js (?tfjs=) is loaded here first
// and asked for WebGL; BirdNET's worker then gets ?tf= pointing at an empty script, since
// TensorFlow.js is already in this scope.
self.addEventListener('unhandledrejection', (e) => {
  postMessage({ message: 'error', error: String(e.reason && e.reason.message ? e.reason.message : e.reason) });
});
self.addEventListener('error', (e) => {
  postMessage({ message: 'error', error: String(e.message || 'worker error') });
});
// In a block: the imported worker shares this global scope and declares its own `params`.
{
  const adres = new URL(self.location.href).searchParams;
  importScripts(adres.get('tfjs'));
  tf.setBackend('webgl').then((jest) => {
    if (!jest) postMessage({ message: 'error', error: 'WebGL is not available in workers' });
    else importScripts(adres.get('worker'));
  });
}
