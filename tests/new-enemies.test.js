import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, seededRandom } from '../src/game.js';
const arena = (stage = 1) => {
  const g = new Game({ random: seededRandom(12), meta: { unlockedStage: stage } }); g.start(stage);
  for (let z = 1; z < g.height - 1; z++) for (let x = 1; x < g.width - 1; x++) g.grid[z][x] = 0;
  g.enemies = []; g.pickups = []; g.spawnClock = Infinity; g.hazardClock = Infinity; g.player.invincible = 0; g.player.x = 5; g.player.z = 5;
  return g;
};
const enemy = (g, type, overrides = {}) => { const e = { id: g.nextId++, type, x: 9, z: 5, hp: 8, maxHp: 8, cooldown: 999, castCooldown: 0, ...overrides }; g.enemies.push(e); return e; };
const tick = (g, seconds) => { for (let t = 0; t < seconds; t += .01) g.tick(.01); };

test('spore attack targets a fixed telegraphed cross and damage is only on impact', () => {
  const g = arena(); const e = enemy(g, 'spore'); g.tick(.01); e.cooldown = 999;
  assert.equal(g.warnings[0].cells.length, 5); assert(g.warnings[0].timer > 1.7); assert.equal(g.player.hp, 100);
  tick(g, 1.81); assert.equal(g.player.hp, 84); g.player.invincible = 0; tick(g, .2); assert.equal(g.player.hp, 84);
});
test('weaver has a visible snare that does not damage; dash breaks the slow', () => {
  const g = arena(); const e = enemy(g, 'weaver'); g.tick(.01); e.cooldown = 999;
  assert.equal(g.warnings[0].effect, 'snare'); tick(g, 1.81); assert.equal(g.player.hp, 100); assert(g.player.slow > 1.8);
  g.player.facing = [0, 1]; assert(g.dash()); assert.equal(g.player.slow, 0); assert(g.drainEvents().some(e => e.type === 'webBurst'));
});
test('oracle channels before healing allies, caps at max HP, and killing it interrupts the heal', () => {
  for (const interrupt of [false, true]) {
    const g = arena(), oracle = enemy(g, 'oracle', { x: 8 }), ally = enemy(g, 'slime', { hp: 7 });
    g.tick(.01); assert(oracle.mending > 1); assert.equal(ally.hp, 7);
    if (interrupt) g.applyFlame({ cells: [{ x: oracle.x, z: oracle.z }], damage: 99, hit: new Set() });
    tick(g, 1.2); assert.equal(ally.hp, interrupt ? 7 : 8);
  }
});
test('mimic waits in disguise then gives an escape window before pursuit and drops extra scrap', () => {
  const g = arena(), e = enemy(g, 'mimic', { x: 10, cooldown: 0, awake: false });
  g.tick(.5); assert.equal(e.x, 10); assert.equal(e.awake, false);
  g.player.x = 7; g.tick(.01); assert(e.awake); assert.equal(e.intent, 'ambush'); assert.equal(e.x, 10); assert(e.cooldown >= 1);
  g.applyFlame({ cells: [{ x: 10, z: 5 }], damage: 99, hit: new Set() }); assert(g.pickups.some(p => p.type === 'scrap' && p.value === 2));
});
test('piercing relic passes one crate in each direction but stops at the second and at stone', () => {
  const g = arena(); g.equipRelic('pierce'); g.grid[5][6] = 2; g.grid[5][8] = 2; g.grid[4][5] = 1;
  const cells = g.blastCells({ x: 5, z: 5, range: 5 }); const has = (x,z) => cells.some(c=>c.x===x&&c.z===z);
  assert(has(7,5)); assert(has(8,5)); assert(!has(9,5)); assert(!has(5,4));
});
test('overdrive rewards filling the final bomb slot; mercy blocks one impact and a heart recharges it', () => {
  const g = arena(); g.equipRelic('overdrive'); g.plantBomb(); g.player.x++; g.plantBomb();
  assert.equal(g.bombs[0].damage, 2); assert.equal(g.bombs[1].damage, 4);
  g.equipRelic('mercy'); g.hurt(20); assert.equal(g.player.hp, 100); assert.equal(g.player.ward, 0);
  g.player.invincible = 0; g.hurt(20); assert.equal(g.player.hp, 80);
  g.addPickup(g.player.x, g.player.z, 'heart', 1); g.collect(); assert.equal(g.player.hp, 100); assert.equal(g.player.ward, 1);
});
test('three new biomes have bounded warnings, safe escape space, and unique guardian rigs', () => {
  for (const [n, rig] of [[10,'briarok'], [13,'fulgra'], [16,'nivor']]) {
    const g = arena(n); g.spawnBoss(); assert.equal(g.boss.variant, rig); g.bossAttack(); g.environmentAttack();
    assert.equal(g.warnings.length, 2); assert(g.warnings.every(w => w.cells.every(c => g.tile(c.x,c.z)===0)));
    const blast = g.warnings[0].cells; assert(blast.length > 3); assert(blast.length < 30 + g.height * 2);
    assert.equal(g.warnings[1].effect, n === 16 ? 'snare' : null);
  }
});
