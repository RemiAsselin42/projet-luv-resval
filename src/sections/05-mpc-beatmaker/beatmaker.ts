import { createMpd218ModelComponent } from '../../components/3d/mpd218Model';
import { createModelRotationController } from '../../controllers/modelRotationController';
import type { SectionInitializer } from '../types';

const initBeatmakerSection: SectionInitializer = (context) => {
  const { scene, camera, canvasContainer } = context;
  const modelComponent = createMpd218ModelComponent(scene, camera);
  const rotationController = createModelRotationController(
    canvasContainer,
    modelComponent.modelGroup,
  );

  const sectionElement = document.querySelector('[data-section="mpc-beatmaker"]');
  if (sectionElement instanceof HTMLElement) {
    sectionElement.dataset.state = 'active-3d';
  }

  return {
    update: () => {
      rotationController.update();
    },
    dispose: () => {
      rotationController.dispose();
      modelComponent.dispose();

      if (sectionElement instanceof HTMLElement) {
        delete sectionElement.dataset.state;
      }
    },
  };
};

export default initBeatmakerSection;
