// Section "L'Œil de Big Brother" — actuellement non développée.
// Réserve un emplacement dans le site mais ne fait rien pour le moment
// (section marquée hidden dans definitions.ts).

import type { SectionInitializer } from '../types';
import { getSectionSelector, SECTION_IDS } from '../definitions';

const initBigBrotherSection: SectionInitializer = (_context) => {
  const sectionElement = document.querySelector(getSectionSelector(SECTION_IDS.BIG_BROTHER));

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
