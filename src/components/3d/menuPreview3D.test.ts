import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getMenuPreviewQualityOptions } from './menuPreview3D';

const createRendererStub = (): THREE.WebGLRenderer => {
  const clearColor = new THREE.Color(0x000000);
  const renderer = {
    getRenderTarget: vi.fn(() => null),
    setRenderTarget: vi.fn(),
    getClearAlpha: vi.fn(() => 0),
    getClearColor: vi.fn((target: THREE.Color) => {
      target.copy(clearColor);
      return target;
    }),
    setClearColor: vi.fn(),
    clear: vi.fn(),
    render: vi.fn(),
  };

  return renderer as unknown as THREE.WebGLRenderer;
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('getMenuPreviewQualityOptions', () => {
  it('degrades quality but keeps feature active on low tier', () => {
    const options = getMenuPreviewQualityOptions('low', 1.5);

    expect(options.renderTargetSize).toBe(256);
    expect(options.renderFrameInterval).toBe(2);
    expect(options.rotationSpeed).toBeGreaterThan(0);
    expect(options.cameraAspect).toBe(1.5);
  });

  it('uses default high-quality settings for medium and high tiers', () => {
    expect(getMenuPreviewQualityOptions('medium', 1.0)).toEqual({
      renderTargetSize: 512,
      rotationSpeed: 0.9,
      renderFrameInterval: 1,
      cameraAspect: 1.0,
    });

    expect(getMenuPreviewQualityOptions('high', 2.0)).toEqual({
      renderTargetSize: 512,
      rotationSpeed: 0.9,
      renderFrameInterval: 1,
      cameraAspect: 2.0,
    });
  });

  it('retries model loading on next hover after a previous failure', async () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const loadMock = vi
      .fn<
        (
          modelUrl: string,
        ) => Promise<{ scene: THREE.Object3D; decoderPath: string }>
      >()
      .mockRejectedValueOnce(new Error('first fail'))
      .mockRejectedValueOnce(new Error('second fail'));

    vi.doMock('./glbLoader', () => ({
      loadGlbWithDracoFallback: loadMock,
    }));

    const { createMenuPreview3D } = await import('./menuPreview3D');
    const preview = createMenuPreview3D(createRendererStub(), [
      { menuIndex: 1, modelUrl: '/fake.glb', targetDimension: 1 },
    ]);

    preview.setHoveredIndex(1);
    await vi.waitFor(() => {
      expect(loadMock).toHaveBeenCalledTimes(1);
    });
    await vi.waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    preview.setHoveredIndex(-1);
    preview.setHoveredIndex(1);
    await vi.waitFor(() => {
      expect(loadMock).toHaveBeenCalledTimes(2);
    });

    expect(loadMock).toHaveBeenCalledTimes(2);

    preview.dispose();
  });

  it('ignores async loader completion after dispose', async () => {
    let resolveLoad:
      | ((value: { scene: THREE.Object3D; decoderPath: string }) => void)
      | undefined;
    const loadPromise = new Promise<{
      scene: THREE.Object3D;
      decoderPath: string;
    }>((resolve) => {
      resolveLoad = resolve;
    });

    const loadMock = vi
      .fn<
        (
          modelUrl: string,
        ) => Promise<{ scene: THREE.Object3D; decoderPath: string }>
      >()
      .mockReturnValue(loadPromise);

    vi.doMock('./glbLoader', () => ({
      loadGlbWithDracoFallback: loadMock,
    }));

    const { createMenuPreview3D } = await import('./menuPreview3D');
    const preview = createMenuPreview3D(createRendererStub(), [
      { menuIndex: 1, modelUrl: '/fake.glb', targetDimension: 1 },
    ]);

    preview.setHoveredIndex(1);
    preview.dispose();

    if (resolveLoad) {
      resolveLoad({ scene: new THREE.Group(), decoderPath: 'mock-path' });
    }
    await Promise.resolve();
    await Promise.resolve();

    expect(loadMock).toHaveBeenCalledTimes(1);
  });
});
