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

const canvasContainer = document.getElementById('canvas-container');
const sectionsRoot = document.getElementById('experience-sections');

if (!canvasContainer) {
  throw new Error('Conteneur #canvas-container introuvable.');
}

if (!sectionsRoot) {
  throw new Error('Conteneur #experience-sections introuvable.');
}

renderSectionsLayout(sectionsRoot);

const { scene, camera, renderer } = createThreeViewport(canvasContainer);
addDefaultLights(scene);
const renderPipeline = createRenderPipeline(renderer, scene, camera);
const scrollManager = createScrollManager();
const assetLoader = createAssetLoader();
const audioManager = createAudioManager();

let animationFrameId: number | null = null;
let lastFrameTime = window.performance.now();
let sectionManager: SectionManager | null = null;

const init = async (): Promise<void> => {
  // ── Phase loading indépendante ─────────────────────────────────────────────
  // Le loading screen crée le CRT + menuPreview, lance le preload des GLBs,
  // et bloque jusqu'au clic PLAY.
  const loadingScreen = await createLoadingScreen(
    scene,
    camera,
    renderer,
    scrollManager,
    audioManager,
  );

  // ── Render loop (démarre dès que le CRT est prêt) ──────────────────────────
  const renderLoop = (time: number): void => {
    // Limité à 100 ms pour éviter les sauts de physique/animation après un onglet inactif.
    const deltaSeconds = Math.min((time - lastFrameTime) / 1000, 0.1);
    lastFrameTime = time;

    loadingScreen.update(deltaSeconds, time / 1000);
    scrollManager.update(time);
    sectionManager?.update(deltaSeconds, time / 1000);

    renderPipeline.render();
    animationFrameId = window.requestAnimationFrame(renderLoop);
  };

  animationFrameId = window.requestAnimationFrame(renderLoop);

  // ── Attendre le clic PLAY ──────────────────────────────────────────────────
  const { crt, menuPreview } = await loadingScreen.waitForPlay();
  loadingScreen.dispose();

  // ── Initialiser les sections avec les objets pré-créés ─────────────────────
  sectionManager = createSectionManager({
    scene,
    camera,
    renderer,
    canvasContainer,
    scrollManager,
    assetLoader,
    audioManager,
    extras: { crt, menuPreview },
  });

  await sectionManager.initialize(sectionLoaders);
  scrollManager.refresh();

  // ── Resize global ──────────────────────────────────────────────────────────
  const onResize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    renderer.setPixelRatio(getRecommendedPixelRatio());
  };
  window.addEventListener('resize', onResize);

  const onKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'm' || e.key === 'M') audioManager.toggleMute();
  };
  window.addEventListener('keydown', onKeydown);

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
      sectionManager?.dispose();
      scrollManager.dispose();
      assetLoader.dispose();
      audioManager.dispose();
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
