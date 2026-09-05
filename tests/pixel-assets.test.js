import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PIXEL_URLS } from '../src/pixel-assets.js';
import { pixelArt, pixelIcon, portraitArt } from '../src/pixel-art.js';
import { skillArt } from '../src/skill-art.js';
import { rpgArt } from '../src/rpg-art.js';
import { SKILLS } from '../src/game.js';
import { RELICS, WORLDS, ENEMY_NAMES } from '../src/campaign.js';
import { TALENTS, GEAR, CONTRACTS, OUTFITS, RESOURCES } from '../src/legacy.js';

test('all game entities have approved runtime art with a valid lossless WebP file', () => {
  const groups = { skill: SKILLS, relic: RELICS, talent: TALENTS, gear: GEAR, contract: CONTRACTS, portrait: OUTFITS, outfit: OUTFITS, guardian: WORLDS, map: WORLDS };
  for (const [group, rows] of Object.entries(groups)) {
    for (const row of rows) assert.ok(PIXEL_URLS[`${group}-${row.id}`], `${group}-${row.id}`);
  }
  for (const id of Object.keys(RESOURCES)) assert.ok(PIXEL_URLS[`resource-${id}`]);
  for (const id of Object.keys(ENEMY_NAMES)) assert.ok(PIXEL_URLS[`enemy-${id}`]);
  for (const path of new Set(Object.values(PIXEL_URLS))) {
    const bytes = readFileSync(new URL(path));
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF', path);
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP', path);
    assert.ok(bytes.includes(Buffer.from('VP8L')), `Lossless chunk missing: ${path}`);
  }
});

test('the original approval aliases and every approved asset survive runtime preparation', () => {
  const catalog = JSON.parse(readFileSync(new URL('../public/pixel-library/catalog.json', import.meta.url)));
  assert.equal(Object.keys(PIXEL_URLS).length, catalog.items.length);
  for (const item of catalog.items) {
    const approvedName = item.new.split('/').pop().replace(/\.png$/, '.webp');
    assert.ok(PIXEL_URLS[item.id].endsWith(`/${approvedName}`), item.id);
  }
});

test('relics, equipment, and cosmetic selections use their distinct approved identities', () => {
  assert.match(skillArt('capacity'), /data-pixel-art="skill-capacity"/);
  assert.match(skillArt('relic-azure'), /data-pixel-art="relic-azure"/);
  assert.match(rpgArt('azure-core'), /data-pixel-art="gear-azure-core"/);
  assert.match(rpgArt('bastion-boots'), /data-pixel-art="gear-bastion-boots"/);
  assert.match(rpgArt('scrap'), /data-pixel-art="resource-scrap"/);
  assert.match(portraitArt('jade'), /data-pixel-art="portrait-jade"/);
  assert.match(portraitArt('missing'), /data-pixel-art="portrait-ember"/);
  assert.match(pixelIcon('VolumeX'), /data-pixel-art="ui-VolumeX"/);
  assert.equal(pixelArt('missing'), '');
  assert.match(pixelArt('skill-health'), /aria-hidden="true"/);
});
