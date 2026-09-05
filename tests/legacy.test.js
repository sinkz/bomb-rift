import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, seededRandom } from '../src/game.js';
import { normalizeMeta, startingStats, buyTalent, resetTalents, useGear, useOutfit, claimContract, rankInfo, TALENTS } from '../src/legacy.js';

const wealthy = () => normalizeMeta({ shards: 5000, scrap: 5000, cores: 50, legacyXp: 600 });
const wallet = m => [m.shards, m.scrap, m.cores];
const expedition = meta => { const g = new Game({ meta, random: seededRandom(42) }); g.start(); g.enemies = []; g.pickups = []; return g; };

test('v2.1 saves preserve purchased stats and unlocked phases, while invalid equipment cannot be equipped', () => {
  const m = normalizeMeta({ health: 4, power: 3, shards: 49, unlockedStage: 10, loadout: { core: 'azure-core', boots: 'pulse' }, scrap: -20, cores: Infinity, talents: { armor: 999 } });
  assert.equal(m.health, 4); assert.equal(m.power, 3); assert.equal(m.shards, 49); assert.equal(m.unlockedStage, 10);
  assert.equal(m.totals.guardians, 9); assert.equal(m.legacyXp, 0); assert.equal(m.scrap, 0); assert.equal(m.cores, 0);
  assert.deepEqual(m.loadout, { core: 'pulse', boots: 'traveler', charm: 'compass' }); assert.equal(m.talents.armor, 4);
  assert.equal(normalizeMeta(null).unlockedStage, 1);
});
test('equipment crafting is atomic, rank gated and charged once; swapping uses the matching slot', () => {
  const m = normalizeMeta({ shards: 100, scrap: 100, cores: 1 }); const initial = wallet(m);
  assert(!useGear(m, 'azure-core')); assert.deepEqual(wallet(m), initial);
  m.legacyXp = 70; m.cores = 0; assert(!useGear(m, 'azure-core')); assert.equal(m.shards, 100); assert.equal(m.scrap, 100);
  m.cores = 1; assert(useGear(m, 'azure-core')); assert.deepEqual(wallet(m), [90, 86, 0]);
  assert(useGear(m, 'pulse')); assert(useGear(m, 'azure-core')); assert.deepEqual(wallet(m), [90, 86, 0]);
  assert.equal(m.loadout.boots, 'traveler'); assert.equal(m.gear.filter(id => id === 'azure-core').length, 1);
  assert(!useGear(m, 'made-up')); assert.equal(startingStats(m).fire, 'azure');
});
test('talents enforce prerequisites and max level; respec refunds every currency once', () => {
  const m = wealthy(), before = wallet(m);
  assert(!buyTalent(m, 'stock')); assert(!buyTalent(m, 'armor')); assert.deepEqual(wallet(m), before);
  for (const id of ['power','reach','stock','health','armor','armor','siphon','stride','dash','magnet']) assert(buyTalent(m, id));
  for (const t of TALENTS) while (buyTalent(m, t.id)) {}
  for (const t of TALENTS) assert(!buyTalent(m, t.id));
  assert(resetTalents(m)); assert.deepEqual(wallet(m), before); assert(!resetTalents(m)); assert.deepEqual(wallet(m), before);
  assert.equal(startingStats(m).maxHp, 100); assert.equal(startingStats(m).range, 2);
});
test('prepared equipment, talents and appearance apply next phase while run rewards reset', () => {
  const m = wealthy(), g = expedition(m); const initial = g.player;
  useGear(m, 'azure-core'); useGear(m, 'bastion-boots'); useGear(m, 'guardian-charm'); buyTalent(m, 'health'); useOutfit(m, 'jade');
  assert.equal(initial.fire, 'normal'); assert.equal(initial.maxHp, 100); assert.equal(initial.equipment.core, 'pulse'); assert.equal(initial.outfit, 'ember');
  g.crystals = 50; g.equipRelic('overdrive'); g.equipRelic('mercy'); g.skillLevels.power = 4;
  g.spawnBoss(); g.defeatBoss(); g.nextRound();
  assert.equal(g.player.fire, 'azure'); assert.equal(g.player.maxHp, 125); assert.equal(g.player.ward, 1); assert.equal(g.player.outfit, 'jade');
  assert.equal(g.player.damage, 3); assert.equal(g.crystals, 0); assert.deepEqual(g.relics, []); assert.deepEqual(g.skillLevels, {});
  assert.deepEqual(normalizeMeta(JSON.parse(JSON.stringify(m))), m);
});
test('cosmetic unlock costs once and does not change combat stats', () => {
  const m = wealthy(), before = startingStats(m), cost = wallet(m);
  assert(useOutfit(m, 'polar')); assert.equal(m.scrap, cost[1] - 5); useOutfit(m, 'ember'); useOutfit(m, 'polar');
  assert.equal(m.scrap, cost[1] - 5); assert.deepEqual({ ...startingStats(m), outfit: before.outfit }, before);
});
test('victory and defeat bank only collected materials once, preserving salvage bonus and XP rank', () => {
  for (const victory of [false, true]) {
    const m = normalizeMeta({ gear: ['salvager'], loadout: { charm: 'salvager' } }), g = expedition(m);
    g.materials = { scrap: 8, cores: 1 }; g.addPickup(8, 8, 'scrap', 100); g.kills = 12; g.cratesBroken = 8; g.elapsed = 120;
    if (victory) { g.spawnBoss(); g.defeatBoss(); } else g.die();
    assert(g.claimResult()); assert(!g.claimResult()); assert.equal(m.scrap, 10); assert.equal(m.cores, victory ? 2 : 1);
    assert.equal(m.legacyXp, victory ? 72 : 42); assert.equal(rankInfo(m.legacyXp).level, victory ? 2 : 1);
    assert.deepEqual(m.totals, { kills: 12, crates: 8, guardians: victory ? 1 : 0 });
  }
});
test('contracts accumulate across results and reward only completed, unclaimed objectives', () => {
  const m = normalizeMeta(); assert(!claimContract(m, 'hunter')); assert(!claimContract(m, 'invalid'));
  for (let i = 0; i < 2; i++) { const g = expedition(m); g.kills = 15; g.die(); g.claimResult(); }
  const before = wallet(m); assert(claimContract(m, 'hunter')); assert.deepEqual(wallet(m), [before[0] + 8, before[1] + 8, before[2]]);
  assert(!claimContract(m, 'hunter')); assert(!claimContract(m, 'cartographer'));
  m.unlockedStage = 7; assert(claimContract(m, 'cartographer')); const restored = normalizeMeta(JSON.parse(JSON.stringify(m)));
  assert(!claimContract(restored, 'cartographer')); assert.equal(restored.totals.kills, 30);
});
