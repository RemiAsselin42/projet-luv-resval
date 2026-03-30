import type { SectionInitializer, SectionLoader } from './types';

export type SectionId =
  | 'hero'
  | 'hub-central'
  | 'reliques'
  | 'oeil-big-brother'
  | 'mpc'
  | 'outro-eclipse';

export interface SectionDefinition {
  id: SectionId;
  heading: string;
  description?: string;
  headingTag?: 'h1' | 'h2';
  screenReaderOnlyHeading?: boolean;
  scrollHeight?: string;
  interactionMode?: 'auto' | 'none';
  includeInCrtMenu?: boolean;
  crtMenuLabel?: string;
  /** Sections without a loader (e.g. spacers) omit this field. */
  load?: () => Promise<SectionInitializer>;
  /** A spacer section reserves scroll height but has no JS lifecycle. Default: 'section'. */
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
    includeInCrtMenu: true,
    crtMenuLabel: 'LES RELIQUES',
    load: async () => (await import('./03-les-reliques/reliques')).default,
  },
  {
    id: 'oeil-big-brother',
    heading: "Section 2 - L'Oeil de Big Brother",
    description:
      'Transition dystopique, visage geant et parallax de levee de tete au scroll.',
    includeInCrtMenu: true,
    crtMenuLabel: 'BIG BROTHER',
    load: async () =>
      (await import('./04-oeil-big-brother/bigBrother')).default,
  },
  {
    id: 'mpc',
    heading: 'Section 3 - La MPC',
    screenReaderOnlyHeading: true,
    includeInCrtMenu: true,
    crtMenuLabel: 'SECTION MPC',
    load: async () => (await import('./05-mpc-3d/mpc3d')).default,
  },
  {
    id: 'outro-eclipse',
    heading: "Section Outro - L'Eclipse",
    description:
      'Retour au noir, 4 projecteurs de scene puis extinction finale un a un au dernier scroll.',
    includeInCrtMenu: true,
    crtMenuLabel: "L'ECLIPSE",
    load: async () => (await import('./06-outro-eclipse/eclipse')).default,
  },
] as const satisfies readonly SectionDefinition[];

export const sections: SectionDefinition[] = [...sectionDefinitions];

/**
 * Canonical section identifiers used for DOM queries, scroll navigation, and scroll manager.
 *
 * Canonical keys (single, preferred name per section):
 *   HERO, HUB_CENTRAL, RELIQUES, BIG_BROTHER, MPC, OUTRO_ECLIPSE
 *
 * Legacy aliases (kept for backwards-compat, do not use in new code):
 *   MENU          → HUB_CENTRAL  (ancien nom utilisé dans hero.ts)
 *   FACE_VADER    → RELIQUES     (ancien nom de la section reliques)
 *   THEMATIC_OBJECTS → RELIQUES  (idem, nom de travail)
 *   OEIL_BIG_BROTHER → BIG_BROTHER
 *   MPC_BEATMAKER → MPC
 *   MPC_3D        → MPC
 *   STAR_WARS_CRAWL → OUTRO_ECLIPSE
 *   GRUNT         → OUTRO_ECLIPSE
 */
export const SECTION_IDS = {
  // ── Canonical names ──────────────────────────────────────────────────────────
  HERO: 'hero',
  HUB_CENTRAL: 'hub-central',
  RELIQUES: 'reliques',
  BIG_BROTHER: 'oeil-big-brother',
  MPC: 'mpc',
  OUTRO_ECLIPSE: 'outro-eclipse',

  // ── Legacy aliases — do not use in new code ──────────────────────────────────
  /** @deprecated Use HUB_CENTRAL */
  MENU: 'hub-central',
  /** @deprecated Use RELIQUES */
  FACE_VADER: 'reliques',
  /** @deprecated Use RELIQUES */
  THEMATIC_OBJECTS: 'reliques',
  /** @deprecated Use BIG_BROTHER */
  OEIL_BIG_BROTHER: 'oeil-big-brother',
  /** @deprecated Use MPC */
  MPC_BEATMAKER: 'mpc',
  /** @deprecated Use MPC */
  MPC_3D: 'mpc',
  /** @deprecated Use OUTRO_ECLIPSE */
  STAR_WARS_CRAWL: 'outro-eclipse',
  /** @deprecated Use OUTRO_ECLIPSE */
  GRUNT: 'outro-eclipse',
} as const;

type LoadableSection = SectionDefinition & { load: () => Promise<SectionInitializer> };

const isLoadable = (s: SectionDefinition): s is LoadableSection =>
  s.type !== 'spacer' && s.load !== undefined;

export const sectionLoaders: SectionLoader[] = sections
  .filter(isLoadable)
  .map(({ id, load }) => ({ id, load }));

export const crtMenuItems = sections
  .filter((section) => section.includeInCrtMenu)
  .map((section) => section.crtMenuLabel ?? section.heading.toUpperCase());

// Mapping des indices du menu CRT vers les IDs de section
export const crtMenuSectionIds = sections
  .filter((section) => section.includeInCrtMenu)
  .map((section) => section.id);

export const getSectionSelector = (id: SectionId): string =>
  `[data-section="${id}"]`;
