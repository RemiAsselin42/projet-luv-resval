/**
 * Détection des capacités du GPU pour l'optimisation adaptative des performances.
 * Identifie le niveau du GPU afin d'ajuster la qualité de rendu et d'éviter les ralentissements.
 */

export type GpuTier = 'low' | 'medium' | 'high';

/**
 * Détecte le niveau du GPU d'après les informations du moteur de rendu WebGL.
 * @returns 'low' pour les GPU intégrés/mobiles, 'medium' pour les GPU dédiés basiques, 'high' pour les GPU récents gaming
 */
export const detectGpuTier = (): GpuTier => {
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    if (!gl) return 'low';

    // Duck-typing : permet de rester robuste dans les environnements de test et les runtimes anciens.
    if (typeof (gl as { getExtension?: unknown }).getExtension !== 'function')
      return 'low';
    if (typeof (gl as { getParameter?: unknown }).getParameter !== 'function')
      return 'low';

    const webgl = gl as WebGLRenderingContext;

    const renderer = (webgl.getParameter(webgl.RENDERER) as string).toLowerCase();

    if (!renderer || renderer === 'unknown') {
      // Nom du moteur indisponible : utiliser la taille de texture maximale comme indicateur de repli.
      const MIN_TEXTURE_SIZE_FOR_MEDIUM = 8192;
      const maxTextureSize = webgl.getParameter(
        webgl.MAX_TEXTURE_SIZE,
      ) as number;
      return maxTextureSize >= MIN_TEXTURE_SIZE_FOR_MEDIUM ? 'medium' : 'low';
    }

    // GPU intégrés ou mobiles (niveau bas)
    if (/intel|mali|adreno|powervr|videocore|sgx/i.test(renderer)) {
      return 'low';
    }

    // GPU dédiés récents (niveau haut)
    if (/nvidia|geforce|rtx|gtx|amd|radeon rx/i.test(renderer)) {
      return 'high';
    }

    // GPU inconnu : niveau intermédiaire par défaut
    return 'medium';
  } catch (error) {
    console.warn('Détection GPU échouée :', error);
    return 'low'; // Repli conservateur
  }
};

/**
 * Vérifie si WebGL est disponible dans le navigateur actuel.
 * @returns true si WebGL est supporté, false sinon
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
 * Retourne la complexité de shader recommandée selon le niveau du GPU.
 * @param tier Niveau du GPU détecté
 * @returns Objet de configuration avec les réglages de performance adaptés
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
