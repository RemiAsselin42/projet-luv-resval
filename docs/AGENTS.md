# CLAUDE.md

## Purpose

This website is an artistic tribute to rapper Luv Resval, highlighting his unique style and influence in the world of rap. The aim is to create an immersive experience for fans, using visual and interactive elements that reflect the essence of his music and personality. The site aims to celebrate Luv Resval's career, highlighting his famous 30-minute Grünt (freestyle performance) and his impact on the music scene. By combining artistic and technological elements, we want to offer visitors a memorable experience that pays tribute to the artist while engaging his community of fans.

Main themes of Luv Resval's music : cinema / drugs (lean) / Zelda / Harry Potter / Star Wars / science fiction - space / apocalyptic / dystopian / melancholic / spleen / darkness / introspection

## Main Informations

The website is in french only, and will include (in this specific order) :

- L'Amorce (Hero): full CRT screen intro with visual/sound static, retro loading bar, glitch title "Luv Resval" + subtitle "Grunt #45", and blinking prompt "Scrollez pour allumer".

- Le Hub Central (Menu TV): menu navigation style TV 90s, centered on left after first scroll, navigable via mouse, arrows and Tab, with associated visual preview on the right.

- Section 1 - Les Reliques: four interactive 3D objects (death_star.glb, zelda.glb, minautor.glb, rose.glb) with hover modals (title + short lore).

- Section 2 - L'Oeil de Big Brother: dystopian transition with giant face behind wall, lifting head toward the user with scroll-based parallax.

- Section 3 - La MPC 3D: interactive 9-pad drum machine; keyboard and click interactions trigger stems including lead vocal and ad-libs; all pads rebuild the full track.

- Section 05 - Crash Outro: return to darkness, 4 stage spotlights from original video, final wheel movement tilts lights down then turns them off one by one.

- Global interface: persistent corner button "Retour au Hub" for instant jump back to CRT menu.

## Technical Direction (MUST FOLLOW)

### Core stack

- Keep the project in vanilla TypeScript with Vite (no heavy UI framework by default).
- Use Three.js for 3D rendering and GSAP (+ ScrollTrigger) for timeline/scroll orchestration.
- Use SCSS for styling and maintain strict TypeScript typing.

### Implementation strategy

- Build one shared Three.js scene for the whole website.
- Organize each content block as a dedicated section module (`src/sections/*`).
- Keep one global render loop and register section-specific updates when needed.
- Prefer progressive delivery: implement sections in order, optimize after each milestone.

### Asset pipeline

- Prefer `.glb/.gltf` assets over `.obj` whenever possible.
- Use `GLTFLoader` and `DRACOLoader` for compressed model loading.
- Lazy-load heavy assets only when the related section gets close in scroll.

### Performance rules

- Cap renderer pixel ratio and adapt quality for low-end devices.
- Use LOD for secondary or distant 3D objects.
- Keep post-processing optional and lightweight.
- Avoid unnecessary real-time calculations in the render loop.

### Simplicity rule

- Do not add complexity "just in case".
- Prefer stable, battle-tested libraries over custom low-level implementations.
- If a choice is ambiguous, select the simplest implementation that respects the artistic vision.

## Task Flow

1. Understand scope and success criteria from the user request.
2. Locate relevant code through feature folders first.
3. Implement focused edits in the corresponding feature slice.
4. Run the most specific tests first, then broader checks if needed.
5. Report changed files, expected behavior, and verification status.

## CI/CD Guardrails (must pass before push)

- Run `npm run validate` locally before pushing to `main` or opening a PR.
- Keep ESLint strict: `npm run lint` must pass with `--max-warnings 0`.
- Do not use `console.log/info/debug` in production code (`console.warn/error` only when justified).
- Keep TypeScript and `@typescript-eslint/*` versions compatible to avoid CI parser warnings.
- If lint, typecheck, or build fails, fix root causes in code/config before pushing.

## Source of Truth

Documentation and references for Luv Resval:

- Luv Resval's official website : https://luvresval-officiel.com
- Luv Resval's wikipedia page : https://fr.wikipedia.org/wiki/Luv_Resval

Technical references :

- Three.js documentation: https://threejs.org/docs/
- GSAP documentation: https://greensock.com/docs/

Inspiration for design and interactivity:

- 3D and really advanced animations examples: https://landonorris.com/ or https://www.igloo.inc/
- Three.js interactive examples: https://threejs.org/examples/
- MPC drum machine interfaces: https://splice.com/sounds/beatmaker or https://www.onemotion.com/drum-machine/

## Implementation Standards

- TypeScript strict typing for all new code.
- Detection logic as pure functions whenever possible.
- Rule execution remains resilient: failures are surfaced and scan continues.
- Naming remains consistent with existing codebase conventions.
- Keep modules focused and small: one feature/section per file group.
- Distinguish clearly between current implementation and target architecture in docs.
- Use canonical `SECTION_IDS` keys (HERO, HUB_CENTRAL, RELIQUES, BIG_BROTHER, MPC, CRASH_OUTRO). Do not use deprecated aliases (MENU, FACE_VADER, MPC_3D, etc.) in new code.
- Use `querySectionElement(id)` from `src/utils/dom.ts` for DOM queries on sections instead of inline `document.querySelector`.

## TypeScript development checklist:

- Strict mode enabled with all compiler flags
- No explicit any usage without justification
- 100% type coverage for public APIs
- ESLint configured and enforced
- Test coverage: thresholds 80% lines/functions, 70% branches (configured in `vitest.config.ts`)
- Source maps properly configured
- Declaration files generated
- Bundle size optimization applied

## Default commands:

- `npm run dev` : start development server with hot reload
- `npm run build` : create production build
- `npm run preview` : preview production build locally
- `npm run lf:check` : check tracked text files for CRLF/LF issues
- `npm run lf:fix` : normalize tracked text files to LF
- `npm run lint` : run ESLint checks
- `npm run lint:fix` : run ESLint with auto-fix
- `npm run lint:style` : run Stylelint checks for CSS/SCSS
- `npm run lint:style:fix` : run Stylelint with auto-fix for CSS/SCSS
- `npm run typecheck` : run TypeScript type checks
- `npm run test` : run unit tests (Vitest, jsdom environment)
- `npm run test:coverage` : run unit tests with v8 coverage report
- `npm run validate` : run `lf:check`, lint, stylelint, typecheck, and build

## Response Format for Agent Work

- Before each implementation task, summarize for yourself the intended change and validation plan in a concise format. If the task is unclear, ask for clarification before proceeding.

- For each implementation task, provide:

- what changed
- where it changed
- how it was validated
- follow-up suggestion if relevant

## Context Quality Rule

Keep AGENTS guidance concise, actionable, and repository-specific.
Prefer short, positive instructions that directly improve task completion quality.
