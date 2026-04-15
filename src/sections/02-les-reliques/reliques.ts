// Section "Les Reliques" — interface personnage dans la TV CRT.
// L'intégralité du rendu visible se passe dans l'écran CRT :
//   - couche 2D : titre, sélecteur 2×2, nom et jauges de stats (reliquesCrtView)
//   - couche 3D : modèle du personnage en rotation dans un render target (reliquesPreview3D)
// La section DOM sert uniquement au scroll, au lifecycle et à l'accessibilité.

import * as THREE from 'three';
import gsap from 'gsap';
import type { SectionInitializer } from '../types';
import { getSectionSelector, SECTION_IDS } from '../definitions';
import { RELIQUES_CHARACTERS } from './reliquesData';
import { createReliquesPreview3D, type ReliquesPreview3D } from './reliquesPreview3D';
import { createReliquesCrtView, CELL_HALF_U, CELL_HALF_V } from './reliquesCrtView';

// ── Constantes ─────────────────────────────────────────────────────────────────

// Durée d'animation des jauges de stats lors d'un changement de personnage
const STATS_ANIM_DURATION = 0.6;

// ── Raycaster : UV → index de cellule ────────────────────────────────────────

/**
 * Applique la même distortion barrel que le shader CRT (strength 0.8).
 * Le raycaster retourne l'UV mesh (espace plat) ; le shader l'applique pour
 * obtenir l'UV de sampling de la texture canvas. On doit faire pareil avant
 * tout hit-test pour comparer dans le même espace de coordonnées.
 */
const applyBarrelDistortion = (uv: THREE.Vector2, strength: number): THREE.Vector2 => {
  const cx = uv.x - 0.5;
  const cy = uv.y - 0.5;
  const r2 = cx * cx + cy * cy;
  const d = 1.0 + r2 * strength;
  return new THREE.Vector2(cx * d + 0.5, cy * d + 0.5);
};

/** Retourne l'index de la cellule cliquée (0-3) ou -1 si aucun hit. */
const getCellIndexFromUV = (
  uv: THREE.Vector2,
  cellUVs: Array<{ u: number; v: number }>,
  cellHalfW: number,
  cellHalfH: number,
): number => {
  for (let i = 0; i < cellUVs.length; i++) {
    const c = cellUVs[i]!;
    if (
      Math.abs(uv.x - c.u) <= cellHalfW &&
      Math.abs(uv.y - c.v) <= cellHalfH
    ) {
      return i;
    }
  }
  return -1;
};

// ── Section initializer ───────────────────────────────────────────────────────

const initReliquesSection: SectionInitializer = (context) => {
  const { camera, renderer, crtManager, scrollManager } = context;
  const sectionElement = document.querySelector(
    getSectionSelector(SECTION_IDS.RELIQUES),
  );

  if (!(sectionElement instanceof HTMLElement)) {
    return { update: () => {}, dispose: () => {} };
  }

  // ── Modules ────────────────────────────────────────────────────────────────
  // L'instance est créée et préchargée pendant le loading screen (via loadingScreen.ts)
  // pour que fitModel() et la construction Three.js soient faits avant l'arrivée ici.
  const preview3DFromExtras = context.extras?.reliquesPreview3D as ReliquesPreview3D | undefined;
  if (!preview3DFromExtras) {
    // eslint-disable-next-line no-console
    console.warn(
      '[Reliques] reliquesPreview3D absent de context.extras — création en fallback (modèles non préchargés).',
    );
  }
  const preview3D: ReliquesPreview3D =
    preview3DFromExtras ?? createReliquesPreview3D(renderer, RELIQUES_CHARACTERS);
  const crtView = createReliquesCrtView(RELIQUES_CHARACTERS.map((c) => c.iconUrl));

  // ── État ───────────────────────────────────────────────────────────────────
  let selectedIndex = 0;
  const statsProxy = { progress: 0 };
  let statsAnim: gsap.core.Tween | null = null;
  let fadeAnim: gsap.core.Tween | null = null;
  let isInViewport = false;

  // ── Sélection d'un personnage ──────────────────────────────────────────────

  const selectCharacter = (index: number): void => {
    // La garde getOpacity() > 0 permet de rejouer la sélection du personnage courant
    // si la scène 3D n'est pas encore visible (ex. : premier affichage ou retry après échec).
    // Sans elle, re-sélectionner le même index serait ignoré et le modèle ne s'afficherait pas.
    if (index === selectedIndex && preview3D.getOpacity() > 0) return;
    selectedIndex = index;

    // Redémarrer l'animation des jauges
    statsAnim?.kill();
    statsProxy.progress = 0;
    statsAnim = gsap.to(statsProxy, {
      progress: 1,
      duration: STATS_ANIM_DURATION,
      ease: 'power2.out',
      delay: 0.2,
    });

    const character = RELIQUES_CHARACTERS[selectedIndex];
    if (character) {
      preview3D.loadCharacter(character);
    }
  };

  // ── Raycaster (clic + hover souris sur le CRT) ───────────────────────────

  const raycaster = new THREE.Raycaster();
  const mouseNDC = new THREE.Vector2();

  // Demi-dimensions d'une cellule en UV canvas — importées depuis reliquesCrtView
  // pour rester synchronisées avec CELL_W=200, CELL_H=105, CANVAS_W=1024, CANVAS_H=576.
  const cellHalfU = CELL_HALF_U;
  const cellHalfV = CELL_HALF_V;

  // Barrel distortion strength identique au shader
  const BARREL_STRENGTH = 0.8;

  /**
   * Calcule l'index de cellule sous le curseur à partir d'un MouseEvent.
   * Applique la barrel distortion pour convertir mesh UV → canvas UV avant le test.
   * Retourne -1 si hors CRT ou hors cellules.
   */
  const hitCellIndex = (e: MouseEvent): number => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouseNDC, camera);

    const hits = raycaster.intersectObject(crtManager.mesh);
    if (hits.length === 0 || !hits[0]?.uv) return -1;

    // Convertir mesh UV → canvas UV via la même barrel distortion que le shader
    const distortedUV = applyBarrelDistortion(hits[0].uv, BARREL_STRENGTH);
    // Hors de l'écran visible (zone noire)
    if (distortedUV.x < 0 || distortedUV.x > 1 || distortedUV.y < 0 || distortedUV.y > 1) return -1;

    return getCellIndexFromUV(distortedUV, crtView.getCellUVs(), cellHalfU, cellHalfV);
  };

  const onClick = (e: MouseEvent): void => {
    const idx = hitCellIndex(e);
    if (idx !== -1) selectCharacter(idx);
  };

  let cursorIsPointer = false;
  const onMouseMove = (e: MouseEvent): void => {
    const overCell = hitCellIndex(e) !== -1;
    if (overCell !== cursorIsPointer) {
      document.body.style.cursor = overCell ? 'pointer' : '';
      cursorIsPointer = overCell;
    }
  };

  // ── Navigation clavier ────────────────────────────────────────────────────
  // Grille 2×2 :  0 | 1
  //               2 | 3

  const onKeyDown = (e: KeyboardEvent): void => {
    const col = selectedIndex % 2;
    const row = Math.floor(selectedIndex / 2);

    switch (e.key) {
      case 'ArrowRight':
        if (col < 1) selectCharacter(selectedIndex + 1);
        break;
      case 'ArrowLeft':
        if (col > 0) selectCharacter(selectedIndex - 1);
        break;
      case 'ArrowDown':
        if (row < 1) selectCharacter(selectedIndex + 2);
        break;
      case 'ArrowUp':
        if (row > 0) selectCharacter(selectedIndex - 2);
        break;
    }
  };

  // ── Helpers : activation / désactivation des listeners ────────────────────
  // Les listeners ne sont actifs que quand la section est dans le viewport,
  // évitant les raycasts et calculs inutiles sur toutes les autres sections.

  const attachListeners = (): void => {
    document.addEventListener('click', onClick);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('keydown', onKeyDown);
  };

  const detachListeners = (): void => {
    document.removeEventListener('click', onClick);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('keydown', onKeyDown);
    // Nettoyer le curseur pointer résiduel
    if (cursorIsPointer) {
      document.body.style.cursor = '';
      cursorIsPointer = false;
    }
  };

  // ── Scroll trigger : activation / désactivation ───────────────────────────

  const scrollTrigger = scrollManager.createTrigger({
    trigger: sectionElement,
    start: 'top 80%',
    end: 'bottom top',
    onEnter: () => {
      isInViewport = true;
      attachListeners();
      crtManager.resetEffects();
      crtManager.setModelColorMode(1);
      crtManager.setFade(1);
      crtManager.startCrossfade(crtManager.getHeroCanvasTexture());
      crtManager.setContentTexture(crtView.getTexture());
      selectCharacter(selectedIndex);
      fadeAnim?.kill();
      const proxy = { v: 0 };
      fadeAnim = gsap.to(proxy, {
        v: 1, duration: 0.8, ease: 'power2.inOut',
        onUpdate: () => crtManager.setCrossfade(proxy.v),
        onComplete: () => { crtManager.setCrossfade(1); },
      });
    },
    onLeaveBack: () => {
      isInViewport = false;
      detachListeners();
      crtManager.setModelPreview(null, 0);
      crtManager.setModelColorMode(0);
      // Crossfade reliques → menu (canvas figé sur le dernier frame, 0.8s)
      fadeAnim?.kill();
      crtManager.startCrossfade(crtView.getTexture());
      crtManager.setContentTexture(crtManager.getHeroCanvasTexture());
      const proxy = { v: 0 };
      fadeAnim = gsap.to(proxy, {
        v: 1, duration: 0.8, ease: 'power2.inOut',
        onUpdate: () => crtManager.setCrossfade(proxy.v),
        onComplete: () => { crtManager.setCrossfade(1); },
      });
    },
    onEnterBack: () => {
      isInViewport = true;
      attachListeners();
      crtManager.setBlur(0);
      crtManager.setModelColorMode(1);
      crtManager.setFade(0);
      crtManager.setContentTexture(crtView.getTexture());
      selectCharacter(selectedIndex);
      fadeAnim?.kill();
      const proxy = { v: 0 };
      fadeAnim = gsap.to(proxy, {
        v: 1, duration: 0.8, ease: 'power2.inOut',
        onUpdate: () => crtManager.setFade(proxy.v),
      });
    },
    onLeave: () => {
      isInViewport = false;
      detachListeners();
      crtManager.setModelColorMode(0);
    },
  });

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  return {
    update: (deltaSeconds: number) => {
      if (!isInViewport) return;

      // Rotation du modèle
      preview3D.update(deltaSeconds);

      // Rendu dans le render target AVANT le rendu principal
      preview3D.renderPreview();

      // Injection de la preview 3D dans le shader CRT
      crtManager.setModelPreview(
        preview3D.getTexture(),
        preview3D.getOpacity(),
        preview3D.getTexelSize(),
      );

      // Redessiner la couche 2D
      crtView.draw({
        characters: RELIQUES_CHARACTERS,
        selectedIndex,
        statsProgress: statsProxy.progress,
        isLoading: preview3D.isLoading(),
        hasFailed: preview3D.hasFailed(),
        deltaSeconds,
      });
    },

    dispose: () => {
      statsAnim?.kill();
      fadeAnim?.kill();
      scrollTrigger.kill();
      detachListeners();
      // Nettoyer le CRT avant de partir
      crtManager.setModelPreview(null, 0);
      crtManager.setContentTexture(crtManager.getHeroCanvasTexture());
      preview3D.dispose();
      crtView.dispose();
    },
  };
};

export default initReliquesSection;
