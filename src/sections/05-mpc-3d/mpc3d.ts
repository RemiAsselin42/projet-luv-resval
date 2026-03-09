import type { SectionInitializer } from '../types';
import { getSectionSelector, SECTION_IDS } from '../definitions';

const initBeatmakerSection: SectionInitializer = (_context) => {
  const sectionElement = document.querySelector(getSectionSelector(SECTION_IDS.MPC_BEATMAKER));

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
