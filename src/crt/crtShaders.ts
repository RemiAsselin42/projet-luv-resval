// Code source des shaders GLSL de l'écran CRT.
// Le vertex shader positionne le plan 3D ; le fragment shader crée tous les effets visuels :
// déformation bombée (barrel distortion), scanlines, bruit, aberration chromatique,
// glitch, flou, mosaïque, allumage progressif et vignette.
// Note : le code des shaders est écrit en GLSL (langage de programmation graphique).
// Le GLSL est une convention internationale et ses mots-clés (vec2, uniform, smoothstep…)
// Chaque notion clé est accompagnée d'une explication en français.

// Vertex shader : passe les coordonnées UV au fragment shader et applique la projection standard.
// (Boilerplate Three.js — aucune source externe.)

export const vertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Simule un écran CRT : barrel distortion, scanlines, bruit,
// aberration chromatique, vignette, phosphor glow et power-on.
export const fragmentShader = /* glsl */ `
  precision highp float;

  uniform sampler2D uTexture;
  uniform sampler2D uTexturePrev;
  uniform float uBlend;
  uniform sampler2D uModelTexture;     // preview 3D menu (render target)
  uniform float uModelTextureOpacity;  // 0 = caché, 1 = visible
  uniform vec2  uModelTexelSize;       // 1/width, 1/height du render target
  uniform vec4  uModelRect;            // (x0, y0, x1, y1) en UV distordu
  uniform float uModelColorMode;       // 0 = wireframe blanc, 1 = couleurs réelles
  uniform float uTime;
  uniform float uPowerOn;       // 0 → 1 : animation d'allumage
  uniform float uFade;          // 1 → 0 : fondu de sortie
  uniform vec2  uResolution;
  uniform float uGlitch;        // 0 → 1 : intensité du glitch (0 = comportement hero normal)
  uniform float uBlackout;      // 0 ou 1 : flash écran noir (crash outro uniquement)
  uniform float uShiftX;        // décalage UV horizontal global (crash outro uniquement)
  uniform float uShiftY;        // décalage UV vertical global (crash outro uniquement)
  uniform float uMosaic;        // 0 ou 1 : mosaïque 3×3 (crash outro uniquement)
  uniform float uBlur;          // 0 → 1 : flou du contenu (section MPC)

  varying vec2 vUv;

  // ── Bruit pseudo-aléatoire (Hash without Sine — David Hoskins) ──
  // (génère un nombre aléatoire à partir d'une coordonnée 2D, sans utiliser la fonction sinus)
  // Source : https://www.shadertoy.com/view/4djSRW
  // Plus stable que sin() sur tous les GPU
  float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * .1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  // ── Barrel distortion (déformation en barillet — effet d'écran bombé) ────────
  // Formule classique des shaders CRT : centered * (1 + r² * k) + 0.5
  // Référence : https://www.shadertoy.com/view/XtlSD7
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

    // Décalage global XY (crash outro : flash de déplacement, wrap avec fract)
    uv = fract(uv + vec2(uShiftX, uShiftY));

    // --- Aberration chromatique (amplifiée par uGlitch) ---
    float aberration = 0.0015 + uGlitch * 0.018;

    // --- Glitch Effect (bandes horizontales qui se déplacent) ---
    float glitchTime = uTime * 1.6;
    float glitchLine = floor(uv.y * 12.0); // 12 bandes horizontales
    float glitchNoise = hash(vec2(glitchLine, floor(glitchTime * 2.0)));

    // Probabilité de glitch par bande : uGlitch=0 → rare (hero), uGlitch=1 → fréquent
    float glitchThreshold = 1.0 - uGlitch * 0.55;
    float glitchTrigger = step(glitchThreshold, glitchNoise);

    // Déplacement horizontal aléatoire des bandes affectées (magnitude amplifiée par uGlitch)
    float glitchOffset = (hash(vec2(glitchLine, floor(glitchTime * 10.0))) - 0.5) * (0.15 + uGlitch * 0.5) * glitchTrigger;
    vec2 glitchedUv = vec2(uv.x + glitchOffset, uv.y);

    // Clamp pour éviter les débordements
    glitchedUv.x = fract(glitchedUv.x);

    // Mosaïque 3×3 (crash outro : tiling de la vidéo)
    vec2 sampledUv = mix(glitchedUv, fract(glitchedUv * 3.0), step(0.5, uMosaic));

    // Séparation RGB exacerbée sur les zones glitchées (et par uGlitch)
    float glitchAberration = aberration + glitchTrigger * (0.008 + uGlitch * 0.05);
    // Drift horizontal subtil de l'aberration chromatique
    float chromaDrift = sin(uTime * 1.8) * 0.001;
    float dynamicAberration = glitchAberration + chromaDrift;

    vec3 colorCurr = vec3(
      texture2D(uTexture, sampledUv + vec2( dynamicAberration, 0.0)).r,
      texture2D(uTexture, sampledUv).g,
      texture2D(uTexture, sampledUv + vec2(-dynamicAberration, 0.0)).b
    );
    vec3 colorPrev = vec3(
      texture2D(uTexturePrev, sampledUv + vec2( dynamicAberration, 0.0)).r,
      texture2D(uTexturePrev, sampledUv).g,
      texture2D(uTexturePrev, sampledUv + vec2(-dynamicAberration, 0.0)).b
    );
    vec3 color = mix(colorPrev, colorCurr, uBlend);

    // ── Composite contour 3D (render target) avant les effets CRT ───────────
    // Affiche uniquement une ligne externe adaptative autour de la silhouette
    // projetée du modèle (intérieur transparent), puis applique les effets CRT.
    if (uModelTextureOpacity > 0.0) {
      vec2 inRectStep = step(uModelRect.xy, uv.xy) * step(uv.xy, uModelRect.zw);
      float insideRect = inRectStep.x * inRectStep.y;
      vec2 modelUv = clamp(
        (uv - uModelRect.xy) / max(uModelRect.zw - uModelRect.xy, vec2(0.0001)),
        0.0, 1.0
      );
      vec4 modelSample = texture2D(uModelTexture, modelUv);

      // Contour externe 2D via dilatation de masque (technique morphologique) :
      // maxNeighbor - alpha isole les pixels voisins de la silhouette → liseré externe uniquement.
      vec2 modelTexel = uModelTexelSize;
      float maxNeighbor = 0.0;
      maxNeighbor = max(maxNeighbor, texture2D(uModelTexture, modelUv + vec2( modelTexel.x, 0.0)).a);
      maxNeighbor = max(maxNeighbor, texture2D(uModelTexture, modelUv + vec2(-modelTexel.x, 0.0)).a);
      maxNeighbor = max(maxNeighbor, texture2D(uModelTexture, modelUv + vec2(0.0,  modelTexel.y)).a);
      maxNeighbor = max(maxNeighbor, texture2D(uModelTexture, modelUv + vec2(0.0, -modelTexel.y)).a);
      maxNeighbor = max(maxNeighbor, texture2D(uModelTexture, modelUv + vec2( modelTexel.x,  modelTexel.y)).a);
      maxNeighbor = max(maxNeighbor, texture2D(uModelTexture, modelUv + vec2(-modelTexel.x,  modelTexel.y)).a);
      maxNeighbor = max(maxNeighbor, texture2D(uModelTexture, modelUv + vec2( modelTexel.x, -modelTexel.y)).a);
      maxNeighbor = max(maxNeighbor, texture2D(uModelTexture, modelUv + vec2(-modelTexel.x, -modelTexel.y)).a);

      float outerEdge = clamp(maxNeighbor - modelSample.a, 0.0, 1.0);
      float outline = smoothstep(0.03, 0.25, outerEdge);
      float outlineAlpha = outline * uModelTextureOpacity * insideRect;

      // Lignes internes: détectées depuis le RGB du render target.
      // Le masque silhouette est rendu en noir, donc l'intérieur reste transparent.
      float sampleLuma = max(modelSample.r, max(modelSample.g, modelSample.b));
      float internalLine = smoothstep(0.35, 0.85, sampleLuma);
      float internalLineAlpha = internalLine * modelSample.a * uModelTextureOpacity * insideRect;

      float modelLineAlpha = max(outlineAlpha, internalLineAlpha);

      if (uModelColorMode > 0.5) {
        // Mode couleur (Reliques) : composite le RGB réel du modèle
        float solidAlpha = modelSample.a * uModelTextureOpacity * insideRect;
        color = mix(color, modelSample.rgb, solidAlpha);
        // Contour externe blanc conservé pour la lisibilité
        color = mix(color, vec3(1.0), outlineAlpha);
      } else {
        // Mode wireframe (menu/hero) : lignes blanches uniquement
        color = mix(color, vec3(1.0), modelLineAlpha);
      }
    }

    // Ajouter du bruit blanc sur les bandes glitchées (amplifié par uGlitch)
    color += glitchTrigger * (0.2 + uGlitch * 0.4) * hash(uv * uResolution + glitchTime * 500.0);

    // --- Blur (flou du contenu, utilisé pour la section MPC) ---
    if (uBlur > 0.001) {
      vec2 blurSize = vec2(uBlur * 0.012);
      vec3 blurred = vec3(0.0);
      for (float dx = -1.0; dx <= 1.0; dx += 1.0) {
        for (float dy = -1.0; dy <= 1.0; dy += 1.0) {
          blurred += texture2D(uTexture, sampledUv + vec2(dx, dy) * blurSize).rgb;
        }
      }
      color = mix(color, blurred / 9.0, uBlur);
    }

    // --- Scanlines (fréquence virtuelle fixe pour look rétro) ---
    // Résolution virtuelle SD : 480 lignes pour un effet visible même en 4K
    float virtualLines = 480.0;
    float scanline = sin(uv.y * virtualLines * 3.14159) * 0.5 + 0.5;
    scanline = mix(1.0, scanline, 0.22);
    color *= scanline;

    // --- Phosphor RGB sub-pixels (lueur des sous-pixels rouge/vert/bleu d'un vrai tube cathodique) ---
    float pixelX = mod(uv.x * uResolution.x, 3.0);
    vec3 phosphor = vec3(
      smoothstep(0.0, 1.0, pixelX),
      smoothstep(1.0, 2.0, pixelX),
      smoothstep(2.0, 3.0, pixelX)
    );
    color *= mix(vec3(1.0), phosphor, 0.08);

    // --- Bruit / grain / neige (neige amplifiée par uGlitch) ---
    float noise = hash(uv * uResolution + uTime * 1000.0);
    // Neige : petits points blancs aléatoires (seuil abaissé + intensité montée par uGlitch)
    float snowThreshold = 0.985 - uGlitch * 0.12;
    float snow = step(snowThreshold, noise) * (0.6 + uGlitch * 0.4);
    // Grain analogique fin (légèrement amplifié)
    float grain = (noise - 0.5) * (0.08 + uGlitch * 0.02);
    color += grain + snow;

    // --- Flicker (scintillement CRT, amplifié par uGlitch) ---
    float flickerAmp = 0.02 + uGlitch * 0.08;
    float flicker = 1.0 - flickerAmp * sin(uTime * 8.0) * sin(uTime * 13.0 + 2.0);
    color *= flicker;

    // --- Vignette (assombrissement des bords) ---
    vec2 vignetteUv = vUv - 0.5;
    float vignette = 1.0 - dot(vignetteUv, vignetteUv) * 1.8;
    vignette = clamp(vignette, 0.0, 1.0);
    color *= vignette;

    // --- Bezel Shadow (ombre interne du cadre CRT — simule la profondeur du tube sous le plastique) ---
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

    // Blackout flash (crash outro : écran noir brutal)
    color = mix(color, vec3(0.0), uBlackout);

    gl_FragColor = vec4(color, uFade);
  }
`;
