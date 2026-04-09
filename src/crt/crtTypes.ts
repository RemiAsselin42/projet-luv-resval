import * as THREE from 'three';

export interface CrtUniforms {
  [uniform: string]: THREE.IUniform;
  uTexture: THREE.IUniform<THREE.Texture>;
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
  dispose: () => void;
}
