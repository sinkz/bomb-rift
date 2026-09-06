import { PIXEL_URLS } from './pixel-assets.js';

// Use the bundled library so the same art also works in the Pages build.
export const refugeArt = (id, className = '') => `<img class="${className}" src="${PIXEL_URLS[id] || PIXEL_URLS['ui-Sparkles']}" alt="" draggable="false">`;
