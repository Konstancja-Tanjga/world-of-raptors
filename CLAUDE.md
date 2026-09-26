@AGENTS.md

# World of Raptors

- UI uses the Big Hat design system. Before writing UI, read `node_modules/@bighat/ui/agent/SKILL.md` and `node_modules/@bighat/ui/agent/react.md`.
- Import design system components from `@/components/ds`, never from `@bighat/ui` directly (the package has no "use client" directives).
- Own styles live in `src/app/globals.css` and use semantic `--bh-*` tokens only.
- Course content is Markdown in `content/`; see `TECH.md` for how to add lessons, modules and species.
- Content is written in Polish.
