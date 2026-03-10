import * as THREE from 'three';
import { CRT_MENU_CONFIG, CRT_TITLE_CONFIG, CRT_LOADER_CONFIG, getCrtMenuStartY } from './crtConfig';

// ─── Font Preloading ────────────────────────────────────────────
// Ensures fonts are loaded before drawing on canvas to prevent fallback rendering
const preloadFonts = async (): Promise<void> => {
  const fontsToLoad = [
    new FontFace('Silvermist-Italic', 'url(/src/assets/fonts/Silvermist-Italic.otf)', {
      weight: 'normal',
      style: 'italic',
    }),
    new FontFace('Silvermist-Regular', 'url(/src/assets/fonts/Silvermist-Regular.otf)', {
      weight: 'normal',
      style: 'normal',
    }),
    new FontFace('Futura-CondensedExtraBold', 'url(/src/assets/fonts/Futura-CondensedExtraBold.otf)', {
      weight: '800',
      style: 'normal',
    }),
    new FontFace('Futura-Medium', 'url(/src/assets/fonts/Futura-Medium.otf)', {
      weight: '500',
      style: 'normal',
    }),
  ];

  const loadedFonts = await Promise.all(fontsToLoad.map((font) => font.load()));
  loadedFonts.forEach((font) => document.fonts.add(font));
  // eslint-disable-next-line no-console
  console.debug('CRT fonts preloaded successfully');
};

let fontsPreloaded = false;
let fontPreloadPromise: Promise<void> | null = null;
const ensureFontsLoaded = async (): Promise<void> => {
  if (fontsPreloaded) return;

  if (!fontPreloadPromise) {
    fontPreloadPromise = preloadFonts()
      .then(() => {
        fontsPreloaded = true;
      })
      .catch((error) => {
        // Allow retry on the next call if preload fails.
        fontPreloadPromise = null;
        throw error;
      });
  }

  await fontPreloadPromise;
};

// ─── Vertex Shader ──────────────────────────────────────────────
// Passe les UV au fragment shader et applique la projection standard.
const vertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// ─── Fragment Shader ────────────────────────────────────────────
// Simule un écran CRT : barrel distortion, scanlines, bruit,
// aberration chromatique, vignette, phosphor glow et power-on.
const fragmentShader = /* glsl */ `
  precision highp float;

  uniform sampler2D uTexture;
  uniform float uTime;
  uniform float uPowerOn;       // 0 → 1 : animation d'allumage
  uniform float uFade;          // 1 → 0 : fondu de sortie
  uniform vec2  uResolution;

  varying vec2 vUv;

  // ── Bruit pseudo-aléatoire (Hash without Sine - David Hoskins) ──
  // Plus stable que sin() sur tous les GPU
  float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * .1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  // ── Barrel distortion (écran bombé) ───────────────────────────
  vec2 barrelDistortion(vec2 uv, float strength) {
    vec2 centered = uv - 0.5;
    float r2 = dot(centered, centered);
    float distortion = 1.0 + r2 * strength;
    return centered * distortion + 0.5;
  }

  void main() {
    // --- Power-on : effet d'allumage progressif ---
    // Phase 1 (0→0.3) : ligne horizontale blanche qui s'étend
    // Phase 2 (0.3→1.0) : l'image apparaît progressivement
    float linePhase  = smoothstep(0.0, 0.3, uPowerOn);
    float imagePhase = smoothstep(0.3, 1.0, uPowerOn);

    // Ligne horizontale lumineuse pendant l'allumage
    float lineWidth = mix(0.002, 1.0, linePhase);
    float lineGlow  = exp(-abs(vUv.y - 0.5) / max(lineWidth * 0.15, 0.001));

    if (uPowerOn < 0.3) {
      vec3 lineColor = vec3(0.7, 0.85, 1.0) * lineGlow * linePhase;
      gl_FragColor = vec4(lineColor, lineGlow * linePhase);
      return;
    }

    // --- Distorsion en barillet (écran bombé) ---
    vec2 uv = barrelDistortion(vUv, 0.8);

    // Bordures noires hors de l'écran distordu
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
      return;
    }

    // --- Aberration chromatique ---
    float aberration = 0.0015;

    // --- Glitch Effect (bandes horizontales qui se déplacent) ---
    float glitchTime = uTime * 1.6;
    float glitchLine = floor(uv.y * 12.0); // 12 bandes horizontales
    float glitchNoise = hash(vec2(glitchLine, floor(glitchTime * 2.0)));

    // Probabilité de glitch par bande (rare mais visible)
    float glitchTrigger = step(0.980, glitchNoise);

    // Déplacement horizontal aléatoire des bandes affectées
    float glitchOffset = (hash(vec2(glitchLine, floor(glitchTime * 10.0))) - 0.5) * 0.15 * glitchTrigger;
    vec2 glitchedUv = vec2(uv.x + glitchOffset, uv.y);

    // Clamp pour éviter les débordements
    glitchedUv.x = fract(glitchedUv.x);

    // Séparation RGB exacerbée sur les zones glitchées
    float glitchAberration = aberration + glitchTrigger * 0.008;
    // Drift horizontal subtil de l'aberration chromatique
    float chromaDrift = sin(uTime * 1.8) * 0.001;
    float dynamicAberration = glitchAberration + chromaDrift;

    float r = texture2D(uTexture, glitchedUv + vec2( dynamicAberration, 0.0)).r;
    float g = texture2D(uTexture, glitchedUv).g;
    float b = texture2D(uTexture, glitchedUv + vec2(-dynamicAberration, 0.0)).b;
    vec3 color = vec3(r, g, b);

    // Ajouter du bruit blanc sur les bandes glitchées
    color += glitchTrigger * 0.2 * hash(uv * uResolution + glitchTime * 500.0);

    // --- Scanlines (fréquence virtuelle fixe pour look rétro) ---
    // Résolution virtuelle SD : 480 lignes pour un effet visible même en 4K
    float virtualLines = 480.0;
    float scanline = sin(uv.y * virtualLines * 3.14159) * 0.5 + 0.5;
    scanline = mix(1.0, scanline, 0.22);
    color *= scanline;

    // --- Phosphor RGB sub-pixels ---
    float pixelX = mod(uv.x * uResolution.x, 3.0);
    vec3 phosphor = vec3(
      smoothstep(0.0, 1.0, pixelX),
      smoothstep(1.0, 2.0, pixelX),
      smoothstep(2.0, 3.0, pixelX)
    );
    color *= mix(vec3(1.0), phosphor, 0.08);

    // --- Bruit / grain / neige ---
    float noise = hash(uv * uResolution + uTime * 1000.0);
    // Neige : petits points blancs aléatoires
    float snow = step(0.985, noise) * 0.6;
    // Grain analogique fin
    float grain = (noise - 0.5) * 0.08;
    color += grain + snow;

    // --- Flicker léger (scintillement CRT) ---
    float flicker = 1.0 - 0.02 * sin(uTime * 8.0) * sin(uTime * 13.0 + 2.0);
    color *= flicker;

    // --- Vignette (assombrissement des bords) ---
    vec2 vignetteUv = vUv - 0.5;
    float vignette = 1.0 - dot(vignetteUv, vignetteUv) * 1.8;
    vignette = clamp(vignette, 0.0, 1.0);
    color *= vignette;

    // --- Bezel Shadow (ombre interne du cadre CRT) ---
    // Simule la profondeur du tube sous le plastique
    vec2 bezelUv = abs(vUv - 0.5) * 2.0;
    float bezelDist = max(bezelUv.x, bezelUv.y);
    float bezelShadow = smoothstep(0.88, 1.0, bezelDist);
    color *= 1.0 - bezelShadow * 0.5;

    // --- Lueur de fond CRT (bleu foncé très subtil) ---
    vec3 crtGlow = vec3(0.01, 0.02, 0.04);
    color += crtGlow;

    // --- Application du power-on ---
    // Révélation progressive depuis le centre
    float revealY = abs(vUv.y - 0.5);
    float reveal = smoothstep(imagePhase * 0.6, imagePhase * 0.5, revealY);
    color *= reveal;

    // Résidu de la ligne d'allumage pendant la transition
    float residualLine = exp(-abs(vUv.y - 0.5) / 0.02) * (1.0 - imagePhase) * 0.5;
    color += vec3(0.7, 0.85, 1.0) * residualLine;

    gl_FragColor = vec4(color, uFade);
  }
`;

// ─── Texture canvas « LUV RESVAL » ─────────────────────────────
const createTextCanvasTexture = (
  text: string,
  width: number,
  height: number,
): {
  texture: THREE.CanvasTexture;
  draw: (titleProgress: number, menuOpacity: number, hoverIndex: number, loadingProgress: number) => void;
  dispose: () => void;
} => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  // Dirty flag optimization: only redraw if values changed significantly
  let lastTitleProgress = -1;
  let lastMenuOpacity = -1;
  let lastHoverIndex = -2;
  let lastTextScale = -1;
  let lastLoadingProgress = -1;

  const clamp = (value: number, min: number, max: number): number => {
    return Math.min(Math.max(value, min), max);
  };

  const draw = (titleProgress: number, menuOpacity: number, hoverIndex: number, loadingProgress: number): void => {
    const clampedTitleProgress = Math.min(Math.max(titleProgress, 0), 1);
    const clampedMenuOpacity = Math.min(Math.max(menuOpacity, 0), 1);
    const clampedLoadingProgress = Math.min(Math.max(loadingProgress, 0), 1);
    // Échelle de texte basée sur la hauteur CSS du viewport.
    // Objectif: éviter un texte visuellement trop petit sur les écrans 2K/Retina.
    const textScale = clamp(window.innerHeight / 1080, 0.9, 1.3);

    // Skip redraw if nothing changed significantly.
    // On compare loadingProgress brut (pas clampé) pour détecter la sentinelle > 1.
    if (
      Math.abs(clampedTitleProgress - lastTitleProgress) < 0.001 &&
      Math.abs(clampedMenuOpacity - lastMenuOpacity) < 0.001 &&
      hoverIndex === lastHoverIndex &&
      Math.abs(textScale - lastTextScale) < 0.001 &&
      Math.abs(loadingProgress - lastLoadingProgress) < 0.001
    ) {
      return;
    }

    lastTitleProgress = clampedTitleProgress;
    lastMenuOpacity = clampedMenuOpacity;
    lastHoverIndex = hoverIndex;
    lastTextScale = textScale;
    lastLoadingProgress = loadingProgress;

    // Fond noir
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Fondu croisé loader → héro : 0-1 = loader seul, 1-2 = transition (easeInOutSine), ≥2 = héro seul.
    const transitionBlend = Math.min(Math.max(loadingProgress - 1, 0), 1);
    const easedBlend = -(Math.cos(Math.PI * transitionBlend) - 1) / 2;
    const loaderOpacity = loadingProgress <= 1 ? 1 : 1 - easedBlend;
    const heroOpacity = loadingProgress <= 1 ? 0 : easedBlend;

    // ── Écran de chargement ───────────────────────────────────────
    if (loaderOpacity > 0.001) {
      ctx.globalAlpha = loaderOpacity;
      const panelWidth = Math.round(width * CRT_LOADER_CONFIG.PANEL_WIDTH_RATIO);
      const panelHeight = Math.round(Math.max(CRT_LOADER_CONFIG.PANEL_HEIGHT_MIN_PX, height * CRT_LOADER_CONFIG.PANEL_HEIGHT_RATIO));
      const panelX = Math.round((width - panelWidth) * 0.5);
      const panelY = Math.round(height * CRT_LOADER_CONFIG.PANEL_Y_RATIO);
      const fillWidth = Math.round((panelWidth - 6) * clampedLoadingProgress);

      // Texte de chargement
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const loadingLabelSize = Math.max(16, Math.round(20 * textScale));
      ctx.font = `500 ${loadingLabelSize}px Futura-Medium`;
      ctx.fillStyle = 'rgba(255, 215, 251, 0.95)';
      ctx.fillText('INITIALISATION SIGNAL', width / 2, panelY - Math.round(CRT_LOADER_CONFIG.LABEL_OFFSET_PX * textScale));

      // Cadre de barre
      ctx.fillStyle = 'rgba(206, 141, 255, 0.7)';
      ctx.fillRect(panelX, panelY, panelWidth, 2);
      ctx.fillRect(panelX, panelY + panelHeight - 2, panelWidth, 2);
      ctx.fillRect(panelX, panelY, 2, panelHeight);
      ctx.fillRect(panelX + panelWidth - 2, panelY, 2, panelHeight);

      // Fond interne
      ctx.fillStyle = 'rgba(44, 22, 70, 0.7)';
      ctx.fillRect(panelX + 2, panelY + 2, panelWidth - 4, panelHeight - 4);

      // Remplissage violet/rose
      if (typeof ctx.createLinearGradient === 'function') {
        const gradient = ctx.createLinearGradient(panelX, panelY, panelX + panelWidth, panelY);
        gradient.addColorStop(0, '#7b2dff');
        gradient.addColorStop(0.55, '#d64bff');
        gradient.addColorStop(1, '#ff5fa8');
        ctx.fillStyle = gradient;
      } else {
        ctx.fillStyle = '#d64bff';
      }
      ctx.fillRect(panelX + 3, panelY + 3, fillWidth, panelHeight - 6);

      // Halo du front de progression
      if (fillWidth > 8) {
        ctx.fillStyle = 'rgba(255, 201, 241, 0.45)';
        ctx.fillRect(panelX + 3 + fillWidth - 6, panelY + 3, 6, panelHeight - 6);
      }
    }

    // ── Contenu héro (titre, sous-titre, date) ───────────────────
    ctx.globalAlpha = heroOpacity;
    if (heroOpacity > 0.001) {
      // Titre + sous-titre qui sortent par le haut au scroll
      const fontSize = Math.round(CRT_TITLE_CONFIG.TITLE_FONT_SIZE * textScale);
      const titleY = height * (0.45 - clampedTitleProgress * 0.65);
      ctx.font = `${CRT_TITLE_CONFIG.FONT_WEIGHT} ${fontSize}px ${CRT_TITLE_CONFIG.FONT_FAMILY}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, width / 2, titleY);

      const subtitleSize = Math.round(CRT_TITLE_CONFIG.SUBTITLE_FONT_SIZE * textScale);
      const subtitleY = titleY + fontSize * 0.68;
      ctx.font = `${CRT_TITLE_CONFIG.SUBTITLE_FONT_WEIGHT} ${subtitleSize}px ${CRT_TITLE_CONFIG.SUBTITLE_FONT_FAMILY}`;
      ctx.fillStyle = '#d9d9d9';
      ctx.fillText(CRT_TITLE_CONFIG.SUBTITLE_TEXT, width / 2, subtitleY);

      // Date sous le sous-titre
      const dateSize = Math.max(1, Math.round(CRT_TITLE_CONFIG.DATE_FONT_SIZE * textScale));
      const dateY = subtitleY + subtitleSize * 1;
      ctx.font = `${CRT_TITLE_CONFIG.DATE_FONT_WEIGHT} ${dateSize}px ${CRT_TITLE_CONFIG.DATE_FONT_FAMILY}`;
      ctx.fillStyle = '#d9d9d9';
      ctx.fillText(CRT_TITLE_CONFIG.DATE_TEXT, width / 2, dateY);
    }

    // Menu incruste dans l'ecran CRT (donc affecte par le shader)
    // ctx.globalAlpha est déjà heroOpacity, donc le menu se fond naturellement.
    if (heroOpacity > 0.02 && clampedMenuOpacity > 0.02) {
      const menuX = width * 0.08;
      const menuY = height * getCrtMenuStartY(clampedMenuOpacity);
      const menuLineHeight = Math.round(height * CRT_MENU_CONFIG.LINE_HEIGHT);
      const menuFontSize = Math.max(
        Math.floor(width * CRT_MENU_CONFIG.FONT_SIZE_RATIO * textScale),
        Math.round(18 * textScale),
      );

      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.font = `${CRT_MENU_CONFIG.FONT_WEIGHT} ${menuFontSize}px ${CRT_MENU_CONFIG.FONT_FAMILY}`;

      for (const [index, item] of CRT_MENU_CONFIG.ITEMS.entries()) {
        const lineCenterY = menuY + index * menuLineHeight + menuLineHeight * 0.5;
        const isHovered = index === hoverIndex;
        const prefix = isHovered ? '> ' : '  ';
        const labelMetrics = ctx.measureText(prefix + item);
        const textWidth = labelMetrics.width;
        const textHeight =
          labelMetrics.actualBoundingBoxAscent + labelMetrics.actualBoundingBoxDescent || menuFontSize;
        const prefixWidth = ctx.measureText(prefix).width;
        const itemVerticalOffset = Math.round(CRT_MENU_CONFIG.ITEM_VERTICAL_OFFSET * textScale);

        if (isHovered) {
          ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * clampedMenuOpacity})`;
          const highlightPaddingX = Math.round(CRT_MENU_CONFIG.HIGHLIGHT_PADDING_X * textScale);
          const highlightPaddingY = Math.round(CRT_MENU_CONFIG.HIGHLIGHT_PADDING_Y * textScale);
          const highlightHeight = textHeight + highlightPaddingY * 2;
          ctx.fillRect(
            menuX - highlightPaddingX,
            lineCenterY - highlightHeight / 2,
            textWidth + highlightPaddingX * 2,
            highlightHeight,
          );
          ctx.fillStyle = `rgba(0, 0, 0, ${clampedMenuOpacity})`;
        } else {
          ctx.fillStyle = `rgba(255, 255, 255, ${clampedMenuOpacity})`;
        }

        ctx.fillText(prefix, menuX, lineCenterY);
        ctx.fillText(item, menuX + prefixWidth, lineCenterY + itemVerticalOffset);
      }
    }

    ctx.globalAlpha = 1;
    texture.needsUpdate = true;
  };

  draw(0, 0, -1, 0);

  return {
    texture,
    draw,
    dispose: () => {
      texture.dispose();
    },
  };
};

// ─── Interface publique ─────────────────────────────────────────
interface CrtUniforms {
  [uniform: string]: THREE.IUniform;
  uTexture: THREE.IUniform<THREE.CanvasTexture>;
  uTime: THREE.IUniform<number>;
  uPowerOn: THREE.IUniform<number>;
  uFade: THREE.IUniform<number>;
  uResolution: THREE.IUniform<THREE.Vector2>;
}

export interface CrtScreen {
  mesh: THREE.Mesh;
  uniforms: CrtUniforms;
  update: (elapsedSeconds: number) => void;
  setPowerOn: (value: number) => void;
  setUiProgress: (
    titleProgress: number,
    menuOpacity: number,
    hoverIndex: number,
    loadingProgress?: number,
  ) => void;
  setFade: (value: number) => void;
  dispose: () => void;
}

export const createCrtScreen = async (
  aspectRatio: number = 16 / 9,
  textureResolution: number = 1024,
): Promise<CrtScreen> => {
  // Wait for fonts to be loaded before creating the canvas texture
  try {
    await ensureFontsLoaded();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('Failed to preload CRT fonts, continuing with fallback fonts:', error);
  }
  const texWidth = textureResolution;
  const texHeight = Math.round(texWidth / aspectRatio);
  const textTexture = createTextCanvasTexture('LUV RESVAL', texWidth, texHeight);

  const uniforms: CrtUniforms = {
    uTexture: { value: textTexture.texture },
    uTime: { value: 0.0 },
    uPowerOn: { value: 0.0 },
    uFade: { value: 1.0 },
    uResolution: { value: new THREE.Vector2(texWidth, texHeight) },
  };

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true,
    depthWrite: false,
  });

  // Écran CRT occupant la majorité du viewport
  const planeHeight = 3.5;
  const planeWidth = planeHeight * aspectRatio;
  const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight, 1, 1);
  const mesh = new THREE.Mesh(geometry, material);

  return {
    mesh,
    uniforms,
    update: (elapsedSeconds: number) => {
      uniforms.uTime.value = elapsedSeconds;
    },
    setPowerOn: (value: number) => {
      uniforms.uPowerOn.value = value;
    },
    setUiProgress: (titleProgress: number, menuOpacity: number, hoverIndex: number, loadingProgress = 1) => {
      textTexture.draw(titleProgress, menuOpacity, hoverIndex, loadingProgress);
    },
    setFade: (value: number) => {
      uniforms.uFade.value = value;
    },
    dispose: () => {
      geometry.dispose();
      material.dispose();
      textTexture.dispose();
    },
  };
};
