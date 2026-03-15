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
  load: () => Promise<SectionInitializer>;
}

const sectionDefinitions = [
  {
    id: 'hero',
    heading: 'Luv Resval',
    headingTag: 'h1',
    screenReaderOnlyHeading: true,
    includeInCrtMenu: true,
    crtMenuLabel: "L'AMORCE",
    load: async () => (await import('./01-hero/hero')).initHeroSection,
  },
  {
    id: 'hub-central',
    heading: 'Le Hub Central',
    screenReaderOnlyHeading: true,
    scrollHeight: 'clamp(200vh, 300vh, 400vh)',
    interactionMode: 'none',
    includeInCrtMenu: false,
    load: async () => (await import('./02-hub-central-menu/menu')).default,
  },
  {
    id: 'reliques',
    heading: 'Section 1 - Les Reliques',
    description:
      'Masque de Dark Vador, cartouche Zelda DS, grillz argent et tete de Cerbere avec modales lore.',
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
    description:
      '9 pads interactifs pour reconstruire le morceau stems par stems.',
    includeInCrtMenu: true,
    crtMenuLabel: 'MPC',
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

export const SECTION_IDS = {
  HERO: 'hero',
  MENU: 'hub-central',
  HUB_CENTRAL: 'hub-central',
  FACE_VADER: 'reliques',
  THEMATIC_OBJECTS: 'reliques',
  RELIQUES: 'reliques',
  BIG_BROTHER: 'oeil-big-brother',
  OEIL_BIG_BROTHER: 'oeil-big-brother',
  MPC_BEATMAKER: 'mpc',
  MPC_3D: 'mpc',
  MPC: 'mpc',
  STAR_WARS_CRAWL: 'outro-eclipse',
  GRUNT: 'outro-eclipse',
  OUTRO_ECLIPSE: 'outro-eclipse',
} as const;

export const sectionLoaders: SectionLoader[] = sections.map(({ id, load }) => ({
  id,
  load,
}));

export const crtMenuItems = sections
  .filter((section) => section.includeInCrtMenu)
  .map((section) => section.crtMenuLabel ?? section.heading.toUpperCase());

// Mapping des indices du menu CRT vers les IDs de section
export const crtMenuSectionIds = sections
  .filter((section) => section.includeInCrtMenu)
  .map((section) => section.id);

export const getSectionSelector = (id: SectionId): string =>
  `[data-section="${id}"]`;
