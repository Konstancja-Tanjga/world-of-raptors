// Lets `node --test` run the TypeScript in src/lib as it is written for the
// bundler: relative imports without an extension, and `@/` for src/. Node
// strips the types itself; this only finds the files and names their format.
import { existsSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const src = new URL('../../src/', import.meta.url);
const ROZSZERZENIA = ['.ts', '.tsx', '/index.ts'];

registerHooks({
  resolve(specifier, context, nextResolve) {
    const alias = specifier.startsWith('@/');
    if ((alias || specifier.startsWith('.')) && !/\.[cm]?[jt]sx?$|\.json$/.test(specifier)) {
      const baza = alias ? new URL(specifier.slice(2), src) : new URL(specifier, context.parentURL);
      for (const r of ROZSZERZENIA) {
        const sciezka = fileURLToPath(baza) + r;
        if (existsSync(sciezka)) return nextResolve(pathToFileURL(sciezka).href, context);
      }
    }
    return nextResolve(specifier, context);
  },
  // The package has no "type": "module" (Next does not need one), so say
  // that our TypeScript is ESM instead of letting Node guess and warn.
  load(url, context, nextLoad) {
    if (url.startsWith(src.href) && url.endsWith('.ts')) return nextLoad(url, { ...context, format: 'module-typescript' });
    return nextLoad(url, context);
  },
});
