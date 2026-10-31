// Draws the pictures of the "Budowa ptaka" flashcards: for every part a
// lesson's 3D model can show, the model with that part lit (as choosing it
// from the list shows it), without the label that names it, as an
// 800 × 450 JPEG in public/budowa/<part>.jpg. Draw again after changing a
// model, a scene or the highlight.
//
// Needs the app running (npm run build && npx next start -p 3123) and
// Playwright with its Chromium (in the cloud sessions it is pre-installed):
//   node --import ./scripts/testy/rozwiaz.mjs scripts/budowa-obrazy.mjs [http://localhost:3123] [part …]
// (with a global Playwright: NODE_PATH=$(npm root -g) node …).
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { SCENY } from '../src/lib/budowa/sceny.ts';

// Through require, so a Playwright installed globally (NODE_PATH) is found too.
const { chromium } = createRequire(import.meta.url)('playwright');

const [adres = 'http://localhost:3123', ...tylko] = process.argv.slice(2);
const KATALOG = path.join(process.cwd(), 'public', 'budowa');
const RAZEM = 4;
mkdirSync(KATALOG, { recursive: true });

// Each scene's lesson: the first lesson whose Markdown has its tag.
const moduly = JSON.parse(readFileSync('content/moduly.json', 'utf8')).moduly.filter((m) => m.gotowy);
const lekcjaSceny = new Map();
for (const m of moduly) {
  for (const l of m.lekcje) {
    const md = readFileSync(`content/moduly/${m.slug}/${l.slug}.md`, 'utf8');
    for (const [, id] of md.matchAll(/^<model-3d data-scena="([^"]+)">$/gm)) if (!lekcjaSceny.has(id)) lekcjaSceny.set(id, `/moduly/${m.slug}/${l.slug}`);
  }
}

// One job per part: the first scene and view (not the self-test, not the mammal's bone) that shows it.
const zadania = [];
const juz = new Set();
for (const [scena, s] of Object.entries(SCENY)) {
  if (s.sprawdzian || !lekcjaSceny.has(scena)) continue;
  s.widoki.forEach((w, indeks) => {
    if (w.model === 'kosc-ssaka') return;
    for (const czesc of w.czesci) {
      if (juz.has(czesc) || (tylko.length && !tylko.includes(czesc))) continue;
      juz.add(czesc);
      zadania.push({ czesc, scena, widok: s.widoki.length > 1 ? w.nazwa : null, adres: adres + lekcjaSceny.get(scena), indeks });
    }
  });
}

const STYL = `
  .model3d__plotno { width: 800px !important; height: 450px !important; aspect-ratio: auto !important; border-radius: 0 !important; }
  .model3d__etykieta, .model3d__podpowiedz { display: none !important; }
`;

const przegladarka = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const kontekst = await przegladarka.newContext({ viewport: { width: 1400, height: 1000 }, reducedMotion: 'reduce', colorScheme: 'dark' });

async function narysuj({ czesc, scena, widok, adres: url }) {
  const strona = await kontekst.newPage();
  try {
    await strona.goto(url, { waitUntil: 'domcontentloaded' });
    await strona.addStyleTag({ content: STYL });
    const figura = strona.locator(`figure[aria-labelledby="model3d-${scena}"]`);
    await figura.scrollIntoViewIfNeeded();
    await figura.locator('canvas').waitFor({ timeout: 90000 });
    await strona.waitForTimeout(800);
    if (widok) {
      await figura.getByRole('radio', { name: widok, exact: true }).click({ force: true });
      await strona.waitForTimeout(600);
    }
    await figura.getByLabel('Część').selectOption(czesc);
    await strona.waitForTimeout(900);
    await figura.locator('.model3d__plotno').screenshot({ path: path.join(KATALOG, `${czesc}.jpg`), type: 'jpeg', quality: 82 });
    console.log(`${czesc}: gotowe`);
  } catch (e) {
    console.error(`${czesc}: ${e.message.split('\n')[0]}`);
    process.exitCode = 1;
  } finally {
    await strona.close();
  }
}

for (let i = 0; i < zadania.length; i += RAZEM) await Promise.all(zadania.slice(i, i + RAZEM).map(narysuj));
await przegladarka.close();
console.log(`${readdirSync(KATALOG).length} obrazów w public/budowa/`);
