import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, seededRandom, SKILLS, WIDTH, HEIGHT, ROUND_SECONDS } from '../src/game.js';

function arena(seed = 42) {
  const g = new Game({ random: seededRandom(seed) }); g.start();
  g.enemies = []; g.pickups = []; g.pendingLevels = 0; g.spawnClock = Infinity;
  g.grid = Array.from({ length: HEIGHT }, (_, z) => Array.from({ length: WIDTH }, (_, x) => x === 0 || z === 0 || x === WIDTH - 1 || z === HEIGHT - 1 ? 1 : 0));
  g.player.invincible = 0; g.drainEvents(); return g;
}
function advance(g, seconds) { for (let i = 0; i < Math.ceil(seconds * 60); i++) g.tick(1 / 60); }

test('bombs propagate in a cross, stop at stone, destroy only the first crate', () => {
  const g = arena(); g.grid[3][5] = 1; g.grid[5][3] = 2; g.grid[6][3] = 2;
  const bomb = { id: 900, x: 3, z: 3, range: 5, damage: 2, fuse: 0 }; g.bombs.push(bomb); g.explode(bomb);
  assert.equal(g.tile(3, 5), 0); assert.equal(g.tile(3, 6), 2); assert.equal(g.tile(5, 3), 1);
  const cells = g.flames[0].cells;
  assert(!cells.some(c => c.x === 5 && c.z === 3)); assert(!cells.some(c => c.x === 3 && c.z === 6));
  assert(!cells.some(c => c.x === 4 && c.z === 4));
});
test('chain reactions consume both bombs immediately', () => {
  const g = arena(); const a = { id: 800, x: 3, z: 3, range: 3, damage: 2, fuse: 0 }, b = { id: 801, x: 5, z: 3, range: 2, damage: 2, fuse: 2 };
  g.bombs = [a, b]; g.explode(a); assert.equal(g.bombs.length, 0); assert.equal(g.flames.length, 2);
});
test('player can escape a planted bomb but cannot walk back through it', () => {
  const g = arena(); assert(g.plantBomb()); assert(!g.plantBomb()); assert(g.move(1, 0));
  g.player.moveCooldown = 0; assert(!g.move(-1, 0)); assert.equal(g.player.x, 2);
});
test('own blasts damage the player, with invulnerability preventing repeated damage', () => {
  const g = arena(); g.plantBomb(); advance(g, 2.2); assert.equal(g.player.hp, 80);
  advance(g, .3); assert.equal(g.player.hp, 80);
});
test('dash stops at walls and requires cooldown', () => {
  const g = arena(); g.player.facing = [1, 0]; g.grid[1][4] = 1;
  assert(g.dash()); assert.equal(g.player.x, 3); assert(!g.dash()); assert(g.player.invincible > 0);
});
test('boss appears at exactly 120 seconds, never earlier, and suspends the survival timer', () => {
  const g = arena(); g.tick(119.99); assert.equal(g.boss, null); assert.equal(g.phase, 'playing');
  g.tick(.01); assert.equal(g.phase, 'boss'); assert(g.boss); assert.equal(g.elapsed, ROUND_SECONDS);
  const maxHp = g.boss.maxHp; advance(g, .5); assert.equal(g.boss.maxHp, maxHp); assert.equal(g.elapsed, 120);
});
test('boss victory unlocks a fresh stage and resets temporary build', () => {
  const g = arena(); g.player.damage = 8; g.skillLevels.power = 6; g.spawnBoss(); g.defeatBoss();
  assert.equal(g.phase, 'intermission'); assert.equal(g.earnedShards, g.stage.reward);
  assert(g.nextRound()); assert.equal(g.round, 2); assert.equal(g.elapsed, 0); assert.equal(g.phase, 'playing'); assert.equal(g.player.damage, 2); assert.deepEqual(g.skillLevels, {}); assert.equal(g.meta.unlockedStage, 2); assert.equal(g.meta.shards, 8);
  assert(g.drainEvents().some(e => e.type === 'bossDefeated' && e.entityType === 'boss'));
});
test('crystals produce a free level choice and purchased drafts consume currency once', () => {
  const g = arena(); g.addPickup(1, 1, 'crystal', 12); g.tick(.01);
  assert.equal(g.level, 2); assert.equal(g.phase, 'upgrade'); assert.equal(g.crystals, 12); assert.equal(g.offers.length, 3);
  const selected = g.offers[0].id; assert(g.chooseSkill(selected)); assert.equal(g.skillLevels[selected], 1); assert.equal(g.phase, 'playing');
  assert(!g.openUpgrade(true)); g.crystals = 50; assert(g.openUpgrade(true)); assert.equal(g.crystals, 30); assert.equal(g.forgeCost, 30); assert(!g.openUpgrade(true));
});
test('reroll has a price and choices cannot apply twice or select an unoffered skill', () => {
  const g = arena(); g.openUpgrade(); g.crystals = 5; assert(!g.reroll()); g.crystals = 6; assert(g.reroll()); assert.equal(g.crystals, 0);
  assert(!g.chooseSkill('missing')); const id = g.offers[0].id; assert(g.chooseSkill(id)); assert(!g.chooseSkill(id)); assert.equal(g.skillLevels[id], 1);
});
test('magnet respects walls and crystals remain when inaccessible', () => {
  const g = arena(); g.player.magnet = 3; g.grid[1][2] = 1; g.addPickup(3, 1, 'crystal', 3); g.collect(); assert.equal(g.crystals, 0); assert.equal(g.pickups.length, 1);
  g.grid[1][2] = 0; g.collect(); assert.equal(g.crystals, 3);
  assert(g.drainEvents().some(e => e.type === 'pickup' && e.entityType === 'crystal'));
});
test('enemies route around obstacles instead of walking through stone', () => {
  const g = arena(); g.player.x = 5; g.player.z = 1; g.grid[1][3] = 1;
  const enemy = { x: 2, z: 1, id: 333 }; const step = g.nextStep(enemy); assert.deepEqual(step, { x: 2, z: 2 });
});
test('flames hit each enemy once, kills award crystals, and death ends simulation', () => {
  const g = arena(); g.enemies = [{ id: 500, x: 3, z: 1, type: 'slime', hp: 4, maxHp: 4, cooldown: 10 }];
  const bomb = { id: 600, x: 3, z: 1, range: 1, damage: 2 }; g.bombs.push(bomb); g.explode(bomb); g.applyFlame(g.flames[0]); assert.equal(g.enemies[0].hp, 2);
  const bomb2 = { ...bomb, id: 601 }; g.bombs.push(bomb2); g.explode(bomb2); assert.equal(g.kills, 1); assert.equal(g.enemies.length, 0); assert.equal(g.pickups.length, 1);
  g.player.hp = 1; g.hurt(12); assert.equal(g.phase, 'dead'); const time = g.elapsed; g.tick(1); assert.equal(g.elapsed, time);
});
test('pause freezes timers, enemy positions and bomb fuses', () => {
  const g = arena(); g.plantBomb(); const fuse = g.bombs[0].fuse; g.pause(); advance(g, 10);
  assert.equal(g.elapsed, 0); assert.equal(g.bombs[0].fuse, fuse); g.pause(); advance(g, .1); assert(g.bombs[0].fuse < fuse);
});
test('permanent upgrades apply at run start; new runs reset temporary upgrades', () => {
  const g = new Game({ meta: { health: 3, power: 2 }, random: seededRandom(77) }); g.start();
  assert.equal(g.player.hp, 130); assert.equal(g.player.damage, 4); g.player.range = 6; g.crystals = 100; g.skillLevels.range = 4; g.start();
  assert.equal(g.player.range, 2); assert.equal(g.crystals, 0); assert.deepEqual(g.skillLevels, {}); assert.equal(g.player.damage, 4);
});
test('procedural arenas always have a safe spawn with two exits over 100 seeds', () => {
  const signatures = new Set();
  for (let seed = 0; seed < 100; seed++) {
    const g = new Game({ random: seededRandom(seed) });
    assert.equal(g.tile(1, 1), 0); assert.equal(g.tile(2, 1), 0); assert.equal(g.tile(1, 2), 0);
    assert(g.enemies.every(e => Math.abs(e.x - 1) + Math.abs(e.z - 1) > 5));
    signatures.add(JSON.stringify(g.grid));
  }
  assert.equal(signatures.size, 100);
});

test('a fatal self-explosion cannot revive the player through a simultaneous boss kill', () => {
  const g = arena(); g.spawnBoss(); g.player.x = g.boss.x; g.player.z = g.boss.z; g.player.hp = 1;
  const b = { id: 700, x: g.boss.x, z: g.boss.z, range: 1, damage: 100 }; g.bombs.push(b); g.explode(b);
  assert.equal(g.phase, 'dead'); assert.equal(g.player.hp, 0); assert.equal(g.bosses, 0);
});
test('endless runs still offer healing when all permanent run skills are maxed', () => {
  const g = arena();
  for (const s of SKILLS) g.skillLevels[s.id] = s.id === 'heal' ? 200 : s.max;
  g.openUpgrade(); assert.equal(g.offers.length, 1); assert.equal(g.offers[0].id, 'heal'); assert(g.chooseSkill('heal'));
});

test('enemy danger forecast accounts for early ignition from bomb chains', () => {
  const g = arena();
  g.bombs = [{ id: 700, x: 3, z: 3, fuse: .2, range: 2 }, { id: 701, x: 5, z: 3, fuse: 2, range: 3 }];
  assert.equal(g.dangerMap().get('8,3'), .2);
  g.grid[3][4] = 1; assert.equal(g.dangerMap().get('8,3'), 2);
});
test('a threatened hunter escapes sideways out of a blast corridor', () => {
  const g = arena(); g.round = 9; g.player.x = 7; g.player.z = 3;
  const enemy = { id: 500, type: 'slime', x: 4, z: 3 };
  g.bombs = [{ id: 700, x: 3, z: 3, fuse: .4, range: 3 }];
  const step = g.nextStep(enemy);
  assert.equal(enemy.intent, 'evade'); assert(step); assert(!g.dangerMap().has(`${step.x},${step.z}`));
});
test('hunters find a detour around an occupied corridor entrance', () => {
  const g = arena(); g.player.x = 5;
  const hunter = { id: 500, type: 'slime', x: 1, z: 1 };
  g.enemies = [hunter, { id: 501, x: 2, z: 1 }];
  assert.deepEqual(g.nextStep(hunter), { x: 1, z: 2 });
});
test('a flanker targets the corridor ahead of the moving player', () => {
  const g = arena(); g.round = 9; g.player.x = 5; g.player.z = 3; g.player.facing = [1, 0]; g.player.moveCooldown = .19;
  const hunter = { id: 6, type: 'slime', x: 7, z: 1 };
  assert.deepEqual(g.nextStep(hunter), { x: 7, z: 2 }); assert.equal(hunter.intent, 'flank');
});
test('ember charges have a visible windup and lock their original direction', () => {
  const g = arena(); g.player.x = 5; g.player.z = 5;
  const enemy = { id: 500, type: 'ember', x: 1, z: 5, hp: 3, maxHp: 3, cooldown: 0, hitFlash: 0, chargeCooldown: 0 };
  g.enemies = [enemy]; g.tick(.01);
  assert.equal(enemy.intent, 'windup'); assert.equal(enemy.chargeCells.length, 4);
  advance(g, .6); assert.equal(enemy.x, 1);
  g.player.z = 4; advance(g, .95);
  assert.equal(enemy.x, 5); assert.equal(enemy.z, 5); assert.equal(g.player.hp, 100);
  assert(g.drainEvents().some(e => e.type === 'enemyCharge'));
});
test('charges stop when a bomb blocks the lane after the windup starts', () => {
  const g = arena(); g.player.x = 5; g.player.z = 5;
  const enemy = { id: 500, type: 'ember', x: 1, z: 5, hp: 3, maxHp: 3, cooldown: 0, hitFlash: 0, chargeCooldown: 0 };
  g.enemies = [enemy]; g.tick(.01);
  g.bombs = [{ id: 700, x: 3, z: 5, fuse: 10, range: 2, damage: 2 }];
  advance(g, 1.4); assert.equal(enemy.x, 2); assert.equal(enemy.chargeSteps, 0);
});
test('boss enrages once at half health and summons exactly two reinforcements', () => {
  const g = arena(); g.spawnBoss(); g.boss.hp = g.boss.maxHp / 2; g.player.invincible = 100;
  g.tick(.01); assert.equal(g.boss.enraged, true); assert.equal(g.enemies.length, 2);
  g.tick(.01); assert.equal(g.enemies.length, 2);
  assert.equal(g.drainEvents().filter(e => e.type === 'bossEnraged').length, 1);
});
test('boss alternates targeted ground attacks and a cross blocked by stone', () => {
  const g = arena(); g.spawnBoss(); g.bossAttack();
  assert(g.warnings[0].cells.some(c => c.x === g.player.x && c.z === g.player.z));
  g.grid[5][8] = 1; g.bossAttack();
  assert(g.warnings[1].cells.some(c => c.x === 7 && c.z === 5));
  assert(!g.warnings[1].cells.some(c => c.x > 7));
});
