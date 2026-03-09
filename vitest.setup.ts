import { vi } from 'vitest';

// Mock WebGLRenderingContext for tests that need it
if (typeof WebGLRenderingContext === 'undefined') {
  // @ts-expect-error - mocking global WebGL class
  global.WebGLRenderingContext = class WebGLRenderingContext {};
}

// Mock FontFace API for font preloading tests
if (typeof FontFace === 'undefined') {
  // @ts-expect-error - mocking global FontFace class
  global.FontFace = class FontFace {
    family: string;
    source: string;
    descriptors: FontFaceDescriptors;

    constructor(family: string, source: string, descriptors?: FontFaceDescriptors) {
      this.family = family;
      this.source = source;
      this.descriptors = descriptors || {};
    }

    load(): Promise<FontFace> {
      return Promise.resolve(this);
    }
  };

  // Mock document.fonts
  if (typeof document !== 'undefined' && !document.fonts) {
    Object.defineProperty(document, 'fonts', {
      value: {
        add: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn(),
        load: vi.fn(() => Promise.resolve()),
      },
      writable: true,
      configurable: true,
    });
  }
}

// Mock HTMLCanvasElement.getContext for WebGL and 2D canvas tests

const createMock2dContext = (): CanvasRenderingContext2D => {
  const noop = vi.fn();

  return {
    fillRect: noop,
    clearRect: noop,
    fillText: noop,
    strokeText: noop,
    measureText: vi.fn(
      (text: string) =>
        ({
          width: text.length * 10,
          actualBoundingBoxLeft: 0,
          actualBoundingBoxRight: text.length * 10,
          actualBoundingBoxAscent: 10,
          actualBoundingBoxDescent: 2,
          fontBoundingBoxAscent: 10,
          fontBoundingBoxDescent: 2,
          emHeightAscent: 10,
          emHeightDescent: 2,
          hangingBaseline: 0,
          alphabeticBaseline: 0,
          ideographicBaseline: 0,
        }) as TextMetrics,
    ),
    beginPath: noop,
    closePath: noop,
    moveTo: noop,
    lineTo: noop,
    stroke: noop,
    save: noop,
    restore: noop,
    translate: noop,
    scale: noop,
    rotate: noop,
    setTransform: noop,
    resetTransform: noop,
    drawImage: noop,
    arc: noop,
    canvas: document.createElement('canvas'),
    fillStyle: '#000000',
    font: '10px sans-serif',
    textAlign: 'left',
    textBaseline: 'alphabetic',
  } as unknown as CanvasRenderingContext2D;
};

HTMLCanvasElement.prototype.getContext = vi.fn(function (
  this: HTMLCanvasElement,
  contextId: string,
  _options?: unknown,
) {
  if (contextId === '2d') {
    return createMock2dContext();
  }

  // Return a minimal mock for WebGL contexts
  if (contextId === 'webgl' || contextId === 'experimental-webgl') {
    return {
      getExtension: vi.fn(),
      getParameter: vi.fn(),
      MAX_TEXTURE_SIZE: 0x0d33,
      UNMASKED_RENDERER_WEBGL: 0x9246,
      createShader: vi.fn(),
      shaderSource: vi.fn(),
      compileShader: vi.fn(),
      createProgram: vi.fn(),
      attachShader: vi.fn(),
      linkProgram: vi.fn(),
      useProgram: vi.fn(),
      canvas: this,
    } as unknown as WebGLRenderingContext;
  }

  return null;
}) as typeof HTMLCanvasElement.prototype.getContext;
