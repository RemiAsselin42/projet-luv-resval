# CLAUDE.md

## Purpose

This website is an artistic tribute to rapper Luv Resval, highlighting his unique style and influence in the world of rap. The aim is to create an immersive experience for fans, using visual and interactive elements that reflect the essence of his music and personality. The site aims to celebrate Luv Resval's career, highlighting his famous 30-minute Grünt (freestyle performance) and his impact on the music scene. By combining artistic and technological elements, we want to offer visitors a memorable experience that pays tribute to the artist while engaging his community of fans.

Main themes of Luv Resval's music : cinema / drugs (lean) / Zelda / Harry Potter / Star Wars / science fiction - space / apocalyptic / dystopian / melancholic / spleen / darkness / introspection

## Main Informations

The website is in french only, and will include (in this specific order) :

- The name Luv Resval in the Hero section, with a hover effect on the letters

- A 3D representation composed half of Luv Resval's face and half of Darth Vader, which reacts to user interactions such as mouse movements and clicks, using Three.js for 3D rendering and GSAP for animations.

- After that will be multiple 3D objets representing the themes of Luv Resval's music, such as a 3D representation of a lean cup, a Zelda Triforce, a Harry Potter wand, a Star Wars lightsaber, etc. These objects will react to user interactions such as mouse movements and clicks, using Three.js for 3D rendering and GSAP for animations. On hover, a modal will open providing more information about the reference and its connection to Luv Resval's work.

- A parallax scrolling effect with Big Brother (from 1984) watching over the site, symbolizing the themes of surveillance and control often present in Luv Resval's music.

- An 3D MPC drum machine interface that allows users to create their own beats, inspired by Luv Resval's musical style.

- Star Wars-style scrolling text that tells the story of Luv Resval's career and his influence on the rap scene.

- At the bottom of the page, a section dedicated to Luv Resval's famous 30-minute Grünt, with an embedded video player

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

## TypeScript development checklist:

- Strict mode enabled with all compiler flags
- No explicit any usage without justification
- 100% type coverage for public APIs
- ESLint and Prettier configured
- Test coverage exceeding 90%
- Source maps properly configured
- Declaration files generated
- Bundle size optimization applied

## Default commands:

- `npm run dev` : start development server with hot reload
- `npm run build` : create production build
- `npm run preview` : preview production build locally
- `npm run lint` : run ESLint checks
- `npm run lint:fix` : run ESLint with auto-fix
- `npm run lint:style` : run style-specific ESLint checks
- `npm run lint:style:fix` : run style-specific ESLint checks with auto-fix
- `npm run format` : run Prettier formatting
- `npm run format:check` : check Prettier formatting without changing files
- `npm run typecheck` : run TypeScript type checks
- `npm run test` : run unit tests
- `npm run validate` : run all validation checks (lint, format, typecheck, test)

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
