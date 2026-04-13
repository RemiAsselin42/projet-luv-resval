// Gestionnaire principal de l'écran CRT (la vieille télévision 3D au centre du site).
// Fournit une interface haut niveau pour contrôler tous les effets visuels :
// allumage, glitch, flou, blackout, fondu, menu interactif, prévisualisation des modèles 3D.
// Persiste toute la durée du site et est partagé entre toutes les sections.

import * as THREE from 'three';
import { createCrtScreen } from './crtShader';
import type { CrtScreen, CrtUniforms } from './crtTypes';
import { CRT_MENU_CONFIG } from './crtConfig';
import { computeCrtScale } from './crtScaling';

export type { CrtUniforms } from './crtTypes';

// ── Public interface ───────────────────────────────────────────────────────────

export interface CrtManager {
  /** Le mesh Three.js persistant (toujours dans la scène). */
  readonly mesh: THREE.Mesh;
  /** Accès direct aux uniforms pour les cas avancés. */
  readonly uniforms: CrtUniforms;

  // ── Temps ──
  update(elapsedSeconds: number): void;

  // ── Contenu ──
  /** Remplace la texture principale affichée sur le CRT. */
  setContentTexture(texture: THREE.Texture): void;
  /** Retourne la texture canvas initiale (menu hero). */
  getHeroCanvasTexture(): THREE.Texture;
  /** Lance un crossfade depuis fromTexture vers la prochaine setContentTexture(). */
  startCrossfade(fromTexture: THREE.Texture): void;
  /** Avance le crossfade (0 = from, 1 = to). */
  setCrossfade(blend: number): void;

  // ── Effets ──
  setPowerOn(value: number): void;
  setFade(value: number): void;
  setGlitch(value: number): void;
  setBlur(value: number): void;
  setBlackout(value: number): void;
  setShift(x: number, y: number): void;
  setMosaic(value: number): void;

  // ── Preview 3D (hero) ──
  setModelPreview(texture: THREE.Texture | null, opacity: number, texelSize?: THREE.Vector2): void;
  /** 0 = wireframe blanc (menu/hero), 1 = couleurs réelles (Reliques). */
  setModelColorMode(mode: number): void;

  // ── Canvas hero (menu UI) ──
  setUiProgress(
    titleProgress: number,
    menuOpacity: number,
    hoverIndex: number,
    loadingProgress?: number,
    playHover?: boolean,
  ): void;

  // ── Responsive ──
  fitToViewport(camera: THREE.PerspectiveCamera): void;

  // ── Reset ──
  /** Remet tous les effets à leurs valeurs par défaut (glitch, blur, blackout, shift, mosaic). */
  resetEffects(): void;

  // ── Lifecycle ──
  dispose(): void;
}

// ── Factory ────────────────────────────────────────────────────────────────────

const CRT_ASPECT = 16 / 9;

export const createCrtManager = async (
  scene: THREE.Scene,
  aspectRatio: number = CRT_ASPECT,
  textureResolution: number = 1024,
): Promise<CrtManager> => {
  const crt: CrtScreen = await createCrtScreen(aspectRatio, textureResolution);
  crt.mesh.position.set(0, 0, 0);
  scene.add(crt.mesh);

  // Référence à la texture canvas initiale (menu hero) pour pouvoir y revenir
  const heroCanvasTexture = crt.uniforms.uTexture.value;

  const BASE_PLANE_HEIGHT = CRT_MENU_CONFIG.PLANE_HEIGHT;
  const BASE_PLANE_WIDTH = BASE_PLANE_HEIGHT * aspectRatio;

  return {
    mesh: crt.mesh,
    uniforms: crt.uniforms,

    update: (elapsedSeconds: number) => {
      crt.update(elapsedSeconds);
    },

    setContentTexture: (texture: THREE.Texture) => {
      crt.uniforms.uTexture.value = texture;
    },

    getHeroCanvasTexture: () => heroCanvasTexture,

    startCrossfade: (fromTexture: THREE.Texture) => crt.startCrossfade(fromTexture),
    setCrossfade: (blend: number) => crt.setCrossfade(blend),

    setPowerOn: (value: number) => crt.setPowerOn(value),
    setFade: (value: number) => crt.setFade(value),
    setGlitch: (value: number) => crt.setGlitch(value),
    setBlur: (value: number) => {
      crt.uniforms.uBlur.value = value;
    },
    setBlackout: (value: number) => {
      crt.uniforms.uBlackout.value = value;
    },
    setShift: (x: number, y: number) => {
      crt.uniforms.uShiftX.value = x;
      crt.uniforms.uShiftY.value = y;
    },
    setMosaic: (value: number) => {
      crt.uniforms.uMosaic.value = value;
    },

    setModelPreview: (texture: THREE.Texture | null, opacity: number, texelSize?: THREE.Vector2) => {
      crt.setModelPreview(texture, opacity, texelSize);
    },

    setModelColorMode: (mode: number) => {
      crt.uniforms.uModelColorMode.value = mode;
    },

    setUiProgress: (
      titleProgress: number,
      menuOpacity: number,
      hoverIndex: number,
      loadingProgress = 1,
      playHover = false,
    ) => {
      crt.setUiProgress(titleProgress, menuOpacity, hoverIndex, loadingProgress, playHover);
    },

    fitToViewport: (camera: THREE.PerspectiveCamera) => {
      const fovRad = (camera.fov * Math.PI) / 180;
      const visibleHeight = 2 * camera.position.z * Math.tan(fovRad / 2);
      const viewportAspect = window.innerWidth / Math.max(window.innerHeight, 1);
      const scale = computeCrtScale(visibleHeight, viewportAspect, BASE_PLANE_WIDTH, BASE_PLANE_HEIGHT);
      crt.mesh.scale.set(scale, scale, 1);
    },

    resetEffects: () => {
      crt.uniforms.uGlitch.value = 0;
      crt.uniforms.uBlur.value = 0;
      crt.uniforms.uBlackout.value = 0;
      crt.uniforms.uShiftX.value = 0;
      crt.uniforms.uShiftY.value = 0;
      crt.uniforms.uMosaic.value = 0;
      crt.uniforms.uModelColorMode.value = 0;
    },

    dispose: () => {
      scene.remove(crt.mesh);
      crt.dispose();
    },
  };
};
