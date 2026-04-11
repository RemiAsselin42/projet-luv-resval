import { describe, it, expect, afterEach } from 'vitest';
import { getSectionDataSelector, querySectionElement } from './dom';

describe('getSectionDataSelector', () => {
  it('returns the correct CSS attribute selector', () => {
    expect(getSectionDataSelector('hero')).toBe('[data-section="hero"]');
  });

  it('handles hyphenated section ids', () => {
    expect(getSectionDataSelector('hub-central')).toBe('[data-section="hub-central"]');
    expect(getSectionDataSelector('crash-outro')).toBe('[data-section="crash-outro"]');
  });

  it('wraps the id in double quotes inside the selector', () => {
    const selector = getSectionDataSelector('reliques');
    expect(selector).toContain('"reliques"');
  });
});

describe('querySectionElement', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('returns the matching element when present in the DOM', () => {
    const el = document.createElement('div');
    el.setAttribute('data-section', 'hero');
    document.body.appendChild(el);

    expect(querySectionElement('hero')).toBe(el);
  });

  it('returns null when the element is absent from the DOM', () => {
    expect(querySectionElement('non-existent-section')).toBeNull();
  });

  it('returns null when a different section id is present', () => {
    const el = document.createElement('div');
    el.setAttribute('data-section', 'reliques');
    document.body.appendChild(el);

    expect(querySectionElement('hero')).toBeNull();
  });

  it('returns the first matching element when multiple exist', () => {
    const first = document.createElement('div');
    first.setAttribute('data-section', 'hero');
    const second = document.createElement('div');
    second.setAttribute('data-section', 'hero');
    document.body.appendChild(first);
    document.body.appendChild(second);

    expect(querySectionElement('hero')).toBe(first);
  });

  it('works with different HTML element types', () => {
    const section = document.createElement('section');
    section.setAttribute('data-section', 'reliques');
    document.body.appendChild(section);

    expect(querySectionElement('reliques')).toBe(section);
  });
});
