import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SectionLifecycle } from '../types';

vi.mock('gsap', () => ({
  default: {
    timeline: vi.fn(() => ({
      to: vi.fn().mockReturnThis(),
      kill: vi.fn(),
    })),
  },
}));

import initHeroFallback from './heroFallback';

const buildHeroDom = (): { hero: HTMLElement; content: HTMLElement } => {
  const hero = document.createElement('div');
  hero.setAttribute('data-section', 'hero');
  const content = document.createElement('div');
  content.className = 'section-content';
  hero.appendChild(content);
  document.body.appendChild(hero);
  return { hero, content };
};

describe('initHeroFallback', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('when hero section element is missing', () => {
    it('returns update and dispose without throwing', () => {
      const result = initHeroFallback({} as never) as SectionLifecycle;

      expect(typeof result.update).toBe('function');
      expect(typeof result.dispose).toBe('function');
    });

    it('update() is a no-op and does not throw', () => {
      const { update } = initHeroFallback({} as never) as SectionLifecycle;

      expect(() => update(0, 0)).not.toThrow();
    });

    it('dispose() is a no-op and does not throw', () => {
      const { dispose } = initHeroFallback({} as never) as SectionLifecycle;

      expect(() => dispose()).not.toThrow();
    });
  });

  describe('when hero section element is found', () => {
    it('creates a .hero-fallback-title element', () => {
      buildHeroDom();
      initHeroFallback({} as never) as SectionLifecycle;

      expect(document.querySelector('.hero-fallback-title')).not.toBeNull();
    });

    it('sets title text to "LUV RESVAL"', () => {
      buildHeroDom();
      initHeroFallback({} as never) as SectionLifecycle;

      const title = document.querySelector('.hero-fallback-title');
      expect(title?.textContent).toBe('LUV RESVAL');
    });

    it('appends titleContainer inside .section-content', () => {
      const { content } = buildHeroDom();
      initHeroFallback({} as never) as SectionLifecycle;

      expect(content.querySelector('.hero-fallback-title')).not.toBeNull();
    });

    it('returns update and dispose methods', () => {
      buildHeroDom();
      const result = initHeroFallback({} as never) as SectionLifecycle;

      expect(typeof result.update).toBe('function');
      expect(typeof result.dispose).toBe('function');
    });

    it('update() is a no-op and does not throw', () => {
      buildHeroDom();
      const { update } = initHeroFallback({} as never) as SectionLifecycle;

      expect(() => update(0, 0)).not.toThrow();
    });

    it('dispose() removes titleContainer from DOM', () => {
      buildHeroDom();
      const { dispose } = initHeroFallback({} as never) as SectionLifecycle;

      dispose();

      expect(document.querySelector('.hero-fallback-title')).toBeNull();
    });

    it('dispose() kills the GSAP timeline', async () => {
      const gsapModule = await import('gsap');
      const killSpy = vi.fn();
      (gsapModule.default.timeline as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        to: vi.fn().mockReturnThis(),
        kill: killSpy,
      });

      buildHeroDom();
      const { dispose } = initHeroFallback({} as never) as SectionLifecycle;

      dispose();

      expect(killSpy).toHaveBeenCalledTimes(1);
    });
  });
});
