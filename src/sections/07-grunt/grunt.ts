import type { SectionInitializer } from '../types';

const initGruntSection: SectionInitializer = (_context) => {
  const sectionElement = document.querySelector('[data-section="grunt"]');

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

export default initGruntSection;
