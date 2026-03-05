import type { SectionInitializer } from '../types';

const initCrawlSection: SectionInitializer = (_context) => {
  const sectionElement = document.querySelector('[data-section="star-wars-crawl"]');

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

export default initCrawlSection;
