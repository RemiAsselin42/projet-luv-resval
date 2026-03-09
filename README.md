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
│   ├── 02-face-vader/
│   ├── 03-thematic-objects/
│   ├── 04-big-brother/
│   ├── 05-mpc-beatmaker/
│   ├── 06-star-wars-crawl/
│   └── 07-grunt/
├── components/
│   └── 3d/
│       └── glbModel.ts
├── controllers/
└── styles/
```

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
