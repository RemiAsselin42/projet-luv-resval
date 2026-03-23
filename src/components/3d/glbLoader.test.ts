import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';

// Use doMock (non-hoisted) so vi.resetModules() in beforeEach takes effect first.
// This gives each test a fresh module with reset sharedThreeExampleLoadersPromise.

let mockGltfLoad: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.resetModules();

  mockGltfLoad = vi.fn();

  const MockDRACOLoader = vi.fn().mockImplementation(() => ({
    setDecoderPath: vi.fn(),
    setDecoderConfig: vi.fn(),
  }));

  const MockGLTFLoader = vi.fn().mockImplementation(() => ({
    setDRACOLoader: vi.fn().mockReturnThis(),
    load: mockGltfLoad,
  }));

  vi.doMock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
    GLTFLoader: MockGLTFLoader,
  }));

  vi.doMock('three/examples/jsm/loaders/DRACOLoader.js', () => ({
    DRACOLoader: MockDRACOLoader,
  }));
});

describe('loadGlbWithDracoFallback', () => {
  it('resolves with scene and decoderPath on success', async () => {
    const fakeScene = new THREE.Object3D();
    mockGltfLoad.mockImplementation(
      (_url: string, onLoad: (gltf: { scene: THREE.Object3D }) => void) => {
        onLoad({ scene: fakeScene });
      },
    );

    const { loadGlbWithDracoFallback } = await import('./glbLoader');
    const result = await loadGlbWithDracoFallback('model.glb');

    expect(result.scene).toBe(fakeScene);
    expect(typeof result.decoderPath).toBe('string');
  });

  it('uses the local draco path by default (index 0)', async () => {
    const fakeScene = new THREE.Object3D();
    mockGltfLoad.mockImplementation(
      (_url: string, onLoad: (gltf: { scene: THREE.Object3D }) => void) => {
        onLoad({ scene: fakeScene });
      },
    );

    const { loadGlbWithDracoFallback } = await import('./glbLoader');
    const result = await loadGlbWithDracoFallback('model.glb');

    expect(result.decoderPath).toContain('draco/');
  });

  it('falls back to next decoder path on error and resolves', async () => {
    let callCount = 0;
    mockGltfLoad.mockImplementation(
      (
        _url: string,
        onLoad: (gltf: { scene: THREE.Object3D }) => void,
        _onProgress: undefined,
        onError: (err: unknown) => void,
      ) => {
        callCount++;
        if (callCount === 1) {
          onError(new Error('first path failed'));
        } else {
          onLoad({ scene: new THREE.Object3D() });
        }
      },
    );

    const { loadGlbWithDracoFallback } = await import('./glbLoader');
    const result = await loadGlbWithDracoFallback('model.glb');

    expect(result.scene).toBeInstanceOf(THREE.Object3D);
    expect(callCount).toBe(2);
  });

  it('uses the CDN path after the local path fails', async () => {
    let callCount = 0;
    mockGltfLoad.mockImplementation(
      (
        _url: string,
        onLoad: (gltf: { scene: THREE.Object3D }) => void,
        _onProgress: undefined,
        onError: (err: unknown) => void,
      ) => {
        callCount++;
        if (callCount === 1) {
          onError(new Error('local failed'));
        } else {
          onLoad({ scene: new THREE.Object3D() });
        }
      },
    );

    const { loadGlbWithDracoFallback } = await import('./glbLoader');
    const result = await loadGlbWithDracoFallback('model.glb');

    expect(result.decoderPath).toContain('gstatic.com');
  });

  it('rejects when all fallback paths are exhausted', async () => {
    mockGltfLoad.mockImplementation(
      (
        _url: string,
        _onLoad: unknown,
        _onProgress: undefined,
        onError: (err: unknown) => void,
      ) => {
        onError(new Error('all paths failed'));
      },
    );

    const { loadGlbWithDracoFallback } = await import('./glbLoader');

    await expect(loadGlbWithDracoFallback('model.glb')).rejects.toThrow();
  });

  it('rejects with an Error instance when the error is a non-Error value', async () => {
    // Exhaust all paths — last path converts error to Error instance
    let callCount = 0;
    const totalPaths = 3;
    mockGltfLoad.mockImplementation(
      (
        _url: string,
        _onLoad: unknown,
        _onProgress: undefined,
        onError: (err: unknown) => void,
      ) => {
        callCount++;
        if (callCount < totalPaths) {
          onError(new Error('intermediate'));
        } else {
          onError('plain string error');
        }
      },
    );

    const { loadGlbWithDracoFallback } = await import('./glbLoader');

    await expect(loadGlbWithDracoFallback('model.glb')).rejects.toBeInstanceOf(Error);
  });

  it('rejects immediately when dracoPathIndex is out of bounds', async () => {
    const { loadGlbWithDracoFallback } = await import('./glbLoader');

    await expect(loadGlbWithDracoFallback('model.glb', 99)).rejects.toThrow(
      'Aucun chemin de fallback Draco disponible.',
    );
  });
});
