import * as THREE from 'three';
import { CRT_MENU_CONFIG, getCrtMenuStartY } from './crtConfig';

export interface HeroRaycaster {
  /** Retourne l'index du menu survolé (-1 si aucun). */
  getHoverMenuIndexFromPointer: (clientX: number, clientY: number, menuOpacity: number) => number;
  /** Vérifie si un clic touche le mesh CRT. */
  isClickOnCrt: (clientX: number, clientY: number) => boolean;
  /** Retourne les coordonnées UV du clic sur le CRT (null si pas de hit). */
  getClickUV: (clientX: number, clientY: number) => THREE.Vector2 | null;
  /** Indique si le scroll a atteint la section menu. */
  isAtMenuSection: () => boolean;
}

export const createHeroRaycaster = (
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer,
  crtMesh: THREE.Mesh,
  menuElement: Element | null,
): HeroRaycaster => {
  const raycaster = new THREE.Raycaster();
  const mouseNDC = new THREE.Vector2();

  const updateNDC = (clientX: number, clientY: number): void => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouseNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouseNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouseNDC, camera);
  };

  return {
    getHoverMenuIndexFromPointer: (clientX, clientY, menuOpacity) => {
      updateNDC(clientX, clientY);
      const hits = raycaster.intersectObject(crtMesh);

      if (hits.length === 0 || !hits[0]?.uv) {
        return -1;
      }

      // UV.y=0 en bas, UV.y=1 en haut -> canvas Y inverse
      const canvasRelY = 1 - hits[0].uv.y;
      // Reproduit exactement la même logique verticale que le draw canvas.
      const menuStartY = getCrtMenuStartY(menuOpacity);
      const relativeY = canvasRelY - menuStartY;
      const idx = Math.floor(relativeY / CRT_MENU_CONFIG.LINE_HEIGHT);

      return idx >= 0 && idx < CRT_MENU_CONFIG.MENU_COUNT ? idx : -1;
    },

    isClickOnCrt: (clientX, clientY) => {
      updateNDC(clientX, clientY);
      return raycaster.intersectObject(crtMesh).length > 0;
    },

    getClickUV: (clientX, clientY) => {
      updateNDC(clientX, clientY);
      const hits = raycaster.intersectObject(crtMesh);
      if (hits.length === 0 || !hits[0]?.uv) return null;
      return hits[0].uv.clone();
    },

    isAtMenuSection: () => {
      if (!(menuElement instanceof HTMLElement)) return false;
      const rect = menuElement.getBoundingClientRect();
      const viewportHeight = Math.max(window.innerHeight, 1);
      // Élément visible si son bord supérieur est dans le bas de l'écran (20 % de marge)
      // ou si son bord inférieur n'a pas encore dépassé le haut de l'écran.
      return rect.top <= viewportHeight * 1.2 && rect.bottom > 0;
    },
  };
};
