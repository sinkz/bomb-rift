import { PIXEL_URLS } from './pixel-assets.js';
const guardianPortraits = {
  'guardian-garden': new URL('./assets/optimized/briarok-portrait.webp', import.meta.url).href,
  'guardian-storm': new URL('./assets/optimized/fulgra-portrait.webp', import.meta.url).href,
  'guardian-frost': new URL('./assets/optimized/nivor-portrait.webp', import.meta.url).href,
};

// Use the bundled library so the same art also works in the Pages build.
export const refugeArt = (id, className = '') => `<img class="${className}" src="${guardianPortraits[id] || PIXEL_URLS[id] || PIXEL_URLS['ui-Sparkles']}" alt="" draggable="false">`;
