import type { SectionInitializer } from '../types';
import { getSectionSelector, SECTION_IDS } from '../definitions';

const initThematicObjectsSection: SectionInitializer = (_context) => {
  const sectionElement = document.querySelector(getSectionSelector(SECTION_IDS.THEMATIC_OBJECTS));

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

export default initThematicObjectsSection;
