import './style.scss';
import { addDefaultLights } from './core/lights';
import { createThreeViewport, getRecommendedPixelRatio } from './core/scene';
import { createRenderPipeline } from './core/postprocessing';
import { createScrollManager } from './core/scrollManager';
import { createAssetLoader } from './core/assetLoader';
import { createAudioManager } from './audio/audioManager';
import { createSectionManager } from './sections/sectionManager';
import { sectionLoaders } from './sections/registry';
import { renderSectionsLayout } from './sections/dom';

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
const sectionManager = createSectionManager({
  scene,
  camera,
  renderer,
  canvasContainer,
  scrollManager,
  assetLoader,
  audioManager,
});

const onKeydown = (e: KeyboardEvent): void => {
  if (e.key === 'm' || e.key === 'M') audioManager.toggleMute();
};

window.addEventListener('keydown', onKeydown);

void sectionManager
  .initialize(sectionLoaders)
  .catch((error: unknown) => {
    console.error("Échec de l'initialisation des sections.", error);
  })
  .finally(() => {
    scrollManager.refresh();
  });

let animationFrameId: number | null = null;
let lastFrameTime = window.performance.now();

const renderLoop = (time: number): void => {
  const deltaSeconds = (time - lastFrameTime) / 1000;
  lastFrameTime = time;

  scrollManager.update(time);
  sectionManager.update(deltaSeconds, time / 1000);

  renderPipeline.render();
  animationFrameId = window.requestAnimationFrame(renderLoop);
};

animationFrameId = window.requestAnimationFrame(renderLoop);

const onResize = (): void => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  renderer.setPixelRatio(getRecommendedPixelRatio());
};

window.addEventListener('resize', onResize);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (animationFrameId !== null) {
      window.cancelAnimationFrame(animationFrameId);
    }

    sectionManager.dispose();
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
