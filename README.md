# Projet Luv Resval

Expérience web interactive et immersive autour de l'univers de Luv Resval — 3D, animation, narration visuelle et identité sonore.

## Stack

- **Vite** + **TypeScript strict**
- **Three.js** — scène 3D unique partagée sur tout le site
- **GSAP** + **ScrollTrigger** + **Lenis** — animations et scroll fluide
- **SCSS** — styles modulaires avec variables centralisées dans `_variables.scss`
- **Howler.js** — gestion audio multi-layers
- **Vitest** — tests unitaires avec jsdom

## Architecture

```text
src/
├── main.ts                     ← point d'entrée, init scène + sections
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
│   │   ├── hero.ts             ← orchestrateur principal
│   │   ├── heroLoader.ts       ← barre de chargement + bouton PLAY + power-on
│   │   ├── heroRaycaster.ts    ← hover/clic sur le mesh CRT
│   │   ├── heroAccessibility.ts
│   │   ├── heroTimelines.ts    ← timelines GSAP/ScrollTrigger
│   │   ├── heroFallback.ts     ← rendu HTML/CSS si WebGL absent
│   │   ├── crtConfig.ts
│   │   ├── crtShader.ts        ← shader GLSL + matériau CRT
│   │   ├── crtCanvasTexture.ts ← texture canvas du CRT
│   │   ├── crtFonts.ts
│   │   ├── crtModelPreview.ts
│   │   └── crtTypes.ts
│   ├── 02-hub-central-menu/
│   ├── 03-les-reliques/
│   ├── 04-oeil-big-brother/
│   ├── 05-mpc-3d/
│   └── 06-outro-eclipse/
├── components/
│   └── 3d/
│       ├── glbLoader.ts
│       └── menuPreview3D.ts
├── audio/
│   ├── audioManager.ts         ← layers musicaux (6 tracks + 1 fx)
│   ├── audioManager.test.ts
│   └── types.ts
└── utils/
    ├── dom.ts
    ├── math.ts
    └── publicUrl.ts            ← résolution des chemins assets (BASE_URL)
```

Les sections sont chargées dynamiquement via un registre (`sectionLoaders`) et un `sectionManager`. L'ordre narratif est défini dans `definitions.ts`.

## Audio — audioManager

`src/audio/audioManager.ts` gère les layers musicaux via Howler.js.

| Méthode | Description |
|---|---|
| `startExperience()` | Démarre toutes les layers (depuis un événement utilisateur — politique autoplay) |
| `unlockMusicLayer(index)` | Active une layer, volume immédiat à `MUSIC_LAYER_VOLUME` |
| `lockMusicLayer(index)` | Coupe une layer, volume immédiat à 0 |
| `setMusicVolume(volume)` | Volume `[0,1]` sur toutes les layers **non verrouillées** |
| `toggleMute()` | Mute global via `Howler.volume(0/1)` |
| `isMuted()` | Retourne l'état du mute global |
| `playUiFx()` | Joue le son UI feedback (pooled, volume 0.5) |
| `dispose()` | Décharge toutes les instances Howl |

Les layers verrouillées (`_lockedLayers`) sont exclues de `setMusicVolume()`, ce qui permet au MPC de couper/activer des stems indépendamment du volume global.

## Scripts

```bash
npm run dev          # Serveur de développement
npm run build        # Build de production
npm run preview      # Prévisualisation du build
npm run validate     # Pipeline complet : lf:check + lint + stylelint + typecheck + build
npm run test         # Tests unitaires (Vitest)
npm run test:coverage
npm run lint
npm run lint:fix
npm run typecheck
```
