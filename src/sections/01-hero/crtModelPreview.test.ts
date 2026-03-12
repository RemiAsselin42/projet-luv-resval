import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { applyCrtModelPreview } from './crtModelPreview';

describe('applyCrtModelPreview', () => {
  it('uses setModelPreview when available', () => {
    const setModelPreview = vi.fn();
    const texture = new THREE.Texture();
    const texelSize = new THREE.Vector2(0.01, 0.01);

    const applied = applyCrtModelPreview(
      { setModelPreview },
      { texture, opacity: 0.75, texelSize },
    );

    expect(applied).toBe(true);
    expect(setModelPreview).toHaveBeenCalledOnce();
    expect(setModelPreview).toHaveBeenCalledWith(texture, 0.75, texelSize);
  });

  it('falls back to uniforms when method is unavailable', () => {
    const texture = new THREE.Texture();
    const texelSize = new THREE.Vector2(0.02, 0.02);
    const crt = {
      uniforms: {
        uModelTexture: { value: new THREE.Texture() },
        uModelTextureOpacity: { value: 0 },
        uModelTexelSize: { value: new THREE.Vector2(1, 1) },
      },
    };

    const applied = applyCrtModelPreview(crt, {
      texture,
      opacity: 0.5,
      texelSize,
    });

    expect(applied).toBe(true);
    expect(crt.uniforms.uModelTexture.value).toBe(texture);
    expect(crt.uniforms.uModelTextureOpacity.value).toBe(0.5);
    expect(crt.uniforms.uModelTexelSize.value.equals(texelSize)).toBe(true);
  });

  it('clamps opacity in fallback mode', () => {
    const crt = {
      uniforms: {
        uModelTexture: { value: new THREE.Texture() },
        uModelTextureOpacity: { value: 0 },
      },
    };

    applyCrtModelPreview(crt, {
      texture: null,
      opacity: 12,
    });

    expect(crt.uniforms.uModelTextureOpacity.value).toBe(1);
  });

  it('returns false when no preview API exists', () => {
    const applied = applyCrtModelPreview({}, {
      texture: null,
      opacity: 0.3,
    });

    expect(applied).toBe(false);
  });
});
