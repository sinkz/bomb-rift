import test from 'node:test';
import assert from 'node:assert/strict';
import { t, setLocale, getLocale, resolveLocale, localeTag, formatNumber, formatDate, setText, setAttr, refreshTranslations, LOCALE_KEY } from '../src/i18n.js';
import { WORLDS, RELICS, ENEMY_NAMES, ENEMY_TACTICS, stageFor, CAMPAIGN_LENGTH } from '../src/campaign.js';
import { TALENTS, GEAR, OUTFITS, CONTRACTS, BRANCHES, RESOURCES } from '../src/legacy.js';
import { Game, SKILLS, seededRandom } from '../src/game.js';

test('saved language wins, browser language has a supported fallback, invalid settings are ignored', () => {
  assert.equal(resolveLocale('pt-BR', ['en-US']), 'pt-BR');
  assert.equal(resolveLocale('en', ['pt-BR']), 'en');
  assert.equal(resolveLocale('invalid', ['fr-FR', 'en-GB']), 'en');
  assert.equal(resolveLocale(null, ['pt-PT']), 'pt-BR');
  assert.equal(resolveLocale(null, ['de-DE']), 'en');
  assert.equal(resolveLocale(null, []), 'en');
  assert.equal(resolveLocale(null), 'en');
  assert.equal(resolveLocale(null, ['fr-FR', 'pt-BR']), 'pt-BR');
  setLocale('pt-BR'); assert.equal(setLocale('fr'), false); assert.equal(getLocale(), 'pt-BR');
});

test('every skill, stage, world, item and strategy has authored English text', () => {
  setLocale('en');
  const data = [...SKILLS, ...WORLDS, ...RELICS, ...TALENTS, ...GEAR, ...OUTFITS, ...CONTRACTS, ...BRANCHES, ...Object.values(RESOURCES), ...Object.values(ENEMY_TACTICS), ...Array.from({ length: CAMPAIGN_LENGTH }, (_, i) => stageFor(i + 1))];
  for (const entry of data) for (const key of ['name','desc','description','subtitle','title','quote','mechanic','bossAttack','motto','tip']) {
    if (typeof entry[key] !== 'string') continue;
    assert.notEqual(t(entry[key]), entry[key], `${entry.id || entry.number}: missing ${key}: ${entry[key]}`);
    assert.equal(t(t(entry[key])), t(entry[key]), `translation must be idempotent: ${entry[key]}`);
  }
  for (const name of Object.values(ENEMY_NAMES)) assert.notEqual(t(name), name);
  assert.equal(t('MÓRTHOS'), 'MÓRTHOS'); assert.equal(t('NYXARA'), 'NYXARA');
  setLocale('pt-BR');
});

test('dynamic text preserves values and translates names inside status, requirements and boss labels', () => {
  setLocale('en');
  assert.equal(t('10 HABILIDADES'), '10 SKILLS');
  assert.equal(t('1º NO SEU RANKING'), '#1 IN YOUR RANKING');
  assert.equal(t('Colete mais 8 cristais para forjar uma habilidade'), 'Collect 8 more crystals to forge a skill');
  assert.equal(t('Sua próxima luta: MÓRTHOS · fase 01'), 'Your next battle: MÓRTHOS · stage 01');
  assert.equal(t('REQUER CHAMA ANCESTRAL 1'), 'REQUIRES ANCESTRAL FLAME 1');
  assert.equal(t('Intensidade 2 de 3'), 'Intensity 2 of 3');
  assert.equal(t('Fase 2: Pátio esquecido, bloqueada, ver prévia'), 'Stage 2: Forgotten Courtyard, locked, view preview');
  assert.equal(t('luz.'), 'light.');
  assert.equal(t('Esquivar'), 'Dash');
  assert.equal(t('Arena tridimensional de BOMB RIFT'), 'BOMB RIFT 3D arena');
  assert.equal(t('1 casas'), '1 tile');
  assert.equal(t('3.1415'), '3.1415');
  assert.equal(t('  SOBREVIVA À HORDA  '), '  SURVIVE THE HORDE  ');
  assert.equal(t('MÓRTHOS, O sino sem alma. Arraste ou use as setas para girar. Espaço para provocar.'), 'MÓRTHOS, The soulless bell. Drag or use the arrow keys to rotate. Space to taunt.');
  setLocale('pt-BR');
});

test('locale switch restores original DOM copy while retaining the latest live numbers and attributes', () => {
  const element = {
    nodeType: 1, tagName: 'SPAN', attributes: new Map(), firstChild: null,
    get textContent() { return this.firstChild?.nodeValue || ''; },
    set textContent(value) { this.firstChild = { nodeType: 3, nodeValue: value, parentElement: this }; },
    hasAttribute(name) { return this.attributes.has(name); },
    getAttribute(name) { return this.attributes.get(name); },
    setAttribute(name, value) { this.attributes.set(name, value); },
    ownerDocument: { createTreeWalker(root) { let done = false; return { currentNode: null, nextNode() { if (done || !root.firstChild) return false; done = true; this.currentNode = root.firstChild; return true; } }; } },
  };
  setLocale('pt-BR'); setText(element, '3 HABILIDADES'); setAttr(element, 'aria-label', 'Vida do personagem');
  setLocale('en'); refreshTranslations(element);
  assert.equal(element.textContent, '3 SKILLS'); assert.equal(element.getAttribute('aria-label'), 'Character health');
  setText(element, '4 HABILIDADES');
  setLocale('pt-BR'); refreshTranslations(element);
  assert.equal(element.textContent, '4 HABILIDADES'); assert.equal(element.getAttribute('aria-label'), 'Vida do personagem');
});

test('changing language persists separately and cannot alter a live run or progression', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const writes = [];
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { setItem: (...args) => writes.push(args) } });
  try {
    setLocale('pt-BR');
    const game = new Game({ random: seededRandom(41), meta: { shards: 77, health: 2 } }); game.start(1); game.plantBomb(); game.tick(.1);
    const before = JSON.stringify(game);
    setLocale('en'); setLocale('pt-BR');
    assert.equal(JSON.stringify(game), before);
    assert.deepEqual(writes.slice(-2), [[LOCALE_KEY, 'en'], [LOCALE_KEY, 'pt-BR']]);
    globalThis.localStorage.setItem = () => { throw new Error('Storage unavailable'); };
    assert.doesNotThrow(() => setLocale('en')); assert.equal(getLocale(), 'en');
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original); else delete globalThis.localStorage;
    setLocale('pt-BR');
  }
});

test('numbers and ranking dates follow the selected locale', () => {
  setLocale('pt-BR'); assert.equal(localeTag(), 'pt-BR'); assert.equal(formatNumber(1234.5), '1.234,5');
  assert.equal(formatDate(new Date(2026, 8, 5), { day: '2-digit', month: '2-digit' }), '05/09');
  setLocale('en'); assert.equal(localeTag(), 'en-US'); assert.equal(formatNumber(1234.5), '1,234.5');
  assert.equal(formatDate(new Date(2026, 8, 5), { day: '2-digit', month: '2-digit' }), '09/05');
  setLocale('pt-BR');
});
