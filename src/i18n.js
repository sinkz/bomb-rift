import { EN } from './i18n-catalog.js';

export const LOCALE_KEY = 'bomb-rift-language';
export const SUPPORTED_LOCALES = ['pt-BR', 'en'];
export function resolveLocale(saved, languages = []) {
  if (SUPPORTED_LOCALES.includes(saved)) return saved;
  const language = languages.find(value => /^(en|pt)(-|$)/i.test(value));
  return /^pt(-|$)/i.test(language || '') ? 'pt-BR' : 'en';
}
let saved; try { saved = globalThis.localStorage?.getItem(LOCALE_KEY); } catch {}
let locale = resolveLocale(saved, typeof document === 'undefined' ? [] : globalThis.navigator?.languages || []);
export const getLocale = () => locale;
export const localeTag = () => locale === 'en' ? 'en-US' : 'pt-BR';
export const formatNumber = (value, options) => Number(value).toLocaleString(localeTag(), options);
export const formatDate = (value, options) => new Date(value).toLocaleDateString(localeTag(), options);
const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const phrases = new Map(), patterns = [];
function phrase(source, target) {
  source = source.trim(); target = target.trim();
  if (!/[A-Za-zÀ-ÿ]/.test(source) || source === target || source.includes('{')) return;
  if (!phrases.has(source)) phrases.set(source, target);
  if (!phrases.has(source.toUpperCase())) phrases.set(source.toUpperCase(), target.toUpperCase());
  if (!phrases.has(source.toLowerCase())) phrases.set(source.toLowerCase(), target.toLowerCase());
}
for (const [source, target] of Object.entries(EN)) {
  if (!/\{\d+\}/.test(source)) { phrase(source, target); continue; }
  const sourceParts = source.split(/\{\d+\}/), targetParts = target.split(/\{\d+\}/);
  if (sourceParts.length === targetParts.length) sourceParts.forEach((part, i) => phrase(part, targetParts[i]));
  const ids = [...source.matchAll(/\{(\d+)\}/g)].map(m => m[1]);
  const expression = source.split(/(\{\d+\})/).map(part => /^\{\d+\}$/.test(part) ? '(.*?)' : escape(part)).join('');
  const weight = sourceParts.join('').length;
  if (weight > 5) patterns.push({ regex: new RegExp(`^${expression}$`, 'u'), target, ids, weight });
}
patterns.sort((a, b) => b.weight - a.weight);
const phraseRegex = new RegExp(`(?<![\\p{L}\\p{N}_])(?:${[...phrases.keys()].sort((a,b) => b.length-a.length).map(escape).join('|')})(?![\\p{L}\\p{N}_])`, 'gu');
const cache = new Map();
function translate(source, depth = 0) {
  const direct = EN[source] || phrases.get(source); if (direct && !direct.includes('{')) return direct;
  if (depth < 2) for (const pattern of patterns) {
    const match = source.match(pattern.regex); if (!match) continue;
    const values = Object.fromEntries(pattern.ids.map((id, i) => [id, translate(match[i + 1], depth + 1)]));
    return pattern.target.replace(/\{(\d+)\}/g, (_, id) => values[id] ?? '').replace(phraseRegex, found => phrases.get(found));
  }
  return source.replace(phraseRegex, found => phrases.get(found));
}
/** Translate human-readable text only. Simulation IDs and HTML attributes are never rewritten. */
export function t(value) {
  const source = String(value ?? '');
  if (locale !== 'en' || !/[A-Za-zÀ-ÿ]/.test(source)) return source;
  if (cache.has(source)) return cache.get(source);
  const leading = source.match(/^\s*/)[0], trailing = source.match(/\s*$/)[0];
  const translated = leading + translate(source.trim()) + trailing;
  if (cache.size > 2500) cache.clear(); cache.set(source, translated); return translated;
}

// Explicit render-boundary translation. A WeakMap retains the Portuguese source,
// allowing an in-place language switch without replacing controls or gameplay state.
const textSources = new WeakMap(), attributeSources = new WeakMap();
export function setText(element, value) {
  const source = String(value ?? ''), output = t(source);
  if (element.textContent !== output) element.textContent = output;
  const node = element.firstChild;
  if (node?.nodeType === 3) textSources.set(node, { source, output });
  return value;
}
export function setAttr(element, name, value) {
  const source = String(value ?? ''), output = t(source);
  element.setAttribute(name, output);
  let saved = attributeSources.get(element); if (!saved) attributeSources.set(element, saved = new Map());
  saved.set(name, { source, output }); return value;
}
function localizeNode(node) {
  if ((node.nodeType === 3 ? node.parentElement : node)?.closest?.('[translate="no"]')) return;
  if (node.nodeType === 3) {
    if (/^(SCRIPT|STYLE|CODE|TEXTAREA)$/.test(node.parentElement?.tagName || '')) return;
    const previous = textSources.get(node), source = previous?.output === node.nodeValue ? previous.source : node.nodeValue;
    const output = t(source); if (node.nodeValue !== output) node.nodeValue = output;
    textSources.set(node, { source, output });
  } else if (node.nodeType === 1) {
    for (const name of ['aria-label', 'aria-description', 'title', 'placeholder', 'alt']) if (node.hasAttribute(name)) {
      const previous = attributeSources.get(node)?.get(name), current = node.getAttribute(name);
      setAttr(node, name, previous?.output === current ? previous.source : current);
    }
  }
}
export function refreshTranslations(root = globalThis.document) {
  if (!root) return;
  localizeNode(root);
  const walker = root.ownerDocument?.createTreeWalker(root, 5) || root.createTreeWalker?.(root, 5);
  if (walker) while (walker.nextNode()) localizeNode(walker.currentNode);
}
export function setHTML(element, html) { element.innerHTML = html; refreshTranslations(element); return html; }
export function insertHTML(element, position, html) {
  element.insertAdjacentHTML(position, html);
  refreshTranslations(position === 'beforebegin' || position === 'afterend' ? element.parentElement : element);
}
export function setLocale(value) {
  if (!SUPPORTED_LOCALES.includes(value)) return false;
  if (locale === value) return true;
  locale = value; cache.clear();
  try { globalThis.localStorage?.setItem(LOCALE_KEY, value); } catch {}
  if (globalThis.document) {
    document.documentElement.lang = value;
    refreshTranslations(document);
    updateMetadata();
    document.dispatchEvent(new CustomEvent('bomb-rift:language', { detail: { locale } }));
  }
  return true;
}
export function languagePicker(id = 'game-language') {
  return `<label class="language-picker" for="${id}"><span>Idioma</span><select id="${id}" data-language aria-label="Idioma"><option value="pt-BR" ${locale === 'pt-BR' ? 'selected' : ''}>Português (Brasil)</option><option value="en" ${locale === 'en' ? 'selected' : ''}>English</option></select></label>`;
}
function updateMetadata() {
  if (!globalThis.document) return;
  document.title = locale === 'en' ? 'BOMB RIFT — Enter the rift' : 'BOMB RIFT — Entre na fenda';
  const description = document.querySelector('meta[name="description"]');
  if (description) description.content = locale === 'en'
    ? 'Enter the rift. A 3D roguelike of bombs, endless dungeons and unpredictable upgrades.'
    : 'Entre na fenda. Um roguelike de bombas, masmorras infinitas e evoluções imprevisíveis, em 3D.';
}
if (globalThis.document) { document.documentElement.lang = locale; updateMetadata(); }
