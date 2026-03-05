import type { SectionInitializer } from '../types';

const initBigBrotherSection: SectionInitializer = (_context) => {
  const sectionElement = document.querySelector('[data-section="big-brother"]');

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

export default initBigBrotherSection;
