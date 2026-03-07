import { createGlbModelComponent } from '../../components/3d/glbModel';
import { createModelRotationController } from '../../controllers/modelRotationController';
import type { SectionInitializer } from '../types';
import vaderHelmetUrl from '../../3d-models/darth_vader_helmet.glb?url';

const VADER_SECTION_SELECTOR = '[data-section="face-vader"]';

/**
 * Rotation Y de départ : un quart de tour vers la droite (profil droit visible).
 * À progress=1 le casque fait face à l'utilisateur (rotationY=0).
 */
const START_ROTATION_Y = -Math.PI / 2;

/**
 * Calcule un facteur de progression (0→1→0) basé sur la position de la section
 * dans le viewport. Entrée progressive en bas, plateau au centre, sortie en haut.
 *
 * Le fade couvre 30 % de la hauteur du viewport à l'entrée et à la sortie.
 */
const computeSectionProgress = (element: HTMLElement): number => {
  const rect = element.getBoundingClientRect();
  const viewportHeight = window.innerHeight;

  if (rect.bottom <= 0 || rect.top >= viewportHeight) {
    return 0;
  }

  const fadeZone = viewportHeight * 0.3;

  const fadeIn = Math.min((viewportHeight - rect.top) / fadeZone, 1);
  const fadeOut = Math.min(rect.bottom / fadeZone, 1);

  return Math.min(fadeIn, fadeOut);
};

const initFaceVaderSection: SectionInitializer = (context) => {
  const { scene, scrollManager } = context;
  const sectionElement = document.querySelector<HTMLElement>(VADER_SECTION_SELECTOR);

  // rotationY = 0 : le modèle natif fait déjà face à la caméra.
  // La rotation animée est gérée par le controller ci-dessous.
  const modelComponent = createGlbModelComponent(scene, vaderHelmetUrl, {
    targetDimension: 2,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    positionY: 0,
  });

  let rotationController: ReturnType<typeof createModelRotationController> | null = null;

  void modelComponent.loaded.then(() => {
    if (sectionElement) {
      // Base Y = START_ROTATION_Y (profil droit), pivotera vers 0 avec le scroll
      rotationController = createModelRotationController(
        sectionElement,
        modelComponent.modelGroup,
        {
          base: { x: 0, y: START_ROTATION_Y, z: 0 },
          hoverRangeX: 0.12,
          hoverRangeY: 0.15,
          hoverRangeZ: 0.05,
          lerpSpeed: 0.04,
        },
      );

      applyScrollProgress();
    }
  });

  const applyScrollProgress = (): void => {
    if (!sectionElement) return;

    const progress = computeSectionProgress(sectionElement);

    // --- Opacité ---
    modelComponent.setOpacity(progress);

    // --- Scale : 0.85 → 1.0 (appliqué sur le groupe centré, pas de dérive) ---
    modelComponent.setScale(0.85 + 0.15 * progress);

    // --- Rotation Y : profil droit (-π/2) → face (0) ---
    if (rotationController) {
      const rotY = START_ROTATION_Y * (1 - progress);
      rotationController.setBaseRotation('y', rotY);
    }
  };

  const unsubscribe = scrollManager.subscribe(() => {
    applyScrollProgress();
  });

  if (sectionElement) {
    sectionElement.dataset.state = 'active-3d';
  }

  return {
    update: () => {
      rotationController?.update();
    },
    dispose: () => {
      unsubscribe();
      rotationController?.dispose();
      modelComponent.dispose();

      if (sectionElement) {
        delete sectionElement.dataset.state;
      }
    },
  };
};

export default initFaceVaderSection;
