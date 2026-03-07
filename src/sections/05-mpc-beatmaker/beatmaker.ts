import type { SectionInitializer } from '../types';

const initBeatmakerSection: SectionInitializer = (_context) => {
  const sectionElement = document.querySelector('[data-section="mpc-beatmaker"]');

  if (sectionElement instanceof HTMLElement) {
    sectionElement.dataset.state = 'active';
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

export default initBeatmakerSection;
