// Construit et insère les éléments HTML des sections dans la page.
// Chaque section visible du site (hero, MPC, eclipse...) obtient ici son bloc <section>
// avec son titre, ses attributs d'accessibilité et sa hauteur de scroll.

import type { SectionDefinition, SectionId } from './definitions';
import { visibleSections } from './definitions';

const createSectionContent = (section: SectionDefinition): HTMLElement => {
  const content = document.createElement('div');
  content.className = 'section-content';

  const headingTag = section.headingTag ?? 'h2';
  const heading = document.createElement(headingTag);
  heading.id = `${section.id}-title`;
  heading.textContent = section.heading;

  if (section.screenReaderOnlyHeading) {
    heading.classList.add('sr-only');
  }

  content.appendChild(heading);

  if (section.description) {
    const description = document.createElement('p');
    description.textContent = section.description;
    content.appendChild(description);
  }

  return content;
};

const createSectionElement = (section: SectionDefinition): HTMLElement => {
  const element = document.createElement('section');
  element.id = section.id;
  element.className = 'experience-section';
  element.dataset.section = section.id;
  element.setAttribute('aria-labelledby', `${section.id}-title`);

  if (section.scrollHeight) {
    element.style.setProperty('--section-min-height', section.scrollHeight);
  }

  if (section.interactionMode === 'none') {
    element.dataset.interaction = 'none';
  }

  element.appendChild(createSectionContent(section));

  return element;
};

export interface SectionDomManager {
  renderAll(root: HTMLElement): void;
  getElement(sectionId: SectionId): HTMLElement | null;
  getAllElements(): HTMLElement[];
  dispose(): void;
}

export const createSectionDomManager = (
  definitions: readonly SectionDefinition[],
): SectionDomManager => {
  const elements = new Map<SectionId, HTMLElement>();

  return {
    renderAll(root) {
      root.innerHTML = '';
      for (const def of definitions) {
        const el = createSectionElement(def);
        elements.set(def.id, el);
        root.appendChild(el);
      }
    },
    getElement(sectionId) {
      return elements.get(sectionId) ?? null;
    },
    getAllElements() {
      return Array.from(elements.values());
    },
    dispose() {
      elements.forEach((el) => el.remove());
      elements.clear();
    },
  };
};

/** Convenience wrapper — creates a manager with the default section definitions, renders, and returns it. */
export const renderSectionsLayout = (root: HTMLElement): SectionDomManager => {
  const manager = createSectionDomManager(visibleSections);
  manager.renderAll(root);
  return manager;
};
