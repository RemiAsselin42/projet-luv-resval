// Point d'entrée de l'application.
// Ce fichier démarre tout : il crée la scène 3D, branche l'audio, configure le scroll,
// affiche l'écran de chargement, puis initialise chaque section du site dans l'ordre.

import './style.scss';
import { addDefaultLights } from './core/lights';
import { createThreeViewport, getRecommendedPixelRatio } from './core/scene';
import { createRenderPipeline } from './core/postprocessing';
import { createScrollManager } from './core/scrollManager';
import { createAssetLoader } from './core/assetLoader';
import { createAudioManager } from './audio/audioManager';
import { createSectionManager } from './sections/sectionManager';
import type { SectionManager } from './sections/sectionManager';
import { sectionLoaders } from './sections/registry';
import { renderSectionsLayout } from './sections/dom';
import { createLoadingScreen } from './loader/loadingScreen';
import { createCrtManager } from './crt/crtManager';
import type { CrtManager } from './crt/crtManager';
import { createCrtZParallax } from './crt/crtZParallax';
import type { CrtZParallax } from './crt/crtZParallax';
import { getSectionSelector, SECTION_IDS } from './sections/definitions';
import { detectGpuTier, getShaderComplexity } from './core/gpuCapabilities';

const canvasContainer = document.getElementById('canvas-container');
const sectionsRoot = document.getElementById('experience-sections');

if (!canvasContainer) {
  throw new Error('Conteneur #canvas-container introuvable.');
}

if (!sectionsRoot) {
  throw new Error('Conteneur #experience-sections introuvable.');
}

const sectionDom = renderSectionsLayout(sectionsRoot);

const { scene, camera, renderer } = createThreeViewport(canvasContainer);
addDefaultLights(scene);
const renderPipeline = createRenderPipeline(renderer, scene, camera);
const scrollManager = createScrollManager();
sectionDom.getAllElements().forEach((el) => scrollManager.registerSection(el));
const assetLoader = createAssetLoader();
const audioManager = createAudioManager();

let animationFrameId: number | null = null;
let lastFrameTime = window.performance.now();
let sectionManager: SectionManager | null = null;
let sectionManagerActive = false;
let crtManager: CrtManager | null = null;
let crtZParallax: CrtZParallax | null = null;

const init = async (): Promise<void> => {
  // ── CRT Manager (persistant tout le long du site) ─────────────────────────
  const gpuTier = detectGpuTier();
  const shaderSettings = getShaderComplexity(gpuTier);
  crtManager = await createCrtManager(scene, 16 / 9, shaderSettings.textureResolution);

  // ── Parallaxes Z de la TV CRT (centralisées) ──────────────────────────────
  const heroEl = document.querySelector(getSectionSelector(SECTION_IDS.HERO));
  const mpcEl  = document.querySelector(getSectionSelector(SECTION_IDS.MPC));
  if (heroEl && mpcEl) {
    crtZParallax = createCrtZParallax(heroEl, mpcEl, crtManager.mesh);
  }

  // ── Phase loading indépendante ─────────────────────────────────────────────
  const loadingScreen = await createLoadingScreen(
    crtManager,
    camera,
    renderer,
    scrollManager,
    audioManager,
  );

  // ── Pré-initialiser les sections pendant le loading ────────────────────────
  const { menuPreview } = loadingScreen.getResources();
  sectionsRoot.style.visibility = 'hidden';

  sectionManager = createSectionManager({
    scene,
    camera,
    renderer,
    canvasContainer,
    scrollManager,
    assetLoader,
    audioManager,
    crtManager,
    extras: { menuPreview },
  });

  // Hero et menu sont exclus du pre-init : leurs interactions CRT (clic/hover)
  // ne doivent pas être actives pendant l'écran de loading (bouton PLAY).
  const initPromise = sectionManager.initialize(
    sectionLoaders.filter((l) => l.id !== 'hero' && l.id !== 'menu'),
  );

  // ── Render loop (démarre dès que le CRT est prêt) ──────────────────────────
  const renderLoop = (time: number): void => {
    // Limité à 100 ms pour éviter les sauts de physique/animation après un onglet inactif.
    const deltaSeconds = Math.min((time - lastFrameTime) / 1000, 0.1);
    lastFrameTime = time;

    loadingScreen.update(deltaSeconds, time / 1000);
    scrollManager.update(time);
    // crtManager.update() est centralisé ici — les sections ne doivent PAS l'appeler.
    // Cela évite la double mise à jour de uTime si deux sections (hero + crash outro) sont
    // actives simultanément pendant une transition scroll.
    crtManager?.update(time / 1000);
    if (sectionManagerActive) sectionManager?.update(deltaSeconds, time / 1000);

    renderPipeline.render();
    animationFrameId = window.requestAnimationFrame(renderLoop);
  };

  animationFrameId = window.requestAnimationFrame(renderLoop);

  // ── Resize global (actif dès le démarrage, avant le clic PLAY) ────────────
  const onResize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    renderer.setPixelRatio(getRecommendedPixelRatio());
    crtManager?.fitToViewport(camera);
  };
  window.addEventListener('resize', onResize);

  // ── Attendre le clic PLAY + fin d'initialisation des sections ─────────────
  try {
    await Promise.all([loadingScreen.waitForPlay(), initPromise]);
  } finally {
    // Garantit le nettoyage du loading screen et la restauration de la visibilité
    // même si waitForPlay() ou initPromise rejette (ex. : erreur réseau sur un GLB).
    loadingScreen.dispose();
    sectionsRoot.style.visibility = '';
  }

  // ── Initialiser hero puis activer le sectionManager ───────────────────────
  await sectionManager.initialize(sectionLoaders);
  sectionManagerActive = true;
  scrollManager.refresh();

  const onKeydown = (e: KeyboardEvent): void => {
    if ((e.key === 'm' || e.key === 'M') && !e.repeat) audioManager.toggleMute();
  };
  window.addEventListener('keydown', onKeydown);

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
      sectionManagerActive = false;
      sectionManager?.dispose();
      crtZParallax?.dispose();
      sectionDom.dispose();
      scrollManager.dispose();
      assetLoader.dispose();
      audioManager.dispose();
      crtManager?.dispose();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKeydown);
      renderPipeline.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    });
  }
};

void init().catch((error: unknown) => {
  console.error("Échec de l'initialisation.", error);
});
