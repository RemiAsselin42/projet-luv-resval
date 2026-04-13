// Fonctions utilitaires pour trouver des éléments HTML de section dans la page.
// Fournit un raccourci pour chercher un élément par son attribut data-section,
// utilisé partout dans le code pour cibler les sections du site.

/** Construit le sélecteur CSS d'attribut pour un élément de section donné. */
const getSectionDataSelector = (sectionId: string): string =>
  `[data-section="${sectionId}"]`;

/**
 * Queries the DOM for the first element matching a data-section attribute.
 *
 * @param sectionId - The value of the data-section attribute to look for
 * @returns The matched HTMLElement, or null if not found
 */
export const querySectionElement = (sectionId: string): HTMLElement | null =>
  document.querySelector<HTMLElement>(getSectionDataSelector(sectionId));
