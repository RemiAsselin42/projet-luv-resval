import type { SectionInitializer } from '../types';

const initFaceVaderSection: SectionInitializer = (_context) => {
  const sectionElement = document.querySelector('[data-section="face-vader"]');

  if (sectionElement instanceof HTMLElement) {
    sectionElement.dataset.state = 'planned';
  }

  return {
    update: () => {
      return;
    },
    dispose: () => {
      if (sectionElement instanceof HTMLElement) {
        delete sectionElement.dataset.state;
      }
    },
  };
};

export default initFaceVaderSection;
