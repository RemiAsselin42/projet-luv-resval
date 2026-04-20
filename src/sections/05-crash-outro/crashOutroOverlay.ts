// Boutons HTML accessibles de l'écran d'erreur 403 (fin de la section Crash Outro).
// Les boutons [RESTART] et [SEE MORE] sont des éléments HTML vrais superposés
// au canvas CRT, positionnés mathématiquement pour correspondre exactement
// à leur rendu visuel (en tenant compte de la déformation de l'écran bombé).

import * as THREE from 'three';
import type { ScrollManager } from '../../core/scrollManager';
import type { BtnLayout } from './crashOutro403Canvas';
import { SECTION_IDS } from '../definitions';

const YOUTUBE_URL = 'https://youtu.be/G02QEhmleYA';

// Synchronisé avec crtShaders.ts : barrelDistortion(vUv, 0.8)
const BARREL_STRENGTH = 0.8;

/**
 * Inverse de la barrel distortion du shader GLSL.
 * Le shader fait : uv_sampled = barrelDistortion(vUv)
 * Pour afficher le pixel canvas (cx, cy), le GPU cherche le vUv tel que
 * barrelDistortion(vUv) == (cx, cy). C'est ce vUv (= UV du mesh) qu'on veut.
 * Résout via Newton-Raphson : convergence garantie en < 10 itérations.
 */
const invBarrelDistortion = (cx: number, cy: number): { x: number; y: number } => {
  const cy_c = cy - 0.5;
  const cx_c = cx - 0.5;
  // Cas dégénéré : centre exact
  if (cy_c === 0 && cx_c === 0) return { x: 0.5, y: 0.5 };
  // Résout en 1D en préservant la direction (k = cx_c / cy_c)
  if (cy_c === 0) {
    let vx = cx_c;
    for (let i = 0; i < 10; i++) {
      const f = vx * (1 + vx * vx * BARREL_STRENGTH) - cx_c;
      const df = 1 + 3 * vx * vx * BARREL_STRENGTH;
      vx -= f / df;
    }
    return { x: vx + 0.5, y: 0.5 };
  }
  const k = cx_c / cy_c;
  const factor = (k * k + 1) * BARREL_STRENGTH;
  let vy = cy_c;
  for (let i = 0; i < 10; i++) {
    const f = vy + factor * vy * vy * vy - cy_c;
    const df = 1 + 3 * factor * vy * vy;
    vy -= f / df;
  }
  return { x: k * vy + 0.5, y: vy + 0.5 };
};

/**
 * Projette une position UV distordue (0-1) sur le mesh CRT en coordonnées CSS viewport (px).
 * Tient compte de la scale réelle du mesh et de la projection caméra Three.js,
 * ce qui garantit l'alignement quel que soit le ratio d'aspect ou la taille d'écran.
 *
 * UV Three.js d'un PlaneGeometry : (0,0) = coin bas-gauche, (1,1) = coin haut-droit.
 * On convertit le ratio distordu en position locale (centrée sur 0), puis on projette
 * en NDC via la caméra pour obtenir les coordonnées CSS finales.
 */
const uvToViewportPx = (
  distortedX: number,
  distortedY: number,
  mesh: THREE.Mesh,
  camera: THREE.Camera,
): { x: number; y: number } => {
  const geo = mesh.geometry as THREE.BufferGeometry;
  const pos = geo.attributes['position'];
  if (!pos) return { x: 0, y: 0 };

  // Dimensions du plan en espace local (avant scale)
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    if (v.x < minX) minX = v.x;
    if (v.x > maxX) maxX = v.x;
    if (v.y < minY) minY = v.y;
    if (v.y > maxY) maxY = v.y;
  }

  // UV (0-1) → position locale : UV.x=0 → minX, UV.x=1 → maxX
  // UV.y=0 → minY (bas en Three.js), UV.y=1 → maxY (haut)
  const localX = minX + distortedX * (maxX - minX);
  const localY = minY + distortedY * (maxY - minY);

  // Espace local → world space (applique scale + position du mesh)
  const worldPos = new THREE.Vector3(localX, localY, 0).applyMatrix4(mesh.matrixWorld);

  // World space → NDC [-1, 1]
  const ndc = worldPos.clone().project(camera);

  // NDC → CSS viewport px
  return {
    x: (ndc.x * 0.5 + 0.5) * window.innerWidth,
    y: (1 - (ndc.y * 0.5 + 0.5)) * window.innerHeight,
  };
};

export interface CrashOutroOverlay {
  show: () => void;
  hide: () => void;
  reposition: () => void;
  dispose: () => void;
}

/**
 * Crée les boutons [RESTART] et [SEE MORE] comme éléments HTML accessibles
 * positionnés derrière le canvas Three.js (z-index inférieur).
 * L'apparence visuelle est rendue sur le canvas 403 (crashOutro403Canvas.ts).
 *
 * btnLayout  : source unique de vérité pour les positions (issues du canvas).
 * onHoverChange : met à jour le canvas quand la souris survole un bouton.
 */
export const createCrashOutroOverlay = (
  scrollManager: ScrollManager,
  onHoverChange: (which: 'restart' | 'see-more' | null) => void,
  btnLayout: BtnLayout,
  mesh: THREE.Mesh,
  camera: THREE.Camera,
  onRestart?: () => void,
  onHoverEnter?: () => void,
): CrashOutroOverlay => {
  const container = document.createElement('div');
  container.className = 'crash-outro-overlay';

  const positionBtn = (btn: HTMLButtonElement, xRatio: number) => {
    // yRatio est "depuis le haut" du canvas 2D.
    // CanvasTexture a flipY=true : UV mesh vUv.y=0 → bas du canvas, vUv.y=1 → haut.
    // Donc l'UV canvas en coordonnées UV mesh = (xRatio, 1 - yRatio).
    // Le shader fait barrelDistortion(vUv) pour sampler → on veut le vUv inverse.
    const uvMesh = invBarrelDistortion(xRatio, 1 - btnLayout.yRatio);
    // Projection Three.js : UV mesh → pixels viewport (tient compte de la scale du mesh)
    const px = uvToViewportPx(uvMesh.x, uvMesh.y, mesh, camera);

    btn.style.position = 'fixed';
    btn.style.left = `${px.x}px`;
    btn.style.top = `${px.y}px`;
    btn.style.transform = 'translate(-50%, -50%)';
  };

  const makeBtn = (
    label: string,
    xRatio: number,
    hoverKey: 'restart' | 'see-more',
    onClick: () => void,
  ): HTMLButtonElement => {
    const btn = document.createElement('button');
    btn.className = 'crash-outro-overlay__btn';
    btn.textContent = label;
    btn.tabIndex = -1;
    positionBtn(btn, xRatio);
    btn.addEventListener('click', onClick);
    btn.addEventListener('mouseenter', () => { onHoverChange(hoverKey); onHoverEnter?.(); });
    btn.addEventListener('mouseleave', () => onHoverChange(null));
    btn.addEventListener('focus', () => {
      onHoverChange(hoverKey);
      btn.style.outline = '0px solid rgba(255, 255, 255, 0.8)';
      btn.style.outlineOffset = '4px';
    });
    btn.addEventListener('blur', () => {
      onHoverChange(null);
      btn.style.outline = 'none';
    });
    return btn;
  };

  const restartBtn = makeBtn('[RESTART]', btnLayout.restartXRatio, 'restart', () => {
    hide();
    onRestart?.();
    scrollManager.start();
    scrollManager.scrollToSection(SECTION_IDS.HERO);
  });

  const seeMoreBtn = makeBtn('[SEE MORE]', btnLayout.seeMoreXRatio, 'see-more', () => {
    window.open(YOUTUBE_URL, '_blank', 'noopener,noreferrer');
  });

  const show = () => {
    container.classList.add('is-visible');
    restartBtn.tabIndex = 0;
    seeMoreBtn.tabIndex = 0;
  };

  const hide = () => {
    container.classList.remove('is-visible');
    restartBtn.tabIndex = -1;
    seeMoreBtn.tabIndex = -1;
  };

  const reposition = () => {
    positionBtn(restartBtn, btnLayout.restartXRatio);
    positionBtn(seeMoreBtn, btnLayout.seeMoreXRatio);
  };

  container.appendChild(restartBtn);
  container.appendChild(seeMoreBtn);
  document.body.appendChild(container);

  const dispose = () => {
    container.remove();
  };

  return { show, hide, reposition, dispose };
};
