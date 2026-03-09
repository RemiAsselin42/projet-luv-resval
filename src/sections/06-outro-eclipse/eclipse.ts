import type { SectionInitializer } from '../types';
import { getSectionSelector, SECTION_IDS } from '../definitions';

const initGruntSection: SectionInitializer = (_context) => {
  const sectionElement = document.querySelector(getSectionSelector(SECTION_IDS.GRUNT));

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
