# Projet Luv Resval

Expérience web artistique immersive autour de l'univers de Luv Resval (3D, animation, narration visuelle).

## Vision

Le projet n'est pas un site vitrine classique, mais une oeuvre interactive : ambiance cinématographique, références pop culture, esthétique dystopique et forte identité sonore/visuelle.

## État actuel

- Stack en place : Vite + TypeScript strict + Three.js + GSAP/ScrollTrigger + Lenis + SCSS.
- Une scène Three.js globale est initialisée dans `main.ts` et rendue en continu.
- Les sections sont chargées dynamiquement via un registre (`sectionLoaders`) et un `sectionManager`.

## Approche technique recommandée (simple et robuste)

### Principes

- Garder une base **vanilla TypeScript** (pas de framework UI lourd).
- Utiliser **une seule scène Three.js** pour tout le site.
- Orchestrer les transitions avec **GSAP + ScrollTrigger**.
- Charger les sections et assets de manière **progressive** (lazy loading).

### Librairies recommandées

- [Three.js](https://threejs.org/) : rendu 3D principal.
- [GSAP](https://greensock.com/gsap/) + ScrollTrigger : animation timeline et scroll.
- [Lenis](https://github.com/darkroomengineering/lenis) : smooth scroll stable et pilotable.
- `GLTFLoader` + `DRACOLoader` (Three examples) : chargement 3D performant (`.glb` compressé).
- Optionnel : [postprocessing](https://github.com/pmndrs/postprocessing) pour bloom/vignette légers.

## Architecture actuelle

```text
src/
├── main.ts
├── core/
│   ├── scene.ts
│   ├── lights.ts
│   ├── scrollManager.ts
│   ├── assetLoader.ts
│   ├── postprocessing.ts
│   ├── gpuCapabilities.ts
│   └── telemetry.ts
├── sections/
│   ├── definitions.ts          ← registre central + SECTION_IDS canoniques
│   ├── 01-hero/
│   │   ├── hero.ts             ← orchestrateur principal (réexporte heroLoader)
│   │   ├── heroLoader.ts       ← contrôleur de chargement (barre + PLAY + power-on)
│   │   ├── heroRaycaster.ts    ← détection hover/clic sur le mesh CRT
│   │   ├── heroAccessibility.ts ← menu nav accessible (Tab, focus, ARIA)
│   │   ├── heroTimelines.ts    ← timelines GSAP/ScrollTrigger hero et fade
│   │   ├── heroFallback.ts     ← rendu HTML/CSS si WebGL absent
│   │   ├── crtConfig.ts        ← constantes partagées CRT (PLANE_HEIGHT, PLAY_BUTTON_PULSE…)
│   │   ├── crtShader.ts        ← shader GLSL et matériau CRT
│   │   ├── crtCanvasTexture.ts ← dessin canvas de la texture CRT
│   │   ├── crtFonts.ts         ← chargement et vérification des polices CRT
│   │   ├── crtModelPreview.ts  ← prévisualisation du modèle 3D dans le CRT
│   │   └── crtTypes.ts         ← types partagés CRT
│   ├── 02-hub-central-menu/
│   ├── 03-les-reliques/
│   ├── 04-oeil-big-brother/
│   ├── 05-mpc-3d/
│   └── 06-outro-eclipse/
├── components/
│   └── 3d/
│       ├── glbLoader.ts
│       └── menuPreview3D.ts
├── utils/
│   ├── dom.ts                  ← querySectionElement, getSectionDataSelector
│   └── math.ts
└── styles/
```

## Structure narrative cible

Ordre centralisé dans `src/sections/definitions.ts`. Les IDs canoniques sont définis dans `SECTION_IDS` :

| Clé canonique    | ID DOM              | Label CRT menu   | Description                                          |
|------------------|---------------------|------------------|------------------------------------------------------|
| `HERO`           | `hero`              | L'AMORCE         | CRT, boot retro, titre glitch, invite scroll         |
| `HUB_CENTRAL`    | `hub-central`       | *(absent)*       | Menu TV 90s, preview, navigation clavier/souris      |
| `RELIQUES`       | `reliques`          | LES RELIQUES     | 4 objets 3D interactifs + modales lore               |
| `BIG_BROTHER`    | `oeil-big-brother`  | BIG BROTHER      | Parallaxe dystopique, visage géant                   |
| `MPC`            | `mpc`               | MPC              | 9 pads + stems interactifs                           |
| `OUTRO_ECLIPSE`  | `outro-eclipse`     | L'ECLIPSE        | 4 projecteurs, extinction finale                     |

> Les anciens identifiants (`MENU`, `FACE_VADER`, `MPC_3D`, etc.) sont conservés comme aliases
> dépréciés dans `SECTION_IDS` pour la rétrocompatibilité. Ne pas les utiliser dans le nouveau code.

Interface globale cible : bouton persistant `Retour au Hub`.

## Performance : checklist minimale

- Limiter le `pixelRatio` (`Math.min(devicePixelRatio, 2)`).
- Privilégier `.glb` plutôt que `.obj`.
- Compresser les meshes (Draco) et textures.
- Utiliser `THREE.LOD` pour les objets secondaires.
- Déclencher le chargement des assets section par section.
- Réduire les effets postprocess sur mobile / petites GPUs.

## Scripts disponibles

```bash
npm run dev              # Serveur de développement avec hot reload
npm run build            # Build de production
npm run preview          # Prévisualisation du build de production
npm run lf:check         # Vérification CRLF/LF sur les fichiers suivis
npm run lf:fix           # Normalisation des fins de ligne en LF
npm run lint             # ESLint TypeScript/JavaScript (--max-warnings 0)
npm run lint:fix         # ESLint avec auto-correction
npm run lint:style       # Stylelint CSS/SCSS
npm run lint:style:fix   # Stylelint avec auto-correction
npm run typecheck        # Vérification TypeScript sans émission
npm run test             # Exécution des tests unitaires (Vitest)
npm run test:coverage    # Tests avec rapport de couverture de code (v8)
npm run validate         # Pipeline complet : lf:check + lint + stylelint + typecheck + build
```

## Qualité du code

### Linting

- `ESLint` vérifie le code TypeScript/JavaScript du projet (`src/**/*.{js,ts,tsx}`).
- `Stylelint` vérifie les styles CSS/SCSS (`src/**/*.{css,scss}`).

Utilisation rapide :

- Vérifier le code : `npm run lint`
- Corriger automatiquement le code : `npm run lint:fix`
- Vérifier les styles : `npm run lint:style`
- Corriger automatiquement les styles : `npm run lint:style:fix`
- Vérifier tout le pipeline qualité (LF + lint + typecheck + build) : `npm run validate`

### Tests unitaires

Les tests utilisent [Vitest](https://vitest.dev/) avec l'environnement `jsdom`.

```bash
npm run test             # Lance tous les tests
npm run test:coverage    # Lance les tests avec couverture de code
```

Fichiers de configuration :

- `vitest.config.ts` : configuration Vitest, provider de couverture `v8`, seuils minimaux
- `vitest.setup.ts` : setup global des tests

Fichiers exclus de la couverture (pas de logique testable) :

- Fichiers de types (`.d.ts`, `crtTypes.ts`, etc.)
- Shaders GLSL (`crtShaders.ts`)
- Point d'entrée applicatif (`main.ts`)
- Stubs de sections non encore implémentées (`02` à `06`)

## Ressources

- [Documentation Three.js](https://threejs.org/docs/)
- [Documentation GSAP](https://greensock.com/docs/)
- [Exemples Three.js](https://threejs.org/examples/)
- [Site officiel Luv Resval](https://luvresval-officiel.com)
- [Wikipedia Luv Resval](https://fr.wikipedia.org/wiki/Luv_Resval)

---

**MPC Part III** - Tribute artistique à Luv Resval
