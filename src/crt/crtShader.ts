import * as THREE from 'three';
import { ensureFontsLoaded } from './crtFonts';
import { vertexShader, fragmentShader } from './crtShaders';
import { createTextCanvasTexture } from './crtCanvasTexture';
import type { CrtScreen, CrtUniforms } from './crtTypes';
import { CRT_MENU_CONFIG } from './crtConfig';

export type { CrtScreen, CrtUniforms } from './crtTypes';

// Aspect ratio physique de la zone d'affichage du modèle 3D (uModelRect × aspect CRT 16:9).
// uModelRect = (0.47, 0.20, 0.87, 0.80) → width UV = 0.40, height UV = 0.60
export const CRT_MODEL_PREVIEW_ASPECT = ((0.87 - 0.47) * (16 / 9)) / (0.80 - 0.20);

export const createCrtScreen = async (
  aspectRatio: number = 16 / 9,
  textureResolution: number = 1024,
): Promise<CrtScreen> => {
  // Wait for fonts to be loaded before creating the canvas texture.
  try {
    await ensureFontsLoaded();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('Failed to preload CRT fonts, continuing with fallback fonts:', error);
  }

  const texWidth = textureResolution;
  const texHeight = Math.round(texWidth / aspectRatio);
  const textTexture = createTextCanvasTexture('LUV RESVAL', texWidth, texHeight);

  const uniforms: CrtUniforms = {
    uTexture: { value: textTexture.texture },
    uModelTexture: { value: new THREE.Texture() },
    uModelTextureOpacity: { value: 0.0 },
    uModelTexelSize: { value: new THREE.Vector2(1 / 512, 1 / 512) },
    // Zone centre-droite de l'ecran en UV distordu : (x0, y0, x1, y1)
    // UV y=0 est en bas, y=1 en haut.
    uModelRect: { value: new THREE.Vector4(0.47, 0.20, 0.87, 0.80) }, // Garder 0.40 de différence entre x0 et x1. Garder 0.60 entre y0 et y1.
    uTime: { value: 0.0 },
    uPowerOn: { value: 0.0 },
    uFade: { value: 1.0 },
    uResolution: { value: new THREE.Vector2(texWidth, texHeight) },
    uGlitch: { value: 0.0 },
    uBlackout: { value: 0.0 },
    uShiftX: { value: 0.0 },
    uShiftY: { value: 0.0 },
    uMosaic: { value: 0.0 },
    uBlur: { value: 0.0 },
  };

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true,
    depthWrite: false,
  });

  // Ecran CRT occupant la majorite du viewport.
  // La hauteur est centralisée dans CRT_MENU_CONFIG.PLANE_HEIGHT pour éviter la duplication.
  const planeHeight = CRT_MENU_CONFIG.PLANE_HEIGHT;
  const planeWidth = planeHeight * aspectRatio;
  const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight, 1, 1);
  const mesh = new THREE.Mesh(geometry, material);

  return {
    mesh,
    uniforms,
    update: (elapsedSeconds: number) => {
      uniforms.uTime.value = elapsedSeconds;
    },
    setPowerOn: (value: number) => {
      uniforms.uPowerOn.value = value;
    },
    setUiProgress: (titleProgress: number, menuOpacity: number, hoverIndex: number, loadingProgress = 1, playHover = false) => {
      textTexture.draw(titleProgress, menuOpacity, hoverIndex, loadingProgress, playHover);
    },
    setFade: (value: number) => {
      uniforms.uFade.value = value;
    },
    setModelPreview: (texture: THREE.Texture | null, opacity: number, texelSize?: THREE.Vector2) => {
      if (texture) uniforms.uModelTexture.value = texture;
      uniforms.uModelTextureOpacity.value = opacity;
      if (texelSize) {
        uniforms.uModelTexelSize.value.copy(texelSize);
      }
    },
    setGlitch: (value: number) => {
      uniforms.uGlitch.value = value;
    },
    dispose: () => {
      geometry.dispose();
      material.dispose();
      textTexture.dispose();
    },
  };
};
