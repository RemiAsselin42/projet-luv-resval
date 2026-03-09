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
│   └── postprocessing.ts
├── sections/
│   ├── 01-hero/
│   ├── 02-hub-central-menu/
│   ├── 03-les-reliques/
│   ├── 04-oeil-big-brother/
│   ├── 05-mpc-3d/
│   └── 06-outro-eclipse/
├── components/
│   └── 3d/
│       └── glbModel.ts
├── controllers/
└── styles/
```

## Structure narrative cible

Ordre centralise dans `src/sections/definitions.ts` :

1. `hero` : L'Amorce (CRT, boot retro, titre glitch, invite scroll)
2. `hub-central` : Hub Central (menu TV 90s, preview, navigation clavier/souris)
3. `reliques` : Les Reliques (4 objets 3D + modales lore)
4. `oeil-big-brother` : L'Oeil de Big Brother (parallaxe dystopique)
5. `mpc-3d` : La MPC 3D (9 pads + stems)
6. `outro-eclipse` : L'Eclipse (4 projecteurs, extinction finale)

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
npm run dev
npm run build
npm run preview
npm run lint
npm run lint:fix
npm run lint:style
npm run lint:style:fix
npm run typecheck
npm run test
npm run validate
```

## Ressources

- [Documentation Three.js](https://threejs.org/docs/)
- [Documentation GSAP](https://greensock.com/docs/)
- [Exemples Three.js](https://threejs.org/examples/)
- [Site officiel Luv Resval](https://luvresval-officiel.com)
- [Wikipedia Luv Resval](https://fr.wikipedia.org/wiki/Luv_Resval)

---

**MPC Part III** - Tribute artistique à Luv Resval
