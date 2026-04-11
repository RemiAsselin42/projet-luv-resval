# Section 01 — Hero (L'Amorce)

## Description

Écran d'introduction CRT rétro : static visuel/sonore, barre de chargement animée, titre glitch "Luv Resval" + sous-titre "Grunt #45", bouton PLAY interactif et menu de navigation CRT.

Fallback HTML/CSS automatique si WebGL est absent.

## Architecture des sous-modules

`hero.ts` est l'orchestrateur principal. La logique est répartie dans cinq sous-modules spécialisés :

| Fichier                 | Responsabilité                                                                 |
|-------------------------|--------------------------------------------------------------------------------|
| `heroLoader.ts`         | Contrôleur de chargement : animation power-on, barre de progression, bouton PLAY, déverrouillage scroll |
| `heroRaycaster.ts`      | Détection hover/clic sur le mesh CRT via `THREE.Raycaster`                     |
| `heroAccessibility.ts`  | Menu `<nav>` accessible : boutons Tab-navigables, focus visible, attributs ARIA |
| `heroTimelines.ts`      | Timelines GSAP/ScrollTrigger : déplacement CRT au scroll, fondu TV             |
| `heroFallback.ts`       | Rendu HTML/CSS de secours pour les navigateurs sans WebGL                      |
| `crtConfig.ts`          | Constantes partagées : `PLANE_HEIGHT`, `PLAY_BUTTON_PULSE_*`, menu layout      |
| `crtShader.ts`          | Matériau ShaderMaterial + uniforms CRT                                         |
| `crtCanvasTexture.ts`   | Dessin canvas de la texture CRT (titre, barre loader, menu)                    |
| `crtFonts.ts`           | Chargement et vérification des polices personnalisées                          |
| `crtModelPreview.ts`    | Prévisualisation du modèle 3D dans la texture CRT                              |

## API publique de `heroLoader.ts`

### `computeLoadingProgress(elapsedSeconds: number): number`

Calcule la progression de la barre de chargement (0..1) pour un temps écoulé donné.

Courbe multi-segment avec accélération variable pour imiter un vrai chargement :

- `0 – 0.6 s` : 0 → 18 % (`easeOutCubic`)
- `0.6 – 1.45 s` : 18 → 47 % (`easeInOutSine`)
- `1.45 – 2.3 s` : 47 → 76 % (`easeOutQuad`)
- `2.3 – 3.05 s` : 76 → 93 % (`easeInOutQuad`)
- `3.05 – 3.8 s` : 93 → 100 % (`easeOutExpo`)

**Paramètres** : `elapsedSeconds` — temps écoulé depuis le démarrage du loader (secondes, ≥ 0).
**Retourne** : progression normalisée `[0, 1]`.

### `createLoadingController(crt, scrollManager): LoadingController`

Crée le contrôleur de chargement complet.

**Paramètres** :
- `crt` : objet avec `setPowerOn(v: number)` — contrôle l'intensité d'allumage CRT.
- `scrollManager` : objet avec `stop()` et `start()` — bloque/débloque le scroll pendant le chargement.

**Retourne** `LoadingController` :

| Méthode               | Description                                                                    |
|-----------------------|--------------------------------------------------------------------------------|
| `getLoadingProgress()` | Progression courante `[0, 2]` : `[0,1]` = barre ; `[1,2]` = transition fondu |
| `isStillLoading()`    | `true` pendant toute la phase loader                                           |
| `isBarComplete()`     | `true` quand la barre atteint 100 % (bouton PLAY visible)                     |
| `triggerPlay()`       | Déclenche la transition loader → hero (clic PLAY)                             |
| `dispose()`           | Nettoie les listeners et débloque le scroll si nécessaire                     |

**Comportement** :
- Le scroll est bloqué dès la création du contrôleur.
- Un clic n'importe où pendant l'animation de barre l'accélère via GSAP (`skipBar`).
- Une fois la barre complète, seul le clic sur le bouton PLAY déclenche la transition.
- `getLoadingProgress()` retourne `> 1` pendant la transition croisée (`LOADER_TRANSITION_SECONDS = 0.6 s`).

### Constantes exportées

```typescript
LOADER_TOTAL_DURATION_SECONDS  // 3.8 — durée totale de la barre
LOADER_TRANSITION_SECONDS      // 0.6 — durée du fondu croisé après PLAY
LOADER_HOLD_SECONDS            // 2.0 — @deprecated, référence de conception uniquement
```

## API publique de `heroRaycaster.ts`

### `createHeroRaycaster(camera, renderer, crtMesh, menuElement): HeroRaycaster`

**Retourne** `HeroRaycaster` :

| Méthode                                          | Description                                                                 |
|--------------------------------------------------|-----------------------------------------------------------------------------|
| `getHoverMenuIndexFromPointer(x, y, opacity)`    | Index du menu survolé (-1 si aucun), calculé via UV du mesh CRT             |
| `isClickOnCrt(x, y)`                             | `true` si le clic touche le mesh CRT                                        |
| `getClickUV(x, y)`                               | Coordonnées UV du clic sur le CRT (`THREE.Vector2`), ou `null`             |
| `isAtMenuSection()`                              | `true` si l'élément menu est dans le viewport (marge 20 %)                 |

## API publique de `heroAccessibility.ts`

### `createAccessibilityMenu(onItemClick, onHoverChange): AccessibilityMenu`

Crée un `<nav aria-label="Menu de navigation CRT">` avec des `<button>` invisibles superposés au menu CRT pour la navigation clavier.

**Retourne** `AccessibilityMenu` :

| Méthode / Propriété                              | Description                                                      |
|--------------------------------------------------|------------------------------------------------------------------|
| `container`                                      | Élément `<nav>` injecté dans `document.body`                     |
| `buttons`                                        | Tableau des `<button>` par item de menu                          |
| `updateVisibility(menuOpacity, isAtMenu)`        | Affiche/masque les boutons selon l'opacité et la position scroll |
| `dispose()`                                      | Supprime le `<nav>` du DOM                                       |

## API publique de `heroTimelines.ts`

### `createHeroScrollTimelines(heroEl, menuEl, faceVaderEl, crt): HeroScrollTimelines`

Crée deux timelines GSAP pilotées par le scroll :

1. **`heroTimeline`** : déplace le mesh CRT de `z=0` à `z=-2.5` pendant le scroll de la section hero vers le menu.
2. **`faceVaderFadeTimeline`** : réduit l'opacité du CRT à 0 lors de l'approche de la section suivante.

## Utilitaire `dom.ts`

### `querySectionElement(sectionId: string): HTMLElement | null`

Requête DOM sur l'attribut `data-section`.

```typescript
import { querySectionElement } from '../../utils/dom';

const heroEl = querySectionElement('hero');
// équivaut à document.querySelector('[data-section="hero"]')
```

### `getSectionDataSelector(sectionId: string): string`

Retourne le sélecteur CSS correspondant.

```typescript
getSectionDataSelector('hero') // → '[data-section="hero"]'
```

## `SECTION_IDS` — identifiants canoniques

Définis dans `src/sections/definitions.ts` :

```typescript
// Noms canoniques (à utiliser dans tout nouveau code)
SECTION_IDS.HERO           // 'hero'
SECTION_IDS.HUB_CENTRAL    // 'hub-central'
SECTION_IDS.RELIQUES       // 'reliques'
SECTION_IDS.BIG_BROTHER    // 'oeil-big-brother'
SECTION_IDS.MPC            // 'mpc'
SECTION_IDS.CRASH_OUTRO    // 'crash-outro'
```

Les aliases (`MENU`, `FACE_VADER`, `MPC_3D`, etc.) sont conservés pour la rétrocompatibilité mais marqués `@deprecated`.

## Constantes CRT centralisées (`crtConfig.ts`)

| Constante / Groupe           | Description                                                       |
|------------------------------|-------------------------------------------------------------------|
| `CRT_MENU_CONFIG.PLANE_HEIGHT` | Hauteur du mesh CRT en unités world (`3.5`)                     |
| `PLAY_BUTTON_PULSE_BASE`     | Opacité de base du bouton PLAY (`0.72`)                          |
| `PLAY_BUTTON_PULSE_AMP`      | Amplitude de l'oscillation (`0.28`)                              |
| `PLAY_BUTTON_PULSE_PERIOD_MS`| Période de pulsation en ms (`380`)                               |
| `BASELINE_VIEWPORT_HEIGHT`   | Hauteur viewport de référence pour le timing scroll (`1080`)     |
| `RESPONSIVE_BREAKPOINTS`     | Points de rupture responsive : MOBILE (480), TABLET_SM (768), TABLET_MD (1024), DESKTOP (1025) |
| `getPlayButtonUVBounds()`    | Calcule la zone de clic UV du bouton PLAY sur le mesh CRT        |

## Tests

Tous les sous-modules disposent d'une suite de tests dédiée :

```text
heroLoader.ts          → heroFallback.test.ts (computeLoadingProgress, createLoadingController)
heroRaycaster.ts       → heroRaycaster.test.ts
heroAccessibility.ts   → heroAccessibility.test.ts
heroTimelines.ts       → heroTimelines.test.ts
crtConfig.ts           → crtConfig.test.ts
crtCanvasTexture.ts    → crtCanvasTexture.test.ts
crtFonts.ts            → crtFonts.test.ts
crtModelPreview.ts     → crtModelPreview.test.ts
crtShader.ts           → crtShader.test.ts
hero.ts (orchestrateur) → hero.test.ts
```

Lancer les tests :

```bash
npm run test
npm run test:coverage
```

## Troubleshooting

**Le loader ne démarre pas** : vérifier que `scrollManager.stop()` ne lève pas d'exception avant l'animation power-on.

**Le menu CRT n'est pas navigable au clavier** : `updateVisibility` doit être appelée avec `menuOpacity > 0.3` et `isAtMenu = true`. Vérifier `isAtMenuSection()` dans `heroRaycaster.ts`.

**Mauvaise détection du clic PLAY** : les bornes UV du bouton sont calculées dynamiquement par `getPlayButtonUVBounds()`. Si le layout du panel loader change (`PANEL_Y_RATIO`, `PANEL_HEIGHT_RATIO`), mettre à jour les tests dans `crtConfig.test.ts`.

**WebGL absent** : `heroFallback.ts` prend le relais automatiquement et affiche le titre "LUV RESVAL" avec une animation scroll basique.
