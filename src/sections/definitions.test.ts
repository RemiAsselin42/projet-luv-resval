import { describe, expect, it } from 'vitest';
import { crtMenuItems, crtMenuSectionIds, sections } from './definitions';

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
});
