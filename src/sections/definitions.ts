// Liste officielle de toutes les sections du site (hero, MPC, crash outro...).
// Chaque section y est décrite : son titre, son identifiant, si elle est visible,
// si elle apparaît dans le menu CRT, et comment charger son code JavaScript.
// C'est ici qu'on ajoute ou désactive une section pour tout le projet.

import type { SectionInitializer, SectionLoader } from './types';

export type SectionId =
  | 'hero'
  | 'hub-central'
  | 'reliques'
  | 'oeil-big-brother'
  | 'mpc'
  | 'crash-outro';

export interface SectionDefinition {
  id: SectionId;
  heading: string;
  description?: string;
  headingTag?: 'h1' | 'h2';
  screenReaderOnlyHeading?: boolean;
  scrollHeight?: string;
  interactionMode?: 'auto' | 'none';
  /**
   * Section masquée : quand `hidden: true`, la section est complètement ignorée au démarrage.
   * Elle n'est pas injectée dans le DOM, n'apparaît pas dans le menu CRT,
   * et son code JavaScript n'est jamais chargé. Utilisé pour les sections en cours de développement.
   */
  hidden?: boolean;
  includeInCrtMenu?: boolean;
  crtMenuLabel?: string;
  /** Sections sans lifecycle JavaScript (ex. : spacers de scroll) omettent ce champ. */
  load?: () => Promise<SectionInitializer>;
  /** Une section spacer réserve de la hauteur de scroll mais n'a pas de lifecycle JS. Valeur par défaut : 'section'. */
  type?: 'section' | 'spacer';
}

const sectionDefinitions = [
  {
    id: 'hero',
    heading: 'Luv Resval',
    headingTag: 'h1',
    screenReaderOnlyHeading: true,
    includeInCrtMenu: false,
    load: async () => (await import('./01-hero/hero')).initHeroSection,
  },
  {
    id: 'hub-central',
    heading: 'Le Hub Central',
    screenReaderOnlyHeading: true,
    scrollHeight: 'clamp(200vh, 300vh, 400vh)',
    interactionMode: 'none',
    includeInCrtMenu: false,
    type: 'spacer',
  },
  {
    id: 'reliques',
    heading: 'Les Reliques',
    screenReaderOnlyHeading: true,
    hidden: true,
    includeInCrtMenu: false,
    load: async () => (await import('./02-les-reliques/reliques')).default,
  },
  {
    id: 'oeil-big-brother',
    heading: "Section 2 - L'Oeil de Big Brother",
    description:
      'Transition dystopique, visage geant et parallax de levee de tete au scroll.',
    hidden: true,
    includeInCrtMenu: false,
    load: async () =>
      (await import('./03-oeil-big-brother/bigBrother')).default,
  },
  {
    id: 'mpc',
    heading: 'Section 3 - La MPC',
    screenReaderOnlyHeading: true,
    includeInCrtMenu: true,
    crtMenuLabel: 'SECTION MPC',
    load: async () => (await import('./04-mpc/mpc')).default,
  },
  {
    id: 'crash-outro',
    heading: 'Section 05 - Crash Outro',
    screenReaderOnlyHeading: true,
    includeInCrtMenu: true,
    crtMenuLabel: 'CRASH OUTRO',
    load: async () => (await import('./05-crash-outro/crashOutro')).default,
  },
] as const satisfies readonly SectionDefinition[];

export const sections: SectionDefinition[] = [...sectionDefinitions];

/**
 * Identifiants canoniques des sections — utilisés pour les requêtes DOM,
 * la navigation au scroll et le scroll manager.
 *
*   HERO, HUB_CENTRAL, RELIQUES, BIG_BROTHER, MPC, CRASH_OUTRO
 */
export const SECTION_IDS = {
  // ── Noms canoniques — correspondent aux attributs data-section dans le HTML ──
  HERO: 'hero',
  HUB_CENTRAL: 'hub-central',
  RELIQUES: 'reliques',
  BIG_BROTHER: 'oeil-big-brother',
  MPC: 'mpc',
  CRASH_OUTRO: 'crash-outro',

} as const;

type LoadableSection = SectionDefinition & { load: () => Promise<SectionInitializer> };

/** Sections visibles (exclut les sections hidden). */
export const visibleSections: SectionDefinition[] = sections.filter((s) => !s.hidden);

const isLoadable = (s: SectionDefinition): s is LoadableSection =>
  s.type !== 'spacer' && s.load !== undefined && !s.hidden;

export const sectionLoaders: SectionLoader[] = sections
  .filter(isLoadable)
  .map(({ id, load }) => ({ id, load }));

export const crtMenuItems = visibleSections
  .filter((section) => section.includeInCrtMenu)
  .map((section) => section.crtMenuLabel ?? section.heading.toUpperCase());

// Mapping des indices du menu CRT vers les IDs de section
export const crtMenuSectionIds = visibleSections
  .filter((section) => section.includeInCrtMenu)
  .map((section) => section.id);

export const getSectionSelector = (id: SectionId): string =>
  `[data-section="${id}"]`;
