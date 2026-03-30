import { describe, expect, it } from 'vitest';
import { renderSectionsLayout, createSectionDomManager } from './dom';
import { sections } from './definitions';

describe('renderSectionsLayout', () => {
  it('renders all configured sections with required attributes', () => {
    const root = document.createElement('main');

    renderSectionsLayout(root);

    const renderedSections = root.querySelectorAll<HTMLElement>('.experience-section[data-section]');
    expect(renderedSections).toHaveLength(sections.length);

    sections.forEach((section) => {
      const element = root.querySelector<HTMLElement>(`[data-section="${section.id}"]`);
      expect(element).not.toBeNull();
      expect(element?.id).toBe(section.id);
      expect(element?.getAttribute('aria-labelledby')).toBe(`${section.id}-title`);

      const heading = root.querySelector<HTMLElement>(`#${section.id}-title`);
      expect(heading?.textContent).toBe(section.heading);

      if (section.scrollHeight) {
        expect(element?.style.getPropertyValue('--section-min-height')).toBe(section.scrollHeight);
      }

      if (section.interactionMode === 'none') {
        expect(element?.dataset.interaction).toBe('none');
      }
    });
  });

  it('returns a SectionDomManager', () => {
    const root = document.createElement('main');
    const manager = renderSectionsLayout(root);

    expect(typeof manager.getElement).toBe('function');
    expect(typeof manager.getAllElements).toBe('function');
    expect(typeof manager.dispose).toBe('function');
  });
});

describe('createSectionDomManager', () => {
  it('getElement returns the correct element by id', () => {
    const root = document.createElement('main');
    const manager = createSectionDomManager(sections);
    manager.renderAll(root);

    const heroEl = manager.getElement('hero');
    expect(heroEl).not.toBeNull();
    expect(heroEl?.dataset.section).toBe('hero');
  });

  it('getElement returns null for unknown id', () => {
    const root = document.createElement('main');
    const manager = createSectionDomManager(sections);
    manager.renderAll(root);

    // @ts-expect-error — testing with invalid id
    expect(manager.getElement('unknown')).toBeNull();
  });

  it('getAllElements returns all section elements in order', () => {
    const root = document.createElement('main');
    const manager = createSectionDomManager(sections);
    manager.renderAll(root);

    const elements = manager.getAllElements();
    expect(elements).toHaveLength(sections.length);
    elements.forEach((el, i) => {
      expect(el.dataset.section).toBe(sections[i]?.id);
    });
  });

  it('dispose removes all elements from the DOM', () => {
    const root = document.createElement('main');
    const manager = createSectionDomManager(sections);
    manager.renderAll(root);

    expect(root.children).toHaveLength(sections.length);

    manager.dispose();

    expect(root.children).toHaveLength(0);
    expect(manager.getAllElements()).toHaveLength(0);
  });
});
