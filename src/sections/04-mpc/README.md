# Section 04 — MPC 3D (Beatmaker)

## Description

Interface de beatmaker interactive inspirée d'une MPC physique : 6 pads de percussion, 3 boutons de loops (KICK, SNARE, HI-HAT), un bouton Play/Stop pour la cappella, et une waveform temps réel sur écran intégré.

## Architecture

Tout le module est contenu dans `mpc.ts` et exporté via `initBeatmakerSection` (`SectionInitializer`).

| Fonction / Constante     | Rôle                                                                               |
|--------------------------|------------------------------------------------------------------------------------|
| `LOOP_BUTTONS`           | Mapping label → index de layer audio (KICK=1, SNARE=2, HI-HAT=3)                 |
| `PADS`                   | Définition des 6 pads (nom, catégorie, fichier audio)                             |
| `buildMpcDom()`          | Construit l'arbre HTML/CSS de la MPC et le retourne                               |
| `startWaveform(canvas)`  | Lance la visualisation oscilloscope temps réel ; retourne une fonction `stop()`   |
| `initBeatmakerSection`   | Point d'entrée `SectionInitializer` : branche tous les listeners, gère le dispose |

## Layers audio — mapping `MUSIC_TRACKS`

Les indices correspondent directement au tableau `MUSIC_TRACKS` de `audioManager.ts` :

| Index | Fichier                  | Contrôle MPC          |
|-------|--------------------------|-----------------------|
| 0     | `SAMPLE.wav`             | *(toujours actif)*    |
| 1     | `DRUMS-loop-kick.wav`    | Bouton loop KICK      |
| 2     | `DRUMS-loop-snare.wav`   | Bouton loop SNARE     |
| 3     | `DRUMS-loop-hihat.wav`   | Bouton loop HI-HAT    |
| 4     | `EVIL_SAMPLE.wav`        | *(autre section)*           |
| 5     | `ACAP-luv-resval.wav`    | Bouton PLAY/STOP      |

## Bouton Play/Stop (cappella)

Le bouton `.mpc-play-btn` (élément `<button>` natif, accessible clavier) contrôle la layer 5 (`ACAP-luv-resval.wav`) :

- **PLAY** → `audioManager.unlockMusicLayer(5)` ; classe `mpc-play-btn--active` ajoutée ; label devient `STOP`.
- **STOP** → `audioManager.lockMusicLayer(5)` ; classe retirée ; label revient à `PLAY`.
- `aria-label` mis à jour dynamiquement (`"Lecture"` / `"Arrêt"`).

```typescript
// Exemple interne (mpc.ts)
const ACAP_LAYER = 5;
audioManager.unlockMusicLayer(ACAP_LAYER); // démarre la cappella
audioManager.lockMusicLayer(ACAP_LAYER);   // coupe la cappella
```

## Boutons de loops

Les trois boutons `.mpc-loop-btn` (attribut `data-layer`) activent/désactivent chacun une stem en boucle via toggle :

```typescript
// Activation
audioManager.unlockMusicLayer(layer); // volume immédiat à MUSIC_LAYER_VOLUME
btn.classList.add('mpc-loop-btn--active');

// Désactivation
audioManager.lockMusicLayer(layer);   // volume immédiat à 0
btn.classList.remove('mpc-loop-btn--active');
```

## Pads (percussion)

6 pads définis dans `PADS`, chacun chargé via `Howl` (`volume: 0.9, pool: 2`) depuis `audio/pads/`.

### Mapping clavier

| Touche          | Pad         |
|-----------------|-------------|
| `U`             | PAD 4 — Open-Hat |
| `I`             | PAD 5 — Hi-Hat   |
| `O`             | PAD 6 — AWA Tag  |
| `J`             | PAD 1 — Snare    |
| `K`             | PAD 2 — Kick 1   |
| `L`             | PAD 3 — Kick 2   |
| `Numpad4/5/6`   | Row haut (PAD 4/5/6) |
| `Numpad1/2/3`   | Row bas  (PAD 1/2/3) |

Les répétitions clavier (`e.repeat`) sont ignorées.

## Waveform temps réel

`startWaveform(canvas)` branche un `AnalyserNode` sur `Howler.masterGain` (connexion parallèle, sans couper le routage existant) et anime un oscilloscope via `requestAnimationFrame`.

Paramètres configurables dans la fonction :

| Paramètre               | Valeur par défaut | Effet                                 |
|-------------------------|-------------------|---------------------------------------|
| `fftSize`               | `2048`            | 1024 bins — waveform fine             |
| `smoothingTimeConstant` | `0.82`            | Lissage temporel (0 = réactif)        |
| Couleur gradient        | `rgba(161,84,242)`| Violet MPC                            |

La fonction retourne `stop()` à appeler dans `dispose()` pour nettoyer le RAF et déconnecter l'analyser.

## Scale responsive

Un `ResizeObserver` sur `sectionElement` recalcule la variable CSS `--mpc-scale` à chaque redimensionnement :

```typescript
const MPC_NATURAL_W = 388; // largeur de référence (px)
const MPC_NATURAL_H = 356; // hauteur de référence (px)
const scale = Math.min(availW / MPC_NATURAL_W, availH / MPC_NATURAL_H, 1.8);
```

Le `transform: scale()` est appliqué en CSS via `var(--mpc-scale)` (rendu plus net qu'un calcul JS direct).

## Dispose

`dispose()` effectue dans l'ordre :
1. `stopWaveform()` — annule le RAF et déconnecte l'analyser.
2. `ro.disconnect()` — débranche le `ResizeObserver`.
3. Supprime tous les listeners (loops, play, pads, clavier).
4. `padSounds.forEach(s => s.unload())` — libère les Howl pads.
5. `mpcRoot.remove()` — retire le DOM.
6. `delete sectionElement.dataset.state` — remet la section à l'état initial.

## Variables SCSS utilisées

Définies dans `src/styles/_variables.scss` (section MPC) :

| Variable              | Valeur     | Usage                        |
|-----------------------|------------|------------------------------|
| `$mpc-purple`         | `#a154f2`  | Waveform, indicateurs actifs |
| `$mpc-purple-dim`     | `#9456d6`  | États hover                  |
| `$mpc-purple-dark`    | `#3c1f70`  | Fond foncé MPC               |
| `$mpc-border-radius`  | `2px`      | Coins éléments standard      |
| `$mpc-border-radius-lg` | `4px`    | Coins boutons (Play, etc.)   |
