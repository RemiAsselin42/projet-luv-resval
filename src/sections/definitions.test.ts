import { describe, expect, it } from 'vitest';
import { crtMenuItems, crtMenuSectionIds, sections, sectionLoaders } from './definitions';

describe('sections definitions', () => {
  it('keeps CRT menu labels and section ids aligned', () => {
    expect(crtMenuItems.length).toBe(crtMenuSectionIds.length);
    expect(crtMenuItems.length).toBeGreaterThan(0);
  });

  it('does not expose hub-central in CRT jump targets', () => {
    expect(crtMenuSectionIds).not.toContain('hub-central');
  });

  it('contains unique section ids', () => {
    const ids = sections.map((section) => section.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('excludes spacer sections from sectionLoaders', () => {
    const spacerIds = sections
      .filter((s) => s.type === 'spacer')
      .map((s) => s.id);

    expect(spacerIds.length).toBeGreaterThan(0);

    const loaderIds = sectionLoaders.map((l) => l.id);
    spacerIds.forEach((id) => {
      expect(loaderIds).not.toContain(id);
    });
  });

  it('includes all non-spacer, non-hidden sections in sectionLoaders', () => {
    const nonSpacerVisibleIds = sections
      .filter((s) => s.type !== 'spacer' && !s.hidden)
      .map((s) => s.id);

    const loaderIds = sectionLoaders.map((l) => l.id);
    nonSpacerVisibleIds.forEach((id) => {
      expect(loaderIds).toContain(id);
    });
  });

  it('excludes hidden sections from sectionLoaders', () => {
    const hiddenIds = sections
      .filter((s) => s.hidden)
      .map((s) => s.id);

    const loaderIds = sectionLoaders.map((l) => l.id);
    hiddenIds.forEach((id) => {
      expect(loaderIds).not.toContain(id);
    });
  });
});
