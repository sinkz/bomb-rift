import { PIXEL_URLS } from './pixel-assets.js';

const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

/** Decorative art: the adjacent label/button remains the accessible name.
 * SVG is a sizing container only. Its image is the approved transparent asset;
 * keeping the container preserves existing responsive SVG layout and motion.
 */
export function pixelArt(id, className = '') {
  const src = PIXEL_URLS[id];
  if (!src) return '';
  return `<svg class="pixel-art ${escape(className)}" data-pixel-art="${escape(id)}" viewBox="0 0 384 384" width="24" height="24" aria-hidden="true" focusable="false"><image href="${escape(src)}" width="384" height="384" preserveAspectRatio="xMidYMid meet"/></svg>`;
}

export function pixelIcon(name, className = '') {
  const art = pixelArt(`ui-${name}`, `lucide pixel-ui ${className}`);
  return art || `<i data-lucide="${escape(name)}" class="${escape(className)}" aria-hidden="true"></i>`;
}

export function portraitArt(outfitId = 'ember') {
  return pixelArt(`portrait-${outfitId}`, 'avatar-art') || pixelArt('portrait-ember', 'avatar-art');
}

/** Explicit render pass for existing Lucide markup; never observes the frame loop. */
export function applyPixelIcons(root = document) {
  for (const current of root.querySelectorAll('[data-lucide]:not([data-pixel-art])')) {
    const id = `ui-${current.getAttribute('data-lucide')}`;
    if (!PIXEL_URLS[id]) continue;
    const template = current.ownerDocument.createElement('template');
    template.innerHTML = pixelArt(id, `pixel-ui ${current.getAttribute('class') || ''}`);
    const replacement = template.content.firstElementChild;
    // Preserve ids and attributes referenced by settings/HUD updates.
    for (const { name, value } of current.attributes) {
      if (!['class', 'data-lucide', 'viewBox', 'viewbox', 'xmlns', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin'].includes(name)) replacement.setAttribute(name, value);
    }
    current.replaceWith(replacement);
  }
}
