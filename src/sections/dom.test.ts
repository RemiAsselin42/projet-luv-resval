import { describe, expect, it } from 'vitest';
import { renderSectionsLayout } from './dom';
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
});
