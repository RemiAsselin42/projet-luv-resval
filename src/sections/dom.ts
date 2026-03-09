import { sections } from './definitions';

const createSectionContent = (section: (typeof sections)[number]): HTMLElement => {
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

const createSectionElement = (section: (typeof sections)[number]): HTMLElement => {
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

export const renderSectionsLayout = (root: HTMLElement): void => {
  root.innerHTML = '';

  sections.forEach((section) => {
    root.appendChild(createSectionElement(section));
  });
};
