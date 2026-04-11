import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { detectGpuTier, hasWebGLSupport, getShaderComplexity } from './gpuCapabilities';

// Mock canvas and WebGL
const mockWebGLContext = () => {
  const gl = {
    getParameter: vi.fn(),
    getExtension: vi.fn(),
    MAX_TEXTURE_SIZE: 0x0d33,
    RENDERER: 0x1f01,
    UNMASKED_RENDERER_WEBGL: 0x9246,
  };
  return gl;
};

describe('gpuCapabilities', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('hasWebGLSupport', () => {
    it('returns true when WebGL is available', () => {
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = vi.fn((type) => {
        if (type === 'webgl') return mockWebGLContext();
        return null;
      }) as typeof originalGetContext;

      expect(hasWebGLSupport()).toBe(true);

      HTMLCanvasElement.prototype.getContext = originalGetContext;
    });

    it('returns false when WebGL is not available', () => {
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as typeof originalGetContext;

      expect(hasWebGLSupport()).toBe(false);

      HTMLCanvasElement.prototype.getContext = originalGetContext;
    });
  });

  describe('detectGpuTier', () => {
    let originalGetContext: typeof HTMLCanvasElement.prototype.getContext;

    beforeEach(() => {
      originalGetContext = HTMLCanvasElement.prototype.getContext;
    });

    afterEach(() => {
      HTMLCanvasElement.prototype.getContext = originalGetContext;
    });

    it('returns low tier when WebGL is not available', () => {
      HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as typeof originalGetContext;
      expect(detectGpuTier()).toBe('low');
    });

    it('detects high tier for NVIDIA GPUs', () => {
      const gl = mockWebGLContext();
      gl.getParameter.mockReturnValue('NVIDIA GeForce RTX 3080');

      HTMLCanvasElement.prototype.getContext = vi.fn(
        () => gl,
      ) as unknown as typeof originalGetContext;

      expect(detectGpuTier()).toBe('high');
    });

    it('detects high tier for AMD GPUs', () => {
      const gl = mockWebGLContext();
      gl.getParameter.mockReturnValue('AMD Radeon RX 6800 XT');

      HTMLCanvasElement.prototype.getContext = vi.fn(
        () => gl,
      ) as unknown as typeof originalGetContext;

      expect(detectGpuTier()).toBe('high');
    });

    it('detects low tier for Intel integrated GPUs', () => {
      const gl = mockWebGLContext();
      gl.getParameter.mockReturnValue('Intel HD Graphics 620');

      HTMLCanvasElement.prototype.getContext = vi.fn(
        () => gl,
      ) as unknown as typeof originalGetContext;

      expect(detectGpuTier()).toBe('low');
    });

    it('detects low tier for mobile GPUs', () => {
      const gl = mockWebGLContext();
      gl.getParameter.mockReturnValue('Mali-G76');

      HTMLCanvasElement.prototype.getContext = vi.fn(
        () => gl,
      ) as unknown as typeof originalGetContext;

      expect(detectGpuTier()).toBe('low');
    });

    it('returns medium tier when renderer is unavailable but texture size is large', () => {
      const gl = mockWebGLContext();
      gl.getParameter.mockImplementation((param: number) => {
        if (param === gl.RENDERER) return '';
        if (param === gl.MAX_TEXTURE_SIZE) return 8192;
        return null;
      });

      HTMLCanvasElement.prototype.getContext = vi.fn(
        () => gl,
      ) as unknown as typeof originalGetContext;

      expect(detectGpuTier()).toBe('medium');
    });

    it('returns low tier when renderer is unavailable and texture size is small', () => {
      const gl = mockWebGLContext();
      gl.getParameter.mockImplementation((param: number) => {
        if (param === gl.RENDERER) return '';
        if (param === gl.MAX_TEXTURE_SIZE) return 4096;
        return null;
      });

      HTMLCanvasElement.prototype.getContext = vi.fn(
        () => gl,
      ) as unknown as typeof originalGetContext;

      expect(detectGpuTier()).toBe('low');
    });

    it('returns low tier on error', () => {
      HTMLCanvasElement.prototype.getContext = vi.fn(() => {
        throw new Error('WebGL error');
      }) as typeof originalGetContext;

      expect(detectGpuTier()).toBe('low');
    });
  });

  describe('getShaderComplexity', () => {
    it('returns simplified settings for low tier', () => {
      const settings = getShaderComplexity('low');

      expect(settings.scanlineIntensity).toBe(0.15);
      expect(settings.glitchEnabled).toBe(false);
      expect(settings.aberrationStrength).toBe(0.002);
      expect(settings.barrelDistortion).toBe(0.4);
      expect(settings.textureResolution).toBe(512);
    });

    it('returns standard settings for medium tier', () => {
      const settings = getShaderComplexity('medium');

      expect(settings.scanlineIntensity).toBe(0.22);
      expect(settings.glitchEnabled).toBe(true);
      expect(settings.aberrationStrength).toBe(0.003);
      expect(settings.barrelDistortion).toBe(0.6);
      expect(settings.textureResolution).toBe(1024);
    });

    it('returns full settings for high tier', () => {
      const settings = getShaderComplexity('high');

      expect(settings.scanlineIntensity).toBe(0.22);
      expect(settings.glitchEnabled).toBe(true);
      expect(settings.aberrationStrength).toBe(0.003);
      expect(settings.barrelDistortion).toBe(0.8);
      expect(settings.textureResolution).toBe(1024);
    });
  });
});
