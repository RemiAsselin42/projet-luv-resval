# Projet Luv Resval

Expérience web interactive et immersive autour de l'univers de Luv Resval — 3D, animation, narration visuelle et identité sonore.

## Ce que c'est

Un site web pensé comme une expérience, pas comme une page classique. L'utilisateur entre dans un univers visuel et sonore inspiré de l'artiste Luv Resval : il scrolle, il clique, il joue. L'interface centrale est un écran CRT (un vieux moniteur rétro rendu en 3D) qui sert de tableau de bord pour naviguer entre les sections.

## Les sections

### Écran d'accueil — Hero

L'écran de chargement affiche une barre de progression pendant que les modèles 3D se téléchargent. Une fois prêt, un bouton PLAY apparaît. Le clic déclenche la musique et fait s'allumer l'écran CRT — l'interface principale du site.

L'écran CRT est un objet 3D interactif. Le survol ou le clic dessus permet de naviguer dans le menu. Chaque entrée du menu correspond à une section du site, avec un aperçu du personnage ou de l'objet associé affiché en temps réel dans l'écran.

### Les Reliques

Une galerie de quatre personnages tirés de l'univers de Luv Resval : Anakin, Batman, Cerbère et Link. Chaque personnage est affiché en 3D dans une mini-scène, avec une animation idle pour certains. On peut naviguer entre eux via un sélecteur visuel. Chaque fiche affiche des stats (Ego Trip, Spleen, Legacy, Charisma), un extrait de paroles et un ticker défilant.

### Section MPC

Un beatmaker interactif inspiré d'une vraie machine à rythmes. L'utilisateur peut :

- activer ou désactiver des boucles (kick, snare, hi-hat) en temps réel
- frapper des pads percussifs (open-hat, snare, kicks, tag AWA) au clic ou au clavier
- lancer la a cappella de Luv Resval
- régler le volume via un potard
- couper le son, arrêter la lecture, ou enregistrer sa session

Une visualisation de la forme d'onde audio s'affiche en temps réel. Chaque action sur le beatmaker est synchronisée avec l'écran CRT — qui réagit visuellement à la musique.

### Crash Outro

La conclusion de l'expérience. Une vidéo de Grünt (#45) apparaît dans l'écran CRT, puis un glitch progressif s'intensifie sur une vingtaine de secondes jusqu'au "crash" — un écran d'erreur 403 s'affiche. L'utilisateur peut ensuite relancer l'expérience depuis le début.

## L'écran CRT

C'est la pièce centrale du site. Il est rendu en 3D (via Three.js) avec un shader qui simule l'aspect d'un vieux moniteur : scanlines, vignette, aberration chromatique, bruit de grain. Son contenu change selon le contexte :

- menu de navigation entre les sections
- aperçu 3D du personnage ou de l'objet sélectionné
- vidéo (section crash outro)
- glitch et effets visuels

## La musique

Six pistes audio jouent en boucle de façon synchronisée depuis le début de l'expérience :

- une piste de fond (sample principal, toujours active)
- kick, snare, hi-hat (débloquables via le beatmaker)
- la a cappella de Luv Resval
- un "evil sample" secondaire (débloqué dans la section crash outro)
- la a cappella cursed (débloquée dans la section crash outro)

L'audioManager gère tout ça. Voici comment il fonctionne :

**Au démarrage**, toutes les pistes sont lancées en même temps pour rester synchronisées. Seule la piste de fond est audible — les autres sont silencieuses mais tournent en arrière-plan.

**Le déblocage** d'une piste (via les boutons du beatmaker, ou automatiquement selon la progression) la rend audible instantanément, sans décalage ni rupture de rythme — parce qu'elle tourne déjà depuis le début.

**Le volume global** (potard ou touche M) s'applique à toutes les pistes actives, sans toucher celles qui sont délibérément coupées.

**Le fade-in** : quand une piste se débloque progressivement (comme dans la section crash outro), elle monte en volume en douceur sur quelques secondes plutôt que d'arriver brutalement.

**Les effets sonores** (son de survol des liens) sont gérés séparément, avec un pool de 4 instances pour éviter les coupures en cas de clics rapides.

## Stack technique

- **Vite** + **TypeScript strict** — outillage et typage
- **Three.js** — rendu 3D (scène unique partagée sur tout le site)
- **GSAP** + **ScrollTrigger** + **Lenis** — animations et scroll fluide
- **SCSS** — styles modulaires
- **Howler.js** — gestion audio multi-couches
- **Vitest** — tests unitaires

## Architecture

```text
src/
├── main.ts                       ← point d'entrée, init scène + sections
├── core/
│   ├── scene.ts                  ← caméra, renderer, pixel ratio adaptatif
│   ├── lights.ts
│   ├── scrollManager.ts
│   ├── assetLoader.ts
│   ├── postprocessing.ts
│   ├── gpuCapabilities.ts
│   └── telemetry.ts
├── crt/
│   ├── crtShader.ts              ← shader GLSL + matériau CRT
│   ├── crtCanvasTexture.ts       ← texture canvas du CRT
│   ├── crtConfig.ts              ← paramètres de rendu (scanlines, vignette, etc.)
│   ├── crtFonts.ts               ← polices bitmap pour le CRT
│   ├── crtModelPreview.ts        ← aperçu 3D dans le CRT
│   ├── crtManager.ts             ← orchestrateur CRT
│   └── crtTypes.ts
├── loader/
│   └── loadingScreen.ts          ← barre de chargement + bouton PLAY + power-on
├── sections/
│   ├── definitions.ts            ← registre central des sections + IDs canoniques
│   ├── 01-hero/
│   │   ├── hero.ts               ← orchestrateur principal
│   │   ├── heroLoader.ts         ← contrôleur de chargement
│   │   ├── heroRaycaster.ts      ← hover/clic sur le mesh CRT
│   │   ├── heroAccessibility.ts  ← focus clavier + aria-labels dynamiques
│   │   ├── heroTimelines.ts      ← timelines GSAP/ScrollTrigger
│   │   └── heroFallback.ts       ← rendu HTML/CSS si WebGL absent
│   ├── 02-les-reliques/
│   ├── 03-oeil-big-brother/      ← section masquée (en cours de développement)
│   ├── 04-mpc/
│   │   ├── mpc.ts                ← orchestrateur MPC
│   │   ├── mpcDom.ts             ← construction du DOM et visualisation waveform
│   │   ├── mpcControls.ts        ← câblage de tous les contrôles interactifs
│   │   └── mpcCrtSync.ts         ← synchronisation MPC ↔ écran CRT
│   └── 05-crash-outro/
├── components/
│   └── 3d/
│       ├── glbLoader.ts          ← chargement GLB avec fallback Draco
│       ├── menuPreview3D.ts      ← mini-scène 3D du menu CRT
│       └── modelUtils.ts         ← utilitaires partagés pour les modèles 3D
├── audio/
│   ├── audioManager.ts           ← gestionnaire audio central (6 pistes + FX)
│   └── types.ts
└── utils/
    ├── dom.ts
    ├── math.ts
    └── publicUrl.ts
```

Les sections sont chargées dynamiquement via un registre (`sectionLoaders`) et un `sectionManager`. L'ordre narratif est défini dans `definitions.ts`. Une section peut être masquée (`hidden: true`) pour être exclue complètement du site sans être supprimée du code.

## Scripts

```bash
npm run dev             # Serveur de développement
npm run build           # Build de production
npm run preview         # Prévisualisation du build
npm run validate        # Pipeline complet : lf:check + lint + stylelint + typecheck + build

npm run test            # Tests unitaires (Vitest)
npm run test:coverage   # Rapport de couverture des tests
npm run lint            # Linting (ESLint + Stylelint)
npm run lint:fix        # Linting avec correction automatique
npm run typecheck       # Vérification des types TypeScript
```
