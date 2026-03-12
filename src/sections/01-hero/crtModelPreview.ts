import * as THREE from 'three';

export interface CrtModelPreviewPayload {
  texture: THREE.Texture | null;
  opacity: number;
  texelSize?: THREE.Vector2;
}

interface CrtModelPreviewMethod {
  setModelPreview: (
    texture: THREE.Texture | null,
    opacity: number,
    texelSize?: THREE.Vector2,
  ) => void;
}

interface CrtModelPreviewUniforms {
  uniforms: {
    uModelTexture?: THREE.IUniform<THREE.Texture>;
    uModelTextureOpacity?: THREE.IUniform<number>;
    uModelTexelSize?: THREE.IUniform<THREE.Vector2>;
  };
}

const hasSetModelPreview = (crt: unknown): crt is CrtModelPreviewMethod => {
  return typeof (crt as { setModelPreview?: unknown })?.setModelPreview === 'function';
};

const hasModelPreviewUniforms = (crt: unknown): crt is CrtModelPreviewUniforms => {
  const maybeUniforms = (crt as { uniforms?: unknown })?.uniforms;
  if (!maybeUniforms || typeof maybeUniforms !== 'object') {
    return false;
  }

  const uniforms = maybeUniforms as CrtModelPreviewUniforms['uniforms'];
  return (
    uniforms.uModelTextureOpacity !== undefined
    && uniforms.uModelTexture !== undefined
  );
};

const clamp01 = (value: number): number => {
  return Math.min(Math.max(value, 0), 1);
};

/**
 * Injection modulaire de la preview 3D dans le CRT.
 * 1) Utilise l'API dédiée `setModelPreview` si disponible.
 * 2) Fallback sur les uniforms shader pour rester compatible avec des variantes CRT.
 */
export const applyCrtModelPreview = (
  crt: unknown,
  { texture, opacity, texelSize }: CrtModelPreviewPayload,
): boolean => {
  const safeOpacity = clamp01(opacity);

  if (hasSetModelPreview(crt)) {
    crt.setModelPreview(texture, safeOpacity, texelSize);
    return true;
  }

  if (hasModelPreviewUniforms(crt)) {
    if (texture) {
      const modelTextureUniform = crt.uniforms.uModelTexture;
      if (modelTextureUniform) {
        modelTextureUniform.value = texture;
      }
    }
    if (crt.uniforms.uModelTextureOpacity) {
      crt.uniforms.uModelTextureOpacity.value = safeOpacity;
    }
    if (texelSize && crt.uniforms.uModelTexelSize) {
      crt.uniforms.uModelTexelSize.value.copy(texelSize);
    }
    return true;
  }

  return false;
};
