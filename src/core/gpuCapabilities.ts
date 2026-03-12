/**
 * GPU capability detection for adaptive performance optimization.
 * Detects GPU tier to adjust rendering quality and prevent performance issues.
 */

export type GpuTier = 'low' | 'medium' | 'high';

/**
 * Detects the GPU tier based on renderer information.
 * @returns 'low' for integrated/mobile GPUs, 'medium' for basic discrete GPUs, 'high' for modern gaming GPUs
 */
export const detectGpuTier = (): GpuTier => {
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    if (!gl) return 'low';

    // Duck-typing keeps this robust in test environments and older runtimes.
    if (typeof (gl as { getExtension?: unknown }).getExtension !== 'function')
      return 'low';
    if (typeof (gl as { getParameter?: unknown }).getParameter !== 'function')
      return 'low';

    const webgl = gl as WebGLRenderingContext;

    const renderer = (webgl.getParameter(webgl.RENDERER) as string).toLowerCase();

    if (!renderer || renderer === 'unknown') {
      // Renderer name unavailable, use texture size as conservative heuristic.
      const maxTextureSize = webgl.getParameter(
        webgl.MAX_TEXTURE_SIZE,
      ) as number;
      return maxTextureSize >= 8192 ? 'medium' : 'low';
    }

    // Integrated/mobile GPUs (low tier)
    if (/intel|mali|adreno|powervr|videocore|sgx/i.test(renderer)) {
      return 'low';
    }

    // Dedicated modern GPUs (high tier)
    if (/nvidia|geforce|rtx|gtx|amd|radeon rx/i.test(renderer)) {
      return 'high';
    }

    // Default to medium for unknown GPUs
    return 'medium';
  } catch (error) {
    console.warn('GPU detection failed:', error);
    return 'low'; // Conservative fallback
  }
};

/**
 * Checks if WebGL is available in the current browser.
 * @returns true if WebGL is supported, false otherwise
 */
export const hasWebGLSupport = (): boolean => {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    );
  } catch {
    return false;
  }
};

/**
 * Gets recommended shader complexity based on GPU tier.
 * @param tier GPU tier detected
 * @returns Configuration object with performance settings
 */
export const getShaderComplexity = (tier: GpuTier) => {
  switch (tier) {
    case 'low':
      return {
        scanlineIntensity: 0.15,
        glitchEnabled: false,
        aberrationStrength: 0.002,
        barrelDistortion: 0.4,
        textureResolution: 512,
      };
    case 'medium':
      return {
        scanlineIntensity: 0.22,
        glitchEnabled: true,
        aberrationStrength: 0.003,
        barrelDistortion: 0.6,
        textureResolution: 1024,
      };
    case 'high':
    default:
      return {
        scanlineIntensity: 0.22,
        glitchEnabled: true,
        aberrationStrength: 0.003,
        barrelDistortion: 0.8,
        textureResolution: 1024,
      };
  }
};
