import './style.scss';
import { addDefaultLights } from './core/lights';
import { createThreeViewport, FIXED_CANVAS_ASPECT_RATIO, getFixedCanvasSize } from './core/scene';
import { createRenderPipeline } from './core/postprocessing';
import { createScrollManager } from './core/scrollManager';
import { createAssetLoader } from './core/assetLoader';
import { createSectionManager } from './sections/sectionManager';
import { sectionLoaders } from './sections/registry';

const canvasContainer = document.getElementById('canvas-container');

if (!canvasContainer) {
  throw new Error('Conteneur #canvas-container introuvable.');
}

const { scene, camera, renderer } = createThreeViewport(canvasContainer);
addDefaultLights(scene);
const renderPipeline = createRenderPipeline(renderer, scene, camera);
const scrollManager = createScrollManager();
const assetLoader = createAssetLoader();
const sectionManager = createSectionManager({
  scene,
  camera,
  renderer,
  canvasContainer,
  scrollManager,
  assetLoader,
});

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
  const availableWidth = Math.max(canvasContainer.clientWidth, window.innerWidth);
  const size = getFixedCanvasSize(availableWidth);

  camera.aspect = FIXED_CANVAS_ASPECT_RATIO;
  camera.updateProjectionMatrix();
  renderer.setSize(size.width, size.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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
    window.removeEventListener('resize', onResize);

    renderPipeline.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  });
}
