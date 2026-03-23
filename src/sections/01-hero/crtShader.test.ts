import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { createCrtScreen, CrtScreen } from './crtShader';

describe('createCrtScreen', () => {
  let crtScreen: CrtScreen;

  afterEach(() => {
    if (crtScreen) {
      crtScreen.dispose();
    }
  });

  it('creates a CRT screen with the correct aspect ratio', async () => {
    crtScreen = await createCrtScreen(16 / 9);

    expect(crtScreen.mesh).toBeDefined();
    expect(crtScreen.mesh).toBeInstanceOf(THREE.Mesh);
    expect(crtScreen.mesh.geometry).toBeInstanceOf(THREE.PlaneGeometry);
    expect(crtScreen.mesh.material).toBeInstanceOf(THREE.ShaderMaterial);
  });

  it('initializes with correct uniforms', async () => {
    crtScreen = await createCrtScreen(16 / 9);

    expect(crtScreen.uniforms.uTime.value).toBe(0);
    expect(crtScreen.uniforms.uPowerOn.value).toBe(0);
    expect(crtScreen.uniforms.uFade.value).toBe(1);
    expect(crtScreen.uniforms.uTexture.value).toBeDefined();
    expect(crtScreen.uniforms.uResolution.value).toBeInstanceOf(THREE.Vector2);
  });

  it('updates time uniform when update is called', async () => {
    crtScreen = await createCrtScreen(16 / 9);

    crtScreen.update(1.5);
    expect(crtScreen.uniforms.uTime.value).toBe(1.5);

    crtScreen.update(3.0);
    expect(crtScreen.uniforms.uTime.value).toBe(3.0);
  });

  it('updates power-on uniform when setPowerOn is called', async () => {
    crtScreen = await createCrtScreen(16 / 9);

    crtScreen.setPowerOn(0.5);
    expect(crtScreen.uniforms.uPowerOn.value).toBe(0.5);

    crtScreen.setPowerOn(1.0);
    expect(crtScreen.uniforms.uPowerOn.value).toBe(1.0);
  });

  it('updates fade uniform when setFade is called', async () => {
    crtScreen = await createCrtScreen(16 / 9);

    crtScreen.setFade(0.7);
    expect(crtScreen.uniforms.uFade.value).toBe(0.7);

    crtScreen.setFade(0.0);
    expect(crtScreen.uniforms.uFade.value).toBe(0.0);
  });

  it('updates UI progress without crashing', async () => {
    crtScreen = await createCrtScreen(16 / 9);

    // Should not throw
    expect(() => {
      crtScreen.setUiProgress(0.5, 0.8, 2);
    }).not.toThrow();

    expect(() => {
      crtScreen.setUiProgress(0, 0, -1);
    }).not.toThrow();

    expect(() => {
      crtScreen.setUiProgress(1, 1, 6);
    }).not.toThrow();
  });

  it('disposes all resources properly', async () => {
    crtScreen = await createCrtScreen(16 / 9);

    const geometryDisposeSpy = vi.spyOn(crtScreen.mesh.geometry, 'dispose');
    const material = crtScreen.mesh.material as THREE.ShaderMaterial;
    const materialDisposeSpy = vi.spyOn(material, 'dispose');

    crtScreen.dispose();

    expect(geometryDisposeSpy).toHaveBeenCalled();
    expect(materialDisposeSpy).toHaveBeenCalled();
  });

  it('creates correct geometry dimensions for different aspect ratios', async () => {
    const aspectRatio = 16 / 9;
    crtScreen = await createCrtScreen(aspectRatio);

    const geometry = crtScreen.mesh.geometry as THREE.PlaneGeometry;
    const params = geometry.parameters;

    const expectedHeight = 3.5;
    const expectedWidth = expectedHeight * aspectRatio;

    expect(params.width).toBeCloseTo(expectedWidth, 2);
    expect(params.height).toBe(expectedHeight);
  });

  it('has transparent material with correct settings', async () => {
    crtScreen = await createCrtScreen(16 / 9);

    const material = crtScreen.mesh.material as THREE.ShaderMaterial;

    expect(material.transparent).toBe(true);
    expect(material.depthWrite).toBe(false);
  });

  it('accepts custom texture resolution', async () => {
    crtScreen = await createCrtScreen(16 / 9, 512);

    expect(crtScreen.uniforms.uResolution.value.x).toBe(512);
    expect(crtScreen.uniforms.uResolution.value.y).toBeCloseTo(512 / (16 / 9), 0);
  });

  it('uses default texture resolution when not specified', async () => {
    crtScreen = await createCrtScreen(16 / 9);

    expect(crtScreen.uniforms.uResolution.value.x).toBe(1024);
    expect(crtScreen.uniforms.uResolution.value.y).toBeCloseTo(1024 / (16 / 9), 0);
  });

  describe('canvas dirty flag optimization', () => {
    beforeEach(async () => {
      crtScreen = await createCrtScreen(16 / 9);
    });

    it('does not redraw if values have not changed significantly', () => {
      const texture = crtScreen.uniforms.uTexture.value;

      // loadingProgress = 2 : transition terminée, contenu hero stable.
      // loadingProgress = 1 bypasserait le dirty flag (playButtonPulsing = true).
      crtScreen.setUiProgress(0.5, 0.5, 1, 2);
      const versionAfterFirstDraw = texture.version;

      // Second call with same values should not trigger a new texture upload.
      crtScreen.setUiProgress(0.5, 0.5, 1, 2);
      expect(texture.version).toBe(versionAfterFirstDraw);
    });

    it('redraws if values change significantly', () => {
      const texture = crtScreen.uniforms.uTexture.value;

      crtScreen.setUiProgress(0.5, 0.5, 1, 2);
      const versionAfterFirstDraw = texture.version;

      // Change titleProgress by more than threshold (0.001)
      crtScreen.setUiProgress(0.6, 0.5, 1, 2);
      expect(texture.version).toBeGreaterThan(versionAfterFirstDraw);
    });

    it('redraws when hover index changes', () => {
      const texture = crtScreen.uniforms.uTexture.value;

      crtScreen.setUiProgress(0.5, 0.5, 1, 2);
      const versionAfterFirstDraw = texture.version;

      // Change hover index
      crtScreen.setUiProgress(0.5, 0.5, 2, 2);
      expect(texture.version).toBeGreaterThan(versionAfterFirstDraw);
    });
  });
});
