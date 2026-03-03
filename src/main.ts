import './style.scss';
import { addDefaultLights } from './core/lights';
import { createThreeViewport } from './core/scene';
import { createMpd218ModelComponent } from './components/3d/mpd218Model';
import { createModelRotationController } from './controllers/modelRotationController';

const canvasContainer = document.getElementById('canvas-container');

if (!canvasContainer) {
  throw new Error('Conteneur #canvas-container introuvable.');
}

const { scene, camera, renderer } = createThreeViewport(canvasContainer);
addDefaultLights(scene);

const modelComponent = createMpd218ModelComponent(scene, camera);
const { modelGroup } = modelComponent;
const rotationController = createModelRotationController(canvasContainer, modelGroup);

let animationFrameId: number | null = null;

const renderLoop = (): void => {
  rotationController.update();

  renderer.render(scene, camera);
  animationFrameId = window.requestAnimationFrame(renderLoop);
};

renderLoop();

const onResize = (): void => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
};

window.addEventListener('resize', onResize);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (animationFrameId !== null) {
      window.cancelAnimationFrame(animationFrameId);
    }

    rotationController.dispose();
    window.removeEventListener('resize', onResize);

    modelComponent.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  });
}
