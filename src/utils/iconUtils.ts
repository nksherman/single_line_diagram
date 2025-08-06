/**
 * Utility functions for handling icon paths
 */

/**
 * Get the SVG icon path for a given equipment type
 * @param type - The equipment type
 * @returns The full path to the SVG icon
 */
export const getIconPath = (type: string): string => {
  return `${import.meta.env.BASE_URL}icons/${type.toLowerCase()}.svg`;
};
