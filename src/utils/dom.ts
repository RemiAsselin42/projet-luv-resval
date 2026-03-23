/**
 * DOM utility functions for common element selection patterns.
 */

/**
 * Returns a CSS attribute selector string for a section element by its data-section id.
 *
 * @example
 * getSectionDataSelector('hero') // → '[data-section="hero"]'
 *
 * @param sectionId - The value of the data-section attribute
 * @returns CSS attribute selector string
 */
export const getSectionDataSelector = (sectionId: string): string =>
  `[data-section="${sectionId}"]`;

/**
 * Queries the DOM for the first element matching a data-section attribute.
 *
 * @param sectionId - The value of the data-section attribute to look for
 * @returns The matched HTMLElement, or null if not found
 */
export const querySectionElement = (sectionId: string): HTMLElement | null =>
  document.querySelector<HTMLElement>(getSectionDataSelector(sectionId));
