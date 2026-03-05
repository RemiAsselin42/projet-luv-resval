import type { SectionLoader } from './types';

export const sectionLoaders: SectionLoader[] = [
  {
    id: 'hero',
    load: async () => (await import('./01-hero/hero')).default,
  },
  {
    id: 'face-vader',
    load: async () => (await import('./02-face-vader/faceVader')).default,
  },
  {
    id: 'thematic-objects',
    load: async () => (await import('./03-thematic-objects/thematicObjects')).default,
  },
  {
    id: 'big-brother',
    load: async () => (await import('./04-big-brother/bigBrother')).default,
  },
  {
    id: 'mpc-beatmaker',
    load: async () => (await import('./05-mpc-beatmaker/beatmaker')).default,
  },
  {
    id: 'star-wars-crawl',
    load: async () => (await import('./06-star-wars-crawl/crawl')).default,
  },
  {
    id: 'grunt',
    load: async () => (await import('./07-grunt/grunt')).default,
  },
];
