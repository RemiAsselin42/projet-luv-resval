import type { SectionInitializer } from '../types';

// Section tampon dédiée au menu affiché dans l'écran CRT.
const initMenuSection: SectionInitializer = () => {
  return {
    update: () => {
      return;
    },
    dispose: () => {
      return;
    },
  };
};

export default initMenuSection;
