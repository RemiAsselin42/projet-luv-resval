# Projet Luv Resval

Expérience web artistique immersive autour de l'univers de Luv Resval (3D, animation, narration visuelle).

## Vision

Le projet n'est pas un site vitrine classique orienté UX "standard", mais une oeuvre interactive : ambiance cinématographique, références pop culture, esthétique dystopique et forte identité sonore/visuelle.

## État actuel

- Stack en place : Vite + TypeScript strict + Three.js + GSAP + SCSS.
- Scène 3D fonctionnelle avec modèle MPD218 et interactions de rotation.
- Objectif à court terme : passer d'un prototype 3D unique à une expérience multi-sections orchestrée au scroll.

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

## Architecture cible (progressive)

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
├── controllers/
├── shaders/
├── utils/
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
npm run format
npm run format:check
npm run typecheck
npm run test
npm run validate
```

## Roadmap de livraison (recommandée)

1. Stabiliser l'infra (`core`: scene, resize, render loop, scroll manager).
2. Implémenter Hero + Face/Vader avec transitions GSAP.
3. Ajouter galerie d'objets 3D + modal d'information.
4. Ajouter parallax Big Brother + crawl Star Wars.
5. Ajouter MPC beatmaker + section Grünt.
6. Finaliser optimisation perf (LOD, lazy loading, quality fallback).

## Ressources

- [Documentation Three.js](https://threejs.org/docs/)
- [Documentation GSAP](https://greensock.com/docs/)
- [Exemples Three.js](https://threejs.org/examples/)
- [Site officiel Luv Resval](https://luvresval-officiel.com)
- [Wikipedia Luv Resval](https://fr.wikipedia.org/wiki/Luv_Resval)

---

**MPC Part III** - Tribute artistique à Luv Resval
