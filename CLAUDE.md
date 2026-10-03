# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

World of Raptors is a private, single-user online course about birds of prey (biology and field identification, focused on Poland, southern Spain and the Strait of Gibraltar). The owner writes and reads in Polish: all course content and UI copy are Polish; code, comments and commit messages are English; PR descriptions are Polish. Deployed on Vercel from `main` (https://world-of-raptors.vercel.app). Human-facing docs: `README.md`, `TECH.md` (Polish, how to add content), `content/PLAN-KURSU.md` (course plan), `DS-GAPS.md` (design-system gaps).

## Commands

```bash
npm run dev          # http://localhost:3000
npm run build        # production build; prerenders every lesson and species page
npm run lint         # eslint
npx tsc --noEmit     # type-check
python3 scripts/commons.py search "<query>" --out <dir> --limit 8   # find freely licensed Commons photos (downloads previews to inspect)
python3 scripts/commons.py tag "File:<title>" --podpis "…" --alt "…" # print a <zdjecie> tag with author/licence filled in
```

There is no test suite. Verify changes with `tsc`, `lint` and `npm run build` (the build fails on malformed content: `src/lib/content.ts` validates `content/gatunki.json` at import time), then check the page in a browser.

Environment caveats:
- The repo lives in `~/Documents`, which iCloud syncs. iCloud creates `* 2.*` conflict copies (even inside `.git/` and `.next/`) and has reverted a file to an older version. Before committing, look for `* 2*` files, compare them with the original and delete them; if `next build` fails with `ENOTEMPTY` on `.next`, `rm -rf .next`.
- Don't run two `next build`s against the same `.next` at once (parallel agents corrupt it).
- `node_modules` and `.next` are symlinks into `node_modules.nosync/` and `.next.nosync/`, because iCloud skips names ending in `.nosync`. Inside iCloud, reads of `node_modules` hung for minutes and iCloud deleted files from it. Both `npm install` and `npm ci` replace the symlink with a real folder, so after every install run `rm -rf node_modules.nosync/node_modules && mv node_modules node_modules.nosync/ && ln -s node_modules.nosync/node_modules node_modules`.

## Architecture

**Content is data, the app is a renderer.** Nearly all course material lives in `content/`:
- `moduly.json` defines the two paths, the modules (A1–A7, B1–B5) and each module's lesson order and titles. A lesson exists for the app only if it is listed here, and a module only if it has `gotowy: true`, a `slug` and a `lekcje` list (`gotoweModuly` in `content.ts`).
- `moduly/<slug>/README.md` (module overview) and `moduly/<slug>/NN-*.md` (lessons). Routes `/moduly/[slug]` and `/moduly/[slug]/[lekcja]` are generated from `moduly.json` via `generateStaticParams` with `dynamicParams = false`.
- `gatunki.json` is the species atlas: Polish/Latin/English/Spanish names, `regiony`, `aktywnosc` (`dzienny` | `nocny`), `mylona_z` (look-alike ids) and `sylwetka` (ID cues). Diurnal and nocturnal species use different `sylwetka` keys; the build throws if a species has unknown or missing keys. The cue order in `SpeciesCues.tsx` mirrors the method lessons (B1 for raptors, B5 for owls).
- `zdjecia.json` holds two reference photos per species (Commons thumbnails with author and licence); `ciekawostki.json` holds the rotating curiosities.

`src/lib/content.ts` (server-only) loads all of this and is the single entry point for pages. Besides the module routes, the app has `/gatunki` (atlas) and `/gatunki/[id]`, `/checklista`, `/fiszki` and `/plan`. A species page links to the modules that cover it via `modulyGatunku()`, which maps `regiony`/`aktywnosc` to hard-coded module slugs; a new region or module needs a line there.

**Lesson rendering** (`src/components/Markdown.tsx`): `react-markdown` + `remark-gfm` + `rehype-raw` (raw HTML is allowed because content is authored in-repo). Relative `.md` links are mapped to app routes by `src/lib/links.ts`. Custom block tags: `<species-photos data-id="…">`, `<zdjecie src=… autor=… licencja=…>` and `<quiz-krokowy>` (inserted by code, see below) must be written with the opening tag on its own line and the closing tag on the next, with blank lines around them; otherwise Markdown wraps them in a `<p>`.

**Lesson pages are Big Hat `Article`s.** `przygotujStroneLekcji()` in `content.ts` turns a lesson file into the page: the `#` title is dropped (the title comes from `moduly.json`), a single paragraph right under it becomes the lead, the `##` headings become the table of contents (ids from `src/lib/naglowki.ts`, shared with the renderer, so `##` headings must stay plain text), and reading time is counted from the words.
- **Margin convention:** photos and side notes (`> ` callouts) go in `<margines>`, written *before* the paragraph they belong to, with blank lines inside so the content stays Markdown. It renders as `ArticleMargin`: beside the paragraph on a wide article, above it on a narrow one. Every `h2` clears the margin, so notes never drift into the next section.
- **Quiz:** a `## … Quiz (próg zaliczenia: N%)` section with numbered questions, each followed by an indented `a) … b) … c) …` line with the correct option in **bold**, is parsed by `wyodrebnijQuiz()` and replaced with the step-by-step `QuizKrokowy` (one question per screen, feedback after each answer, pass mark N%). Passing marks the lesson finished. A question without exactly one bold option fails the build.
- The shell navigation shows the current module's syllabus (`AppFrame`): the overview and the lessons with their state; quiz lessons are labelled with the pass mark.

**Species plates are attached by convention.** `przygotujLekcje()` in `content.ts` finds `### <Name> — *Genus species*` headings whose italic binomial matches an atlas species and inserts that species' plate (`SpeciesMedia`: photos, `CuesTable` comparison with look-alikes, links) at the end of that heading's section. It also collects every atlas binomial mentioned in the lesson for the closing `LessonMedia` section. The italic Latin name is therefore load-bearing: renaming or un-italicising it silently removes a plate.

**Per-browser state, no backend.** Everything personal lives in the browser:
- `src/lib/magazyn.ts` is a generic `localStorage` store used by the checklist (`checklist.ts`, key `wor:checklista:v1`), lesson progress (`postep.ts`, `wor:postep:v1`) and flashcard schedules (`fiszki.ts`, `wor:fiszki:v1`). Its hook returns `null` until the stored copy is read (always on the server and during hydration), so components render a `StateBlock` loading state instead of a guessed value. Unreadable stored data is copied to `<key>:bad` before the store starts empty; saves return `false` when the browser refuses, and callers show a toast via `useOstrzezenieZapisu`.
- The owner's own photos are in IndexedDB (`zdjeciaWlasne.ts`), re-encoded to max 1600 px JPEG, which also strips EXIF/GPS.
- Backups (`kopia.ts`, format v2: checklist + progress + flashcards + photos; `fiszki` is optional because older v2 files lack it; v1 files still import). Import validates and decodes the whole file first, then writes photos in one aborting transaction, then progress and flashcards, then the checklist. Keep that order.
- The curiosity card remembers what was already shown under `wor:ciekawostki:widziane`.

**Flashcards** (`/fiszki`, `FiszkiView.tsx`): one card per atlas reference photo (`taliaFiszek()` in `content.ts`, id `<species>/<lot|siedzacy>`), scheduled by FSRS (`ts-fsrs`, default parameters with fuzz). A card with no stored entry is new. Order: overdue reviews, then new cards (up to 10 a day, counted by `wprowadzona`), then reviews due within the next 20 minutes. The photo's alt text must not name the species before the answer is shown.

**Rendering modes.** Every page is static except the home page (`export const dynamic = 'force-dynamic'`), which picks a species of the day by the Europe/Warsaw date. Client-only choices (a random curiosity) are made after mount, because a server-side pick would freeze at build time. Images use `images.unoptimized`: Commons thumbnails are served directly; `public/zdjecia/` holds resized copies of the owner's own photos. The originals sit in the git-ignored `/Images`; never publish or reference them directly.

## Big Hat design system

UI is built on Big Hat (`@bighat/ui`, installed from GitHub at a pinned commit, not from npm).
- Before writing UI, read `node_modules/@bighat/ui/agent/SKILL.md` and `react.md`. Component contracts are in `node_modules/@bighat/ui/spec/components/*.json`; check `notFor` before choosing a component.
- Import components from `@/components/ds` (a `'use client'` re-export, since the package has no directives), never from `@bighat/ui`. Components take no `className`/`style`; page layout classes live in `src/app/globals.css`, which uses semantic `--bh-*` tokens only (exceptions: `1px` borders and reading-measure widths).
- Empty, loading and error states are always `StateBlock`.
- `ButtonLink` is a local component: navigation styled with `bh-button` classes, because `Button`'s contract excludes navigation.
- `Card` holds one action at most (contract `notFor`: "Cards with two actions inside").
- When the system can't do something (e.g. its built-in uppercase labels, no type size above `display`), record it in `DS-GAPS.md` instead of overriding `bh-*` classes.
- Deliberate visual decisions: no emoji as icons, no arrows in button labels, no ALL-CAPS labels of our own, no " · " meta strings (module ids read like catalogue numbers with a non-breaking space: `B3 Cieśnina Gibraltarska`).

## Content conventions

- Polish throughout. The owner refers to herself in the feminine first person ("Ukończyłam tę lekcję", "Zaobserwowałam"); keep that form.
- Species on first mention: Polish name, *Latin binomial* in italics, `(ang. English Name)`.
- Facts are hedged ("ok.", "uważa się") when uncertain; don't state precise figures you can't source.
- Lesson photos come from Wikimedia Commons with free licences only. Verify each photo visually and check that the file title names the right species (past mistakes: a Bald Eagle filed as White-tailed Eagle, *Circus hudsonius* as Hen Harrier, a Tawny Eagle as Short-toed Eagle).
- Curiosities (`ciekawostki.json`) must stand alone: bold/italic only, no links (the card's single action is "Czytaj dalej").

## Workflow

- Work on a feature branch and open a PR to `main`; the owner reviews and merges (or explicitly asks you to merge).
- A local PreToolUse hook blocks `gh pr create` until `/pr-review-toolkit:review-pr` has run for the branch; fix critical and important findings first.
- `AGENTS.md` is managed by `next dev` (see its own note); don't edit it by hand.
