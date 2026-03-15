# Analyse qualité du code

> Généré par l'outil d'analyse statique du dépôt.
> **Note :** `public/draco/draco_wasm_wrapper.js` est un fichier tiers minifié — les occurrences qui le concernent sont des faux positifs et doivent être exclues de l'outil d'analyse.

---

## Résumé

| Catégorie | Règle | Occurrences | Sévérité |
|---|---|---|---|
| Imports circulaires | `circular-imports` | 2 | Critique |
| Modules orphelins | `orphan-modules` | 10 | Haute |
| Fonctions trop longues | `long-functions` | 6 | Haute |
| Ternaires imbriquées * | `no-nested-ternary` | 15 | Moyenne |
| Nombres magiques | `magic-numbers` | 75 | Moyenne |
| Nommage de booléen | `boolean-naming` | 1 | Faible |
| Point-virgules inconsistants | `missing-semicolons` | 6 fichiers | Faible |
| Lignes trop longues * | `long-lines` | 117 | Faible |
| Styles d'export mixtes | `mixed-export-styles` | 1 | Faible |
| Variables à une lettre * | `single-letter-vars` | 110 | Bruit |
| Imbrication profonde * | `deep-nesting` | 1 | Bruit |

*\* Majoritairement des faux positifs — voir détail par section.*

---

## Critique

### Imports circulaires — `circular-imports` (2x) — ✅ FAUX POSITIF

Après vérification manuelle de la chaîne de dépendances complète, **aucune circularité réelle** n'existe.

- `crtShader.ts` importe de `crtFonts`, `crtShaders`, `crtCanvasTexture`, `crtTypes` — aucun de ces modules ne réimporte `crtShader.ts`
- `hero.ts` importe de `crtShader`, `crtModelPreview`, `crtConfig`, `menuPreview3D`, etc. — aucune boucle

L'outil détecte à tort les tests important leur module source comme une circularité. Reconfigurer l'outil pour exclure les fichiers `*.test.ts`.

---

## Haute

### Modules orphelins — `orphan-modules` (10x)

Ces fichiers exportent des symboles mais ne sont importés par aucun autre fichier.

**Après audit :**

| Fichier | Statut confirmé |
|---|---|
| [src/controllers/modelRotationController.ts](src/controllers/modelRotationController.ts) | ⚠️ Dead code confirmé — aucune référence dans le source |
| [src/components/3d/glbModel.ts](src/components/3d/glbModel.ts) | ⚠️ Dead code confirmé — aucune référence dans le source |
| [src/sections/04-oeil-big-brother/bigBrother.ts](src/sections/04-oeil-big-brother/bigBrother.ts) | ✅ Faux positif — import dynamique dans `definitions.ts:58` |
| [src/sections/03-les-reliques/reliques.ts](src/sections/03-les-reliques/reliques.ts) | ✅ Faux positif — import dynamique dans `definitions.ts:50` |
| [src/sections/06-outro-eclipse/eclipse.ts](src/sections/06-outro-eclipse/eclipse.ts) | ✅ Faux positif — import dynamique dans `definitions.ts:75` |
| [src/sections/02-hub-central-menu/menu.ts](src/sections/02-hub-central-menu/menu.ts) | ✅ Faux positif — import dynamique dans `definitions.ts:41` |
| [src/sections/05-mpc-3d/mpc3d.ts](src/sections/05-mpc-3d/mpc3d.ts) | ✅ Faux positif — import dynamique dans `definitions.ts:66` |
| [scripts/lf-utils.mjs](scripts/lf-utils.mjs) | ✅ Faux positif (script CLI) |
| [src/vite-env.d.ts](src/vite-env.d.ts) | ✅ Faux positif (types ambiants TypeScript) |
| [vite.config.ts](vite.config.ts) | ✅ Faux positif (config Vite) |

---

### Fonctions trop longues — `long-functions` (6x)

| Fonction | Fichier | Ligne |
|---|---|---|
| `createMenuPreview3D` (256 lignes) | [src/components/3d/menuPreview3D.ts](src/components/3d/menuPreview3D.ts) | 184 |
| `createScrollManager` | [src/core/scrollManager.ts](src/core/scrollManager.ts) | 37 |
| `draw` | [src/sections/01-hero/crtCanvasTexture.ts](src/sections/01-hero/crtCanvasTexture.ts) | 39 |
| `initHeroSection` | [src/sections/01-hero/hero.ts](src/sections/01-hero/hero.ts) | 118 |
| `createSectionManager` | [src/sections/sectionManager.ts](src/sections/sectionManager.ts) | 10 |
| `createTextCanvasTexture` | [src/sections/01-hero/crtCanvasTexture.ts](src/sections/01-hero/crtCanvasTexture.ts) | 16 |

---

## Moyenne

### Ternaires imbriquées — `no-nested-ternary` (15x)

> **Faux positifs :** La majorité des occurrences sont des opérateurs `??` (nullish coalescing) et `?.` (optional chaining), incorrectement détectés comme ternaires imbriquées. Seules les occurrences dans `draco_wasm_wrapper.js` sont des ternaires réelles, mais dans du code tiers minifié — non actionnables.

Occurrences dans du code source applicatif à vérifier manuellement :

| Fichier | Ligne | Code |
|---|---|---|
| [src/sections/dom.ts](src/sections/dom.ts) | 7 | `const headingTag = section.headingTag ?? 'h2';` |
| [src/sections/definitions.ts](src/sections/definitions.ts) | 105 | `.map((section) => section.crtMenuLabel ?? section.heading...)` |
| [src/controllers/modelRotationController.ts](src/controllers/modelRotationController.ts) | 41 | `x: config.base?.x ?? DEFAULT_BASE_ROTATION.x,` |
| [src/sections/sectionManager.ts](src/sections/sectionManager.ts) | 113 | `sectionObserver?.unobserve(target);` |
| [src/components/3d/menuPreview3D.ts](src/components/3d/menuPreview3D.ts) | 409 | `entry.tween?.kill();` |
| [src/core/scene.ts](src/core/scene.ts) | 10 | `const memory = (navigator as Navigator & { deviceMemory?:...` |
| [src/sections/01-hero/hero.ts](src/sections/01-hero/hero.ts) | 335 | `if (hits.length === 0 \|\| !hits[0]?.uv) {` |
| [src/sections/sectionManager.test.ts](src/sections/sectionManager.test.ts) | 187 | `observer?.trigger(face, true);` |
| [src/controllers/modelRotationController.ts](src/controllers/modelRotationController.ts) | 43 | `z: config.base?.z ?? DEFAULT_BASE_ROTATION.z,` |
| [src/core/scrollManager.ts](src/core/scrollManager.ts) | 156 | `scrub: options.scrub ?? true,` |
| [src/sections/01-hero/hero.ts](src/sections/01-hero/hero.ts) | 12 | `import darthVaderHelmetUrl from '../../3d-models/darth_va...'` |
| [src/core/scrollManager.ts](src/core/scrollManager.ts) | 154 | `start: options.start ?? 'top 80%',` |
| [src/components/3d/menuPreview3D.ts](src/components/3d/menuPreview3D.ts) | 189 | `const renderTargetSize = quality.renderTargetSize ?? DEFA...` |

---

### Nombres magiques — `magic-numbers` (75x)

> **Faux positifs :** Les occurrences dans les fichiers `*.test.ts` et `public/draco/draco_wasm_wrapper.js` sont normales ou non actionnables.

Fichiers de production à corriger :

| Fichier | Lignes |
|---|---|
| [src/core/scene.ts](src/core/scene.ts) | 14 |
| [src/core/gpuCapabilities.ts](src/core/gpuCapabilities.ts) | 35, 80, 82, 84, 88 |
| [src/sections/01-hero/crtConfig.ts](src/sections/01-hero/crtConfig.ts) | 35, 47, 48, 49, 50 |
| [src/sections/01-hero/crtShaders.ts](src/sections/01-hero/crtShaders.ts) | 33, 34, 54, 55 |
| [src/sections/01-hero/crtShader.ts](src/sections/01-hero/crtShader.ts) | 10, 29, 32 |
| [src/sections/01-hero/crtCanvasTexture.ts](src/sections/01-hero/crtCanvasTexture.ts) | 48, 49, 51, 52, 74 |
| [src/sections/01-hero/heroFallback.ts](src/sections/01-hero/heroFallback.ts) | 24, 25, 26, 28 |
| [src/sections/01-hero/hero.ts](src/sections/01-hero/hero.ts) | 96, 99, 101 |
| [src/components/3d/menuPreview3D.ts](src/components/3d/menuPreview3D.ts) | 39, 40, 46 |
| [src/sections/sectionManager.ts](src/sections/sectionManager.ts) | 137 |

---

## Faible

### Nommage de booléen — `boolean-naming` (1x)

| Fichier | Ligne | Avant | Après suggéré |
|---|---|---|---|
| [src/sections/01-hero/crtFonts.ts](src/sections/01-hero/crtFonts.ts) | 31 | `fontsPreloaded` | `isFontsPreloaded` |

---

### Point-virgules inconsistants — `missing-semicolons` (6 fichiers)

Mélange de lignes avec (49) et sans (5) point-virgule. Un passage Prettier suffit.

- [src/components/3d/menuPreview3D.test.ts](src/components/3d/menuPreview3D.test.ts)
- [src/sections/01-hero/hero.ts](src/sections/01-hero/hero.ts)
- [src/components/3d/glbModel.ts](src/components/3d/glbModel.ts)
- [src/sections/01-hero/crtShaders.ts](src/sections/01-hero/crtShaders.ts)
- [src/components/3d/menuPreview3D.ts](src/components/3d/menuPreview3D.ts)
- [src/sections/definitions.ts](src/sections/definitions.ts)

---

### Styles d'export mixtes — `mixed-export-styles` (1x)

| Fichier | Ligne | Détail |
|---|---|---|
| [src/sections/01-hero/hero.ts](src/sections/01-hero/hero.ts) | 512 | Mélange `export default` et exports nommés — `export default initHeroSection;` |

---

### Lignes trop longues — `long-lines`

> **Faux positifs :** Les 117 lignes signalées se trouvent dans `public/draco/draco_wasm_wrapper.js` (fichier tiers minifié). Aucune action requise dans le code source.

---

## Bruit — faux positifs à exclure de l'outil

### Variables à une lettre — `single-letter-vars` (110x)

Toutes les 110 occurrences sont dans `public/draco/draco_wasm_wrapper.js`. **Non actionnable.**

### Imbrication profonde — `deep-nesting` (1x)

L'unique occurrence (niveau 7) est dans `public/draco/draco_wasm_wrapper.js:29`. **Non actionnable.**

---

## Actions recommandées sur l'outil d'analyse

- Exclure `public/draco/draco_wasm_wrapper.js` de toutes les règles
- Reconfigurer `no-nested-ternary` pour ne pas cibler `??` et `?.`
- Ajouter `vite.config.ts`, `vite-env.d.ts` et `scripts/` à la liste d'exclusions des `orphan-modules`
