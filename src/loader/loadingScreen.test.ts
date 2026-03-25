import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────────────────────

// Mock gsap (utilisé par createLoadingController)
vi.mock('gsap', () => ({
  default: {
    to: vi.fn((target: Record<string, number>, vars: {
      onUpdate?: () => void;
      onComplete?: () => void;
      [key: string]: unknown;
    }) => {
      for (const [key, value] of Object.entries(vars)) {
        if (!['onUpdate', 'onComplete', 'duration', 'delay', 'ease'].includes(key)) {
          (target as Record<string, unknown>)[key] = value;
        }
      }
      vars.onUpdate?.();
      vars.onComplete?.();
      return { kill: vi.fn() };
    }),
  },
}));

// Mock des imports GLB (Vite ?url — non résolvables dans Vitest)
vi.mock('../3d-models/darth_vader_helmet.glb?url', () => ({ default: 'darth.glb' }));
vi.mock('../3d-models/cctv_camera.glb?url', () => ({ default: 'cctv.glb' }));
vi.mock('../3d-models/mpc.glb?url', () => ({ default: 'mpc.glb' }));
vi.mock('../3d-models/tape.glb?url', () => ({ default: 'tape.glb' }));

// Stub THREE.WebGLRenderTarget
const mockRenderTarget = {
  texture: {},
  dispose: vi.fn(),
};

// Stub pour la texture canvas
const mockTexture = { dispose: vi.fn() };

// Stub CrtScreen
const makeCrtMesh = () => ({
  position: { set: vi.fn() },
  scale: { set: vi.fn() },
});

const makeCrtScreen = () => ({
  mesh: makeCrtMesh(),
  update: vi.fn(),
  setUiProgress: vi.fn(),
  setPowerOn: vi.fn(),
  dispose: vi.fn(),
});

vi.mock('../sections/01-hero/crt/crtShader', () => ({
  CRT_MODEL_PREVIEW_ASPECT: 1,
  createCrtScreen: vi.fn(async () => makeCrtScreen()),
}));

vi.mock('../sections/01-hero/crt/crtModelPreview', () => ({
  applyCrtModelPreview: vi.fn(),
}));

vi.mock('../sections/01-hero/crt/crtConfig', () => ({
  CRT_MENU_CONFIG: { PLANE_HEIGHT: 3.5 },
  getPlayButtonUVBounds: vi.fn(() => ({ xMin: 0.3, xMax: 0.7, yMin: 0.1, yMax: 0.4 })),
}));

vi.mock('../core/gpuCapabilities', () => ({
  detectGpuTier: vi.fn(() => 'high'),
  getShaderComplexity: vi.fn(() => ({ textureResolution: 512 })),
}));

// Stub MenuPreview3D
const makeMenuPreview = () => ({
  preloadAll: vi.fn(),
  getPreloadProgress: vi.fn(() => 1),
  update: vi.fn(),
  renderPreview: vi.fn(),
  getTexture: vi.fn(() => mockTexture),
  getTexelSize: vi.fn(() => ({ x: 1 / 512, y: 1 / 512 })),
  getOpacity: vi.fn(() => 0),
  dispose: vi.fn(),
  setHoveredIndex: vi.fn(),
});

vi.mock('../components/3d/menuPreview3D', () => ({
  createMenuPreview3D: vi.fn(() => makeMenuPreview()),
  getMenuPreviewQualityOptions: vi.fn(() => ({
    renderTargetSize: 512,
    rotationSpeed: 0.9,
    renderFrameInterval: 1,
    cameraAspect: 1,
  })),
}));

// Stub LoadingController
let mockLoadingProgress = 0;
let mockIsStillLoading = true;
let mockIsBarComplete = false;
const mockTriggerPlay = vi.fn();
const mockLoadingCtrlDispose = vi.fn();

vi.mock('../sections/01-hero/heroLoader', () => ({
  createLoadingController: vi.fn(() => ({
    getLoadingProgress: vi.fn(() => mockLoadingProgress),
    isStillLoading: vi.fn(() => mockIsStillLoading),
    isBarComplete: vi.fn(() => mockIsBarComplete),
    triggerPlay: mockTriggerPlay,
    dispose: mockLoadingCtrlDispose,
  })),
}));

// Stub HeroRaycaster
vi.mock('../sections/01-hero/heroRaycaster', () => ({
  createHeroRaycaster: vi.fn(() => ({
    getClickUV: vi.fn(() => null),
    isAtMenuSection: vi.fn(() => false),
    isClickOnCrt: vi.fn(() => false),
    getHoverMenuIndexFromPointer: vi.fn(() => -1),
  })),
}));

vi.mock('../sections/01-hero/crt/crtScaling', () => ({
  computeCrtScale: vi.fn(() => 1.2),
}));

// ── Helpers ────────────────────────────────────────────────────────────────────

const makeScene = () => ({ add: vi.fn(), remove: vi.fn() });

const makeCamera = () => ({
  fov: 60,
  position: { z: 5 },
  aspect: 16 / 9,
  updateProjectionMatrix: vi.fn(),
});

const makeRenderer = () => ({
  domElement: document.createElement('canvas'),
  getRenderTarget: vi.fn(() => null),
  setRenderTarget: vi.fn(),
  getClearColor: vi.fn(),
  getClearAlpha: vi.fn(() => 1),
  setClearColor: vi.fn(),
  clear: vi.fn(),
  render: vi.fn(),
  setSize: vi.fn(),
  getPixelRatio: vi.fn(() => 1),
  WebGLRenderTarget: vi.fn(() => mockRenderTarget),
});

const makeScrollManager = () => ({
  stop: vi.fn(),
  start: vi.fn(),
  update: vi.fn(),
  getScrollY: vi.fn(() => 0),
  scrollToSection: vi.fn(),
  refresh: vi.fn(),
  dispose: vi.fn(),
  onScroll: vi.fn(),
});

const makeAudioManager = () => ({
  playUiFx: vi.fn(),
  startExperience: vi.fn(),
  toggleMute: vi.fn(),
  dispose: vi.fn(),
});

// ── Tests ──────────────────────────────────────────────────────────────────────

import { createLoadingScreen } from './loadingScreen';

describe('createLoadingScreen', () => {
  beforeEach(() => {
    mockLoadingProgress = 0;
    mockIsStillLoading = true;
    mockIsBarComplete = false;
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Nettoyer les event listeners résiduels
    window.dispatchEvent(new Event('cleanup'));
  });

  it('expose les méthodes update, waitForPlay et dispose', async () => {
    const screen = await createLoadingScreen(
      makeScene() as never,
      makeCamera() as never,
      makeRenderer() as never,
      makeScrollManager() as never,
      makeAudioManager() as never,
    );

    expect(typeof screen.update).toBe('function');
    expect(typeof screen.waitForPlay).toBe('function');
    expect(typeof screen.dispose).toBe('function');
  });

  it('waitForPlay() retourne une Promise en attente avant que loadingProgress atteigne 2', async () => {
    const screen = await createLoadingScreen(
      makeScene() as never,
      makeCamera() as never,
      makeRenderer() as never,
      makeScrollManager() as never,
      makeAudioManager() as never,
    );

    mockLoadingProgress = 1.5;

    let resolved = false;
    void screen.waitForPlay().then(() => { resolved = true; });

    // Avancer une frame sans atteindre 2
    screen.update(0.016, 1.5);
    await Promise.resolve(); // flush microtasks

    expect(resolved).toBe(false);
  });

  it('waitForPlay() se résout quand loadingProgress >= 2', async () => {
    const screen = await createLoadingScreen(
      makeScene() as never,
      makeCamera() as never,
      makeRenderer() as never,
      makeScrollManager() as never,
      makeAudioManager() as never,
    );

    mockLoadingProgress = 2;

    const promise = screen.waitForPlay();

    // Déclencher la transition en avançant une frame avec loadingProgress >= 2
    screen.update(0.016, 10);
    const resources = await promise;

    expect(resources).toHaveProperty('crt');
    expect(resources).toHaveProperty('menuPreview');
  });

  it('waitForPlay() ne se résout qu\'une seule fois (idempotence)', async () => {
    const screen = await createLoadingScreen(
      makeScene() as never,
      makeCamera() as never,
      makeRenderer() as never,
      makeScrollManager() as never,
      makeAudioManager() as never,
    );

    mockLoadingProgress = 2;

    const promise = screen.waitForPlay();

    // Deux frames avec loadingProgress >= 2
    screen.update(0.016, 10);
    screen.update(0.016, 10.016);

    const resources = await promise;
    expect(resources).toHaveProperty('crt');
  });

  it('dispose() supprime les listeners resize, mousemove et click', async () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const screen = await createLoadingScreen(
      makeScene() as never,
      makeCamera() as never,
      makeRenderer() as never,
      makeScrollManager() as never,
      makeAudioManager() as never,
    );

    screen.dispose();

    const removedEvents = removeEventListenerSpy.mock.calls.map((c) => c[0]);
    expect(removedEvents).toContain('resize');
    expect(removedEvents).toContain('mousemove');
    expect(removedEvents).toContain('click');
  });

  it('dispose() est idempotent (double appel sans erreur)', async () => {
    const screen = await createLoadingScreen(
      makeScene() as never,
      makeCamera() as never,
      makeRenderer() as never,
      makeScrollManager() as never,
      makeAudioManager() as never,
    );

    expect(() => {
      screen.dispose();
      screen.dispose();
    }).not.toThrow();
  });

  it('update() après dispose() ne lance pas d\'erreur', async () => {
    const screen = await createLoadingScreen(
      makeScene() as never,
      makeCamera() as never,
      makeRenderer() as never,
      makeScrollManager() as never,
      makeAudioManager() as never,
    );

    screen.dispose();

    expect(() => {
      screen.update(0.016, 5);
    }).not.toThrow();
  });

  it('un événement resize déclenche le recalcul du scale CRT', async () => {
    const { computeCrtScale } = await import('../sections/01-hero/crt/crtScaling');
    const computeCrtScaleMock = vi.mocked(computeCrtScale);

    const screen = await createLoadingScreen(
      makeScene() as never,
      makeCamera() as never,
      makeRenderer() as never,
      makeScrollManager() as never,
      makeAudioManager() as never,
    );

    // Mémoriser le compte après création (fitCrtToViewport est appelé une fois à l'init)
    const callCountAfterCreate = computeCrtScaleMock.mock.calls.length;

    window.dispatchEvent(new Event('resize'));

    // Un appel supplémentaire doit avoir eu lieu
    expect(computeCrtScaleMock.mock.calls.length).toBeGreaterThan(callCountAfterCreate);

    screen.dispose();
  });

  it('resize après dispose() ne déclenche plus de mise à jour du scale CRT de cette instance', async () => {
    // On vérifie que le scale.set du mesh CRT de cette instance
    // n'est plus appelé après dispose, même si d'autres instances peuvent encore écouter.
    const crtShaderModule = await import('../sections/01-hero/crt/crtShader');
    const crtScreens: ReturnType<typeof makeCrtScreen>[] = [];
    vi.mocked(crtShaderModule.createCrtScreen).mockImplementation(async () => {
      const crt = makeCrtScreen();
      crtScreens.push(crt);
      return crt as never;
    });

    const screen = await createLoadingScreen(
      makeScene() as never,
      makeCamera() as never,
      makeRenderer() as never,
      makeScrollManager() as never,
      makeAudioManager() as never,
    );

    // L'instance CRT créée par ce test
    const thisCrt = crtScreens[crtScreens.length - 1];
    expect(thisCrt).toBeDefined();

    screen.dispose();

    // Réinitialiser le compteur après dispose
    thisCrt!.mesh.scale.set.mockClear();

    window.dispatchEvent(new Event('resize'));

    // Le mesh de cette instance ne doit plus être mis à jour
    expect(thisCrt!.mesh.scale.set).not.toHaveBeenCalled();
  });
});
