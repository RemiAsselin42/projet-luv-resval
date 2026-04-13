// Types TypeScript internes du système CRT.
// Décrit la structure des "uniforms" (paramètres envoyés au shader GLSL)
// et l'interface basse couche CrtScreen utilisée par crtShader.ts.

import * as THREE from 'three';

export interface CrtUniforms {
  [uniform: string]: THREE.IUniform;
  uTexture: THREE.IUniform<THREE.Texture>;
  uTexturePrev: THREE.IUniform<THREE.Texture>;
  uBlend: THREE.IUniform<number>;
  uModelTexture: THREE.IUniform<THREE.Texture>;
  uModelTextureOpacity: THREE.IUniform<number>;
  uModelTexelSize: THREE.IUniform<THREE.Vector2>;
  uModelRect: THREE.IUniform<THREE.Vector4>;
  uTime: THREE.IUniform<number>;
  uPowerOn: THREE.IUniform<number>;
  uFade: THREE.IUniform<number>;
  uResolution: THREE.IUniform<THREE.Vector2>;
  uGlitch: THREE.IUniform<number>;
  uBlackout: THREE.IUniform<number>;
  uShiftX: THREE.IUniform<number>;
  uShiftY: THREE.IUniform<number>;
  uMosaic: THREE.IUniform<number>;
  uBlur: THREE.IUniform<number>;
  uModelColorMode: THREE.IUniform<number>;
}

export interface CrtScreen {
  mesh: THREE.Mesh;
  uniforms: CrtUniforms;
  update: (elapsedSeconds: number) => void;
  setPowerOn: (value: number) => void;
  setUiProgress: (
    titleProgress: number,
    menuOpacity: number,
    hoverIndex: number,
    loadingProgress?: number,
    playHover?: boolean,
  ) => void;
  setFade: (value: number) => void;
  /** Injecte la texture du render target de la preview 3D dans le shader CRT. */
  setModelPreview: (
    texture: THREE.Texture | null,
    opacity: number,
    texelSize?: THREE.Vector2,
  ) => void;
  /** Pilote l'intensité du glitch (0 = normal hero, 1 = glitch maximum). */
  setGlitch: (value: number) => void;
  /** 0 = wireframe blanc (menu/hero), 1 = couleurs réelles (Reliques). */
  setModelColorMode: (mode: number) => void;
  /** Lance un crossfade : pose la texture "from", règle uBlend=0. Appeler setContentTexture() ensuite pour la texture "to". */
  startCrossfade(fromTexture: THREE.Texture): void;
  /** Avance le crossfade (0 = from, 1 = to). */
  setCrossfade(blend: number): void;
  dispose: () => void;
}
