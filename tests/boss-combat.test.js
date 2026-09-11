import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, seededRandom } from '../src/game.js';
import { MIN_TELEGRAPH, PHASE_LABELS, bossPhaseFor, bossRepertoire, bossTelegraph, carveSafeHouse, safeHouses, movesFor } from '../src/boss-mechanics.js';

// Stages 19..34 replay the six worlds one cycle later, which is the only place
// every guardian has its full repertoire unlocked at once.
const WORLD_STAGES = [1, 4, 7, 10, 13, 16], LATE_STAGES = [19, 22, 25, 28, 31, 34];
const key = c => `${c.x},${c.z}`;
const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
function setup(stage = 1, seed = 7) {
  const g = new Game({ random: seededRandom(seed), meta: { unlockedStage: 40 } });
  assert(g.start(stage));
  g.enemies = []; g.pickups = []; g.spawnClock = Infinity; g.hazardClock = Infinity;
  for (let z = 1; z < g.height - 1; z++) for (let x = 1; x < g.width - 1; x++) g.grid[z][x] = 0;
  g.player.x = 2; g.player.z = 2; g.player.invincible = 0;
  g.spawnBoss(); g.boss.entranceTimer = 0; g.boss.cooldown = 999; g.boss.attackCooldown = 999;
  g.spawnClock = Infinity; g.drainEvents(); return g;
}
function force(g, id, phase) {
  const b = g.boss;
  b.phase = phase; b.riteCounter = 9; b.comboQueue = [id]; b.castTimer = 0; b.recovery = 0; g.warnings = [];
  const chosen = g.bossAttack();
  assert.equal(chosen?.id, id, `${g.biome.id}/${id} could not be forced`);
  return g.warnings.at(-1);
}

test('every guardian pattern paints a telegraphed warning before it can damage anything', () => {
  for (const stage of LATE_STAGES) {
    for (const chosen of movesFor(setup(stage).biome.id)) {
      const g = setup(stage), warning = force(g, chosen.id, chosen.phase >= 3 ? 3 : chosen.phase);
      assert(warning.cells.length, `${g.biome.id}/${chosen.id} produced no cells`);
      assert(warning.timer >= MIN_TELEGRAPH, `${g.biome.id}/${chosen.id} telegraph ${warning.timer}`);
      assert.equal(warning.timer, warning.duration);
      const announced = g.drainEvents().find(e => e.type === 'warning');
      assert(announced && announced.name && announced.duration === warning.duration);
      // Nothing is hurt while the mark is still on the floor.
      const hp = g.player.hp; g.player.x = warning.cells[0].x; g.player.z = warning.cells[0].z;
      g.tick(warning.duration - .05); assert.equal(g.player.hp, hp);
      g.tick(.1); assert(g.player.hp < hp, `${g.biome.id}/${chosen.id} never resolved`);
    }
  }
});

test('every pattern leaves a safe house the player can still walk to', () => {
  for (const stage of LATE_STAGES) for (const chosen of movesFor(setup(stage).biome.id)) {
    const g = setup(stage), warning = force(g, chosen.id, chosen.phase >= 3 ? 3 : chosen.phase);
    assert(safeHouses(g, warning.cells, warning.duration).length, `${g.biome.id}/${chosen.id} has no escape`);
    assert(!warning.cells.some(c => c.x === 0 || c.z === 0 || c.x === g.width - 1 || c.z === g.height - 1));
  }
});

test('a cornered player keeps one clean tile even under a pattern that covers everything', () => {
  const g = setup(1); g.boss.phase = 3;
  // Seal the player into a three tile pocket, then fire a pattern over all of it.
  g.player.x = 1; g.player.z = 1; g.grid[1][3] = 1; g.grid[3][1] = 1; g.grid[2][2] = 1;
  const cells = [];
  for (let z = 1; z <= 2; z++) for (let x = 1; x <= 2; x++) cells.push({ x, z });
  const carved = carveSafeHouse(g, cells, 1.2);
  assert(carved.length < cells.length);
  assert(safeHouses(g, carved, 1.2).length, 'a sealed player still needs somewhere to stand');
});

test('combat runs in three acts with thresholds at 60% and 30% of the guardian health', () => {
  const g = setup(4); g.player.invincible = 999;
  assert.equal(g.boss.phase, 1); assert.equal(bossPhaseFor(g.boss), 1);
  g.boss.hp = Math.ceil(g.boss.maxHp * .61); g.tick(.05);
  assert.equal(g.boss.phase, 1); assert(!g.drainEvents().some(e => e.type === 'bossPhase'));
  g.boss.hp = Math.ceil(g.boss.maxHp * .6); g.tick(.05);
  assert.equal(g.boss.phase, 2); assert.equal(g.boss.enraged, true);
  let events = g.drainEvents();
  assert.equal(events.filter(e => e.type === 'bossPhase').length, 1);
  assert.equal(events.find(e => e.type === 'bossPhase').label, PHASE_LABELS[2]);
  assert.equal(events.filter(e => e.type === 'bossEnraged').length, 1);
  g.boss.hp = Math.ceil(g.boss.maxHp * .31); g.tick(.05);
  assert.equal(g.boss.phase, 2); assert(!g.drainEvents().some(e => e.type === 'bossPhase'));
  g.boss.hp = Math.max(1, Math.floor(g.boss.maxHp * .3)); g.tick(.05);
  assert.equal(g.boss.phase, 3);
  events = g.drainEvents();
  assert.equal(events.filter(e => e.type === 'bossPhase').length, 1);
  assert.equal(events.find(e => e.type === 'bossPhase').phase, 3);
  // Fury never fires twice and the act never rolls back on later ticks.
  assert.equal(events.filter(e => e.type === 'bossEnraged').length, 0);
  for (let i = 0; i < 40; i++) g.tick(.05);
  assert.equal(g.boss.phase, 3); assert(!g.drainEvents().some(e => e.type === 'bossPhase'));
});

test('each phase change reopens the arena so fresh anchors are always available', () => {
  for (const stage of WORLD_STAGES) {
    const g = setup(stage); g.player.invincible = 999; g.anchors = [];
    g.boss.hp = Math.ceil(g.boss.maxHp * .5); g.tick(.05);
    assert(g.warnings.some(w => w.rite), `stage ${stage} phase 2 rite`);
    for (let i = 0; i < 80 && !g.anchors.length; i++) g.tick(.05);
    assert(g.anchors.length, `stage ${stage} planted no anchor on the fury shift`);
    const anchor = g.anchors[0];
    g.boss.comboQueue = ['x']; g.boss.retreat = 2;
    g.applyFlame({ cells: [anchor], damage: 9, hit: new Set(), enemy: false });
    assert.equal(g.boss.stagger, 4); assert.deepEqual(g.boss.comboQueue, []); assert.equal(g.boss.retreat, 0);
  }
});

test('early rounds teach with two patterns and long marks, late rounds are quick and varied', () => {
  const early = setup(1), late = setup(16);
  early.boss.phase = late.boss.phase = 3;
  assert.equal(bossRepertoire(early, early.boss).filter(m => !m.signature).length, 2);
  assert(bossRepertoire(late, late.boss).length > bossRepertoire(early, early.boss).length);
  assert(bossTelegraph(early, early.boss) > bossTelegraph(late, late.boss) + .4);
  const opener = setup(1); opener.boss.phase = 1;
  assert(bossTelegraph(opener, opener.boss) >= 1.6, 'the first world must stay readable');
  // Rounds one to three never unlock a dash or a teleport.
  assert(!bossRepertoire(opener, { ...opener.boss, phase: 3 }).some(m => m.dash || m.teleport));
});

test('a combo links two marked hits instead of one random pattern per beat', () => {
  const g = setup(13); const b = g.boss;
  const combo = movesFor(g.biome.id).find(m => m.combo);
  force(g, combo.id, 2);
  assert.deepEqual(b.comboQueue, [combo.combo]);
  const first = g.warnings.at(-1);
  g.tick(first.duration + .02); g.drainEvents();
  b.recovery = 0; b.castTimer = 0; b.riteCounter = 9;
  assert.equal(g.bossAttack().id, combo.combo, 'the queued follow-up must land next');
  assert.deepEqual(b.comboQueue, []);
});

test('a dash only travels after its lane was marked, and never through a bomb', () => {
  const g = setup(31); const b = g.boss;
  const dash = movesFor(g.biome.id).find(m => m.dash);
  const warning = force(g, dash.id, dash.phase >= 3 ? 3 : dash.phase);
  const from = { x: b.x, z: b.z };
  assert(warning.path.length >= 2);
  assert(warning.path.every(c => warning.cells.some(d => key(c) === key(d))), 'the whole lane is telegraphed');
  g.tick(warning.duration - .1); assert.equal(b.x, from.x); assert.equal(b.z, from.z);
  g.tick(.2);
  assert(distance(from, b) > 0, 'the guardian commits to its lane on impact');
  assert(warning.path.some(c => c.x === b.x && c.z === b.z));
  const g2 = setup(31), b2 = g2.boss;
  const w2 = force(g2, dash.id, dash.phase >= 3 ? 3 : dash.phase);
  const blocked = w2.path[1];
  g2.bombs = [{ id: 900, x: blocked.x, z: blocked.z, fuse: 99, range: 1 }];
  g2.tick(w2.duration + .05);
  assert.deepEqual({ x: b2.x, z: b2.z }, w2.path[0], 'a dash stops in front of a live bomb');
});

test('Nyxara only blinks to a tile she already painted', () => {
  for (const chosen of movesFor('abyss').filter(m => m.teleport)) {
    const g = setup(25), b = g.boss;
    const warning = force(g, chosen.id, chosen.phase >= 3 ? 3 : chosen.phase);
    assert(warning.landing);
    const from = { x: b.x, z: b.z };
    g.tick(warning.duration - .1); assert.deepEqual({ x: b.x, z: b.z }, from);
    g.tick(.2);
    assert.deepEqual({ x: b.x, z: b.z }, { x: warning.landing.x, z: warning.landing.z });
    assert(warning.cells.some(c => c.x === b.x && c.z === b.z));
    assert(g.drainEvents().some(e => e.type === 'bossTeleport'));
  }
});

test('Mórthos plants an extra rune when the bell tower falls', () => {
  const g = setup(19); g.anchors = [];
  const warning = force(g, 'campanario', 3);
  assert.equal(g.boss.retreat > 0, distance(g.boss, g.player) < 4);
  g.tick(warning.duration + .05);
  assert(g.anchors.length, 'the desperation move must hand the player a rune');
  assert(g.boss.recovery >= 1.4, 'a signature telegraph earns a wider counter window');
});

test('a guardian that called a move centred on itself walks away to make room', () => {
  const g = setup(19), b = g.boss;
  g.player.x = b.x + 1; g.player.z = b.z;
  force(g, 'campanario', 3);
  assert(b.retreat > 0);
  const gap = distance(b, g.player);
  let repositioned = 0, widest = gap;
  for (let i = 0; i < 120; i++) {
    g.tick(.05); g.player.invincible = 99;
    if (b.intent === 'reposition') { repositioned++; widest = Math.max(widest, distance(b, g.player)); }
  }
  // It only backs off once the mark has resolved, never during its own cast.
  assert(repositioned > 0, 'the guardian never entered its reposition state');
  assert(widest > gap, 'it must open the gap its own ring needs');
});

test('the guardian stays baitable: no bomb dodging in the first worlds', () => {
  const g = setup(1), b = g.boss;
  b.cooldown = 0; b.phase = 3; g.player.x = b.x + 5; g.player.z = b.z;
  g.bombs = [{ id: 900, x: b.x - 1, z: b.z, fuse: .25, range: 1, damage: 2 }];
  const before = distance(b, g.player);
  g.tick(.05);
  assert(distance(b, g.player) < before, 'early guardians keep walking the lure line');
  assert.equal(b.dodgeCooldown, 0);
  assert(!g.drainEvents().some(e => e.type === 'bossDodge'));
});

test('late guardians in fury flinch from a lit fuse, at most once every few seconds', () => {
  const g = setup(16), b = g.boss;
  b.cooldown = 0; b.phase = 2; g.player.x = b.x + 6; g.player.z = b.z;
  g.bombs = [{ id: 900, x: b.x - 1, z: b.z, fuse: .25, range: 1, damage: 2 }];
  g.tick(.05);
  assert(g.dangerMap().get(`${b.x},${b.z}`) === undefined, 'it steps off the lit tile');
  assert(b.dodgeCooldown > 4, 'and cannot repeat the trick immediately');
  assert(g.drainEvents().some(e => e.type === 'bossDodge'));
  // A second lure inside the cooldown still lands: the counter-play survives.
  b.cooldown = 0; g.bombs = [{ id: 901, x: b.x - 1, z: b.z, fuse: .25, range: 1, damage: 2 }];
  const at = { x: b.x, z: b.z }; g.tick(.05);
  assert(distance(at, b) <= 1);
  assert(!g.drainEvents().some(e => e.type === 'bossDodge'));
});
