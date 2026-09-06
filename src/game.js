import { WORLDS, stageFor, RELICS, relicById } from './campaign.js';
import { normalizeMeta, startingStats, settleLegacy } from './legacy.js';
export const WIDTH = 17;
export const HEIGHT = 15;
export const ROUND_SECONDS = 120;
export const BIOMES = WORLDS;
import { SKILLS, skillById } from './skills.js';
import { queueArenaRite, resolveArenaRite } from './boss-mechanics.js';
export { SKILLS };
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
export function seededRandom(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

export class Game {
  constructor({ random = Math.random, meta = {} } = {}) {
    this.random = random;
    this.meta = Object.assign(meta, normalizeMeta(meta));
    this.events = [];
    this.nextId = 1;
    this.phase = 'menu';
    this.reset();
  }
  emit(type, data = {}) { this.events.push({ ...data, entityType: data.type, type }); }
  drainEvents() { return this.events.splice(0); }
  reset(stage = 1) {
    this.round = stage; this.width = this.stage.width; this.height = this.stage.height;
    this.elapsed = 0; this.totalTime = 0; this.kills = 0; this.bosses = 0;
    this.crystals = 0; this.collected = 0; this.level = 1; this.xp = 0; this.nextXp = 36;
    this.forgeCount = 0; this.skillLevels = {}; this.masteries = []; this.wardTimer = 0; this.pendingLevels = 0; this.earnedShards = 0;
    this.combo = 0; this.comboTimer = 0; this.relics = []; this.echoes = []; this.miniSpawned = false;
    this.hazardClock = 10; this.resultClaimed = false; this.result = null; this.relicDropCount = 0;
    this.materials = { scrap: 0, cores: 0 }; this.cratesBroken = 0;
    this.player = { x: 1, z: 1, hp: 100 + (this.meta.health || 0) * 10, maxHp: 100 + (this.meta.health || 0) * 10,
      damage: 2 + (this.meta.power || 0), range: 2, capacity: 2, step: .19, fuse: 2.1,
      magnet: 1.25, dashMax: 3.5, dashCooldown: 0, invincible: 0, moveCooldown: 0, vampire: 0, facing: [0, 1], fire: 'normal', armor: 0, revive: false };
    Object.assign(this.player, startingStats(this.meta), { slow: 0 });
    this.generateArena();
  }
  get stage() { return stageFor(this.round); }
  get biome() { return this.stage.world; }
  get intelligence() { return Math.min(.85, (this.round - 1) * .065 + this.elapsed / 120 * (this.round === 1 ? .04 : .08)); }
  get enemyLimit() { return 4 + Math.min(14, this.round) + Math.floor(this.elapsed / 60); }
  get spawnInterval() { return Math.max(3, 11 - (this.round - 1) * .6 - this.elapsed / 90) + (this.boss ? 4 : 0); }
  get forgeCost() { return Math.floor((20 + this.forgeCount * 10) * (this.masteries.includes('alchemy') ? .75 : 1)); }
  get active() { return this.phase === 'playing' || this.phase === 'boss'; }
  generateArena() {
    const { width, height, layout, worldIndex } = this.stage;
    this.grid = Array.from({ length: height }, (_, z) => Array.from({ length: width }, (_, x) => {
      if (x === 0 || z === 0 || x === width - 1 || z === height - 1) return 1;
      const centerX = Math.floor(width / 2), centerZ = Math.floor(height / 2);
      const open = layout === 'courtyard' && Math.abs(x - centerX) <= 2 && Math.abs(z - centerZ) <= 2 || layout === 'crossroads' && (x === centerX || z === centerZ) || layout === 'lanes' && z % 4 === 2 || layout === 'gardens' && (Math.abs(x - centerX) <= 1 || z % 6 === 3) || layout === 'bridges' && (z % 4 === 2 || x === centerX);
      if (x % 2 === 0 && z % 2 === 0 && !open) return 1;
      if (x + z <= 5 || (x === 1 && z <= 5) || (z === 1 && x <= 5)) return 0;
      return !open && this.random() < .30 + worldIndex * .025 ? 2 : 0;
    }));
    this.bombs = []; this.flames = []; this.enemies = []; this.pickups = []; this.warnings = [];
    this.anchors = []; this.boss = null; this.spawnClock = this.round === 1 ? 10 : 7; this.player.x = 1; this.player.z = 1;
    this.player.invincible = 2; this.player.moveCooldown = 0; this.player.dashCooldown = 0;
    for (const [x, z] of [[3, 1], [1, 4], [5, 1], [7, 5], [11, 9]]) {
      this.grid[z][x] = 0; this.addPickup(x, z, 'crystal', 2);
    }
    // A cache close to spawn teaches item collection in every stage.
    const cache = { x: 3, z: 3 }; this.grid[cache.z][cache.x] = 2;
    this.cacheCell = cache;
    for (let i = 0; i < 2 + Math.min(6, Math.floor(this.round / 2)); i++) this.spawnEnemy();
    this.emit('arena');
  }
  start(stage = 1) {
    if (!Number.isInteger(stage) || stage < 1 || stage > Math.max(1, this.meta.unlockedStage || 1)) return false;
    this.reset(stage); this.phase = 'playing'; this.emit('start'); return true;
  }
  returnToMap() { if (this.active || this.phase === 'upgrade') return false; this.phase = 'menu'; this.emit('map'); return true; }
  claimResult() {
    if (this.resultClaimed || !this.result) return false;
    this.resultClaimed = true;
    this.meta.shards = (this.meta.shards || 0) + this.earnedShards;
    this.meta.runs = (this.meta.runs || 0) + 1;
    this.meta.bestRound = Math.max(this.meta.bestRound || 0, this.round);
    this.meta.bestKills = Math.max(this.meta.bestKills || 0, this.kills);
    if (this.result.victory) this.meta.unlockedStage = Math.max(this.meta.unlockedStage || 1, this.round + 1);
    settleLegacy(this);
    return true;
  }
  tile(x, z) { return this.grid[z]?.[x] ?? 1; }
  walkable(x, z, from = null) {
    if (this.tile(x, z) !== 0) return false;
    return !this.bombs.some(b => b.x === x && b.z === z && !(from && from.x === x && from.z === z));
  }
  move(dx, dz) {
    if (!this.active || this.player.moveCooldown > 0) return false;
    const p = this.player;
    p.facing = [dx, dz];
    if (!this.walkable(p.x + dx, p.z + dz, p)) return false;
    p.x += dx; p.z += dz; p.moveCooldown = p.step * (p.slow > 0 ? 1.6 : 1);
    this.collect(); return true;
  }
  dash() {
    const p = this.player;
    if (!this.active || p.dashCooldown > 0) return false;
    const fromX = p.x, fromZ = p.z;
    let moved = 0;
    for (let i = 0; i < 3; i++) {
      if (!this.walkable(p.x + p.facing[0], p.z + p.facing[1], p)) break;
      p.x += p.facing[0]; p.z += p.facing[1]; moved++;
    }
    if (!moved) return false;
    p.dashCooldown = p.dashMax; p.invincible = Math.max(p.invincible, this.masteries.includes('speed') ? 1 : .5); p.slow = 0; p.moveCooldown = 0;
    this.emit('dash', { x: p.x, z: p.z, fromX, fromZ });
    const level = this.skillLevels.afterglow || 0;
    if (level) {
      const cells = Array.from({length:moved+1}, (_,i) => ({x:fromX+p.facing[0]*i,z:fromZ+p.facing[1]*i}));
      if (level >= 5) for (const [dx,dz] of DIRS) if (this.tile(p.x+dx,p.z+dz)===0) cells.push({x:p.x+dx,z:p.z+dz});
      this.applyFlame({ cells, damage: level >= 5 ? 8 : level, hit: new Set(), friendly: true, secondary: true });
      this.emit('comet', { cells, x:p.x, z:p.z });
    }
    this.collect(); return true;
  }
  plantBomb() {
    if (!this.active || this.bombs.length >= this.player.capacity) return false;
    const p = this.player;
    if (this.bombs.some(b => b.x === p.x && b.z === p.z)) return false;
    this.bombs.push({ id: this.nextId++, x: p.x, z: p.z, fuse: p.fuse, maxFuse: p.fuse, range: p.range, damage: p.damage + (this.masteries.includes('capacity') && this.bombs.length === p.capacity-1 ? 4 : 0) + (this.masteries.includes('fuse') && !this.bombs.length ? 3 : 0) + (this.relics.includes('overdrive') && this.bombs.length === p.capacity - 1 ? 2 : 0) });
    this.emit('bomb', { x: p.x, z: p.z }); return true;
  }
  blastCells(bomb) {
    const cells = [{ x: bomb.x, z: bomb.z }];
    for (const [dx, dz] of DIRS) {
      let pierced = 0;
      for (let i = 1; i <= bomb.range; i++) {
        const x = bomb.x + dx * i, z = bomb.z + dz * i;
        if (this.tile(x, z) === 1) break;
        cells.push({ x, z });
        if (this.tile(x, z) === 2 && pierced++ >= (this.player.pierce || 0)) break;
      }
    }
    const diagonal = this.masteries.includes('shrapnel') ? 4 : Math.ceil((this.skillLevels.shrapnel || 0)/2);
    for (const [dx,dz] of [[1,1],[-1,1],[1,-1],[-1,-1]]) for (let i=1;i<=diagonal;i++) {
      const x=bomb.x+dx*i,z=bomb.z+dz*i;
      if (this.tile(x,z)===1) break;
      cells.push({x,z}); if (this.tile(x,z)===2) break;
    }
    return cells;
  }
  explode(bomb) {
    if (!this.bombs.includes(bomb)) return;
    this.bombs = this.bombs.filter(b => b !== bomb);
    const cells = this.blastCells(bomb);
    const flame = { id: this.nextId++, cells, life: this.player.fire === 'azure' ? 1.1 : .62, damage: bomb.damage, hit: new Set(), enemy: false, fire: this.player.fire };
    this.flames.push(flame);
    for (const c of cells) {
      if (this.tile(c.x, c.z) === 2) {
        this.grid[c.z][c.x] = 0;
        this.cratesBroken++;
        if (this.cratesBroken % 2 === 0) this.addPickup(c.x, c.z, 'scrap', 1);
        this.emit('crate', c);
        if (c.x === this.cacheCell?.x && c.z === this.cacheCell?.z || this.random() < .045) this.dropRelic(c.x, c.z);
        else this.addPickup(c.x, c.z, this.random() < .10 ? 'heart' : 'crystal', 2 + Math.floor(this.random() * 3));
      }
      const chained = this.bombs.find(b => b.x === c.x && b.z === c.z);
      if (chained) this.explode(chained);
    }
    if (this.relics.includes('echo')) this.echoes.push({ id: this.nextId++, cells, timer: .85, damage: Math.max(1, Math.ceil(bomb.damage / 2)), fire: this.player.fire });
    this.emit('explosion', { cells, x: bomb.x, z: bomb.z, fire: this.player.fire });
    this.applyFlame(flame);
  }
  addPickup(x, z, type = 'crystal', value = 3) { this.pickups.push({ id: this.nextId++, x, z, type, value }); }
  dropRelic(x, z) {
    const pending = this.pickups.filter(p => p.type === 'relic').map(p => p.value);
    const available = RELICS.filter(r => !this.relics.includes(r.id) && !pending.includes(r.id));
    const favored = available.filter(r => this.biome.loot.includes(r.id));
    const pool = favored.length && this.random() < .7 ? favored : available;
    if (!pool.length) { this.addPickup(x, z, 'crystal', 6); return; }
    const relic = pool[Math.floor(this.random() * pool.length)]; this.relicDropCount++;
    this.addPickup(x, z, 'relic', relic.id); this.emit('relicDrop', { x, z, id: relic.id });
  }
  equipRelic(id) {
    if (!relicById(id) || this.relics.includes(id)) return false;
    this.relics.push(id); const p = this.player;
    if (id === 'azure') { p.fire = 'azure'; p.damage++; }
    if (id === 'clock') { p.fuse += 1; p.damage += 2; p.range++; }
    if (id === 'shell') { p.maxHp += 20; p.hp += 20; p.armor = Math.min(.6, p.armor + .2); }
    if (id === 'magnet') { p.magnet += 2; p.capacity++; }
    if (id === 'phoenix') p.revive = true;
    if (id === 'pierce') p.pierce = 1;
    if (id === 'mercy') p.ward = 1;
    this.emit('relic', { id, x: p.x, z: p.z }); return true;
  }
  collect() {
    for (const pickup of [...this.pickups]) {
      if (distance(this.player, pickup) > this.player.magnet) continue;
      // Magnet never pulls through stone walls or unopened crates.
      if (!this.reachableWithin(this.player, pickup, Math.floor(this.player.magnet))) continue;
      this.pickups = this.pickups.filter(p => p !== pickup);
      if (pickup.type === 'relic') this.equipRelic(pickup.value);
      else if (pickup.type === 'heart') { this.player.hp = Math.min(this.player.maxHp, this.player.hp + 20); if (this.relics.includes('mercy')) this.player.ward = 1; }
      else if (pickup.type === 'scrap' || pickup.type === 'cores') this.materials[pickup.type] += pickup.value;
      else { this.crystals += pickup.value; this.collected += pickup.value; this.xp += Math.round(pickup.value * 3 * (1 + (this.skillLevels.alchemy || 0) * .12)); if (this.masteries.includes('magnet')) this.player.hp = Math.min(this.player.maxHp, this.player.hp + pickup.value); }
      this.emit('pickup', pickup);
    }
    while (this.xp >= this.nextXp) {
      this.xp -= this.nextXp; this.level++; this.nextXp = 36 + (this.level - 1) * 9; this.pendingLevels++;
    }
  }
  reachableWithin(start, target, limit) {
    const q = [{ ...start, d: 0 }], seen = new Set([`${start.x},${start.z}`]);
    while (q.length) {
      const p = q.shift();
      if (p.x === target.x && p.z === target.z) return true;
      if (p.d >= limit) continue;
      for (const [dx, dz] of DIRS) {
        const x = p.x + dx, z = p.z + dz, key = `${x},${z}`;
        if (this.tile(x, z) === 0 && !seen.has(key)) { seen.add(key); q.push({ x, z, d: p.d + 1 }); }
      }
    }
    return false;
  }
  spawnEnemy(forcedType = null) {
    const candidates = [];
    for (let z = 1; z < this.height - 1; z++) for (let x = 1; x < this.width - 1; x++) {
      if (this.walkable(x, z) && distance({ x, z }, this.player) > 5 && !this.enemies.some(e => e.x === x && e.z === z)) candidates.push({ x, z });
    }
    if (!candidates.length) return;
    const cell = candidates[Math.floor(this.random() * candidates.length)];
    const pool = this.round === 1 && this.elapsed < 65 ? ['slime'] : this.biome.enemies;
    const type = forcedType || pool[Math.floor(this.random() * pool.length)];
    const hp = ({ slime: 2, ember: 3, beetle: 5, wisp: 3, sentinel: 12, spore: 3, weaver: 3, oracle: 4, mimic: 4 }[type] || 2) + Math.floor((this.round - 1) * .35);
    const enemy = { id: this.nextId++, ...cell, type, hp, maxHp: hp, cooldown: 1 + this.random(), hitFlash: 0, intent: 'hunt', awareness: this.random(), chargeCooldown: 3, castCooldown: 4, slow: 0, windup: 0, chargeSteps: 0 };
    if (type === 'mimic') { enemy.awake = false; enemy.intent = 'disguise'; }
    this.enemies.push(enemy); return enemy;
  }
  dangerMap() {
    const result = new Map(), times = new Map(this.bombs.map(b => [b.id, b.fuse]));
    const blasts = new Map(this.bombs.map(b => [b.id, this.blastCells(b)]));
    // A long fuse can be ignited early by another bomb in the chain.
    for (let pass = 0; pass < this.bombs.length; pass++) {
      let changed = false;
      for (const a of this.bombs) for (const b of this.bombs) {
        if (times.get(a.id) < times.get(b.id) && blasts.get(a.id).some(c => c.x === b.x && c.z === b.z)) { times.set(b.id, times.get(a.id)); changed = true; }
      }
      if (!changed) break;
    }
    const add = (cells, time) => { for (const c of cells) { const key = `${c.x},${c.z}`; result.set(key, Math.min(result.get(key) ?? Infinity, time)); } };
    for (const b of this.bombs) add(blasts.get(b.id), times.get(b.id));
    for (const echo of this.echoes) add(echo.cells, echo.timer);
    return result;
  }
  occupied(x, z, self) {
    return [...this.enemies, ...(this.boss ? [this.boss] : [])].some(e => e !== self && e.x === x && e.z === z);
  }
  pathStep(enemy, target, hazards, escape = false) {
    const q = [{ x: enemy.x, z: enemy.z, first: null, depth: 0 }], seen = new Set([`${enemy.x},${enemy.z}`]);
    while (q.length) {
      const cell = q.shift();
      if (escape ? cell.first && !hazards.has(`${cell.x},${cell.z}`) : cell.x === target.x && cell.z === target.z) return cell.first;
      if (escape && cell.depth >= 5) continue;
      const dirs = enemy.id % 2 ? DIRS : [...DIRS].reverse();
      for (const [dx, dz] of dirs) {
        const x = cell.x + dx, z = cell.z + dz, key = `${x},${z}`;
        if (seen.has(key) || !this.walkable(x, z)) continue;
        if (this.occupied(x, z, enemy)) continue;
        const danger = hazards.get(key);
        if (danger !== undefined && (danger <= 0 || (!escape && danger < 1.15))) continue;
        seen.add(key); q.push({ x, z, first: cell.first || { x, z }, depth: cell.depth + 1 });
      }
    }
    return null;
  }
  nextStep(enemy, hazards = this.dangerMap()) {
    // Awareness is individual, not a fresh random roll every frame. Early slimes
    // keep chasing across bomb forecasts; later worlds learn to seek shelter.
    const aware = (enemy.awareness ?? .5) < this.intelligence;
    const planningHazards = aware ? hazards : new Map([...hazards].filter(([, time]) => time <= 0));
    if (enemy.type !== 'boss' && aware && (hazards.get(`${enemy.x},${enemy.z}`) ?? Infinity) < .35 + this.intelligence * .8) {
      enemy.intent = 'evade';
      return this.pathStep(enemy, this.player, hazards, true);
    }
    enemy.intent = 'hunt';
    if (['wisp', 'spore', 'weaver', 'oracle'].includes(enemy.type) && !planningHazards.has(`${enemy.x},${enemy.z}`)) {
      const dist = distance(enemy, this.player);
      if (dist >= 3 && dist <= 6) { enemy.intent = 'aim'; return null; }
      if (dist < 3) {
        const retreat = DIRS.map(([dx,dz]) => ({ x: enemy.x + dx, z: enemy.z + dz })).find(c => this.walkable(c.x,c.z) && !this.occupied(c.x,c.z,enemy) && !planningHazards.has(`${c.x},${c.z}`) && distance(c,this.player) > dist);
        if (retreat) { enemy.intent = 'retreat'; return retreat; }
      }
    }
    let target = this.player;
    // Some hunters intercept the next corridor instead of forming one long queue.
    if (this.intelligence > .35 && enemy.type === 'slime' && enemy.id % 3 === 0 && distance(enemy, this.player) > 3 && this.player.moveCooldown > 0) {
      const ahead = { x: this.player.x + this.player.facing[0] * 2, z: this.player.z + this.player.facing[1] * 2 };
      if (this.walkable(ahead.x, ahead.z)) { target = ahead; enemy.intent = 'flank'; }
    }
    return this.pathStep(enemy, target, planningHazards) || (target !== this.player ? this.pathStep(enemy, this.player, planningHazards) : null);
  }
  chargeLane(enemy) {
    const p = this.player, dist = distance(enemy, p);
    if (dist < 2 || dist > 5 || (enemy.x !== p.x && enemy.z !== p.z)) return null;
    const dx = Math.sign(p.x - enemy.x), dz = Math.sign(p.z - enemy.z), cells = [];
    for (let i = 1; i <= dist; i++) {
      const x = enemy.x + dx * i, z = enemy.z + dz * i;
      if (!this.walkable(x, z) || this.occupied(x, z, enemy)) return null;
      cells.push({ x, z });
    }
    return { dx, dz, cells };
  }
  hurt(amount) {
    if (!this.active || this.player.invincible > 0) return;
    if (this.player.ward > 0) { this.player.ward--; this.player.invincible = .9; if (this.masteries.includes('ward')) this.player.hp = Math.min(this.player.maxHp, this.player.hp + 10); this.emit('blocked', { x: this.player.x, z: this.player.z }); return; }
    amount = Math.ceil(amount * (1 - (this.player.armor || 0)));
    this.player.hp = Math.max(0, this.player.hp - amount); this.player.invincible = 1.4;
    this.emit('hurt', { x: this.player.x, z: this.player.z, amount });
    if (!this.player.hp && this.player.revive) {
      this.player.revive = false; this.player.hp = Math.ceil(this.player.maxHp / 2); this.player.invincible = 3;
      this.emit('revive', { x: this.player.x, z: this.player.z });
    } else if (!this.player.hp) this.die();
  }
  damageEnemy(enemy, damage) {
    if (!this.active || enemy.hp <= 0) return;
    if (enemy.type === 'boss' && enemy.stagger > 0) damage = Math.ceil(damage * 1.5);
    if (this.masteries.includes('frost') && enemy.frozen > 0) damage += 2;
    enemy.hp -= damage; enemy.hitFlash = .18;
    if (enemy.type === 'mimic') { enemy.awake = true; enemy.intent = 'hunt'; }
    const cold = this.skillLevels.frost || 0;
    if (cold || this.relics.includes('frost')) enemy.slow = Math.max(enemy.slow || 0, enemy.type === 'boss' ? 1.2 : Math.max(cold ? 1+ cold*.3 : 0,this.relics.includes('frost') ? 2.5 : 0));
    if (cold >= 5) enemy.frozen = enemy.type === 'boss' ? .5 : 2;
    this.emit('enemyHit', { ...enemy, damage });
      if (enemy.hp <= 0) {
        if (enemy.type === 'boss') this.defeatBoss();
        else {
          this.enemies = this.enemies.filter(e => e !== enemy); this.kills++;
          this.combo = this.comboTimer > 0 ? this.combo + 1 : 1; this.comboTimer = 4;
          this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.vampire);
          if (this.masteries.includes('dash')) this.player.dashCooldown = Math.max(0,this.player.dashCooldown-.6);
          if (this.masteries.includes('vampire') && this.player.hp === this.player.maxHp) this.player.ward = 1;
          this.addPickup(enemy.x, enemy.z, 'crystal', enemy.type === 'ember' ? 5 : 3);
          if (this.kills % 3 === 0) this.addPickup(enemy.x, enemy.z, 'scrap', 1);
          if (enemy.type === 'mimic') this.addPickup(enemy.x, enemy.z, 'scrap', 2);
          if (enemy.type === 'sentinel') { this.dropRelic(enemy.x, enemy.z); this.addPickup(enemy.x, enemy.z, 'cores', 1); this.earnedShards += 3; this.emit('miniDefeated', enemy); }
          else if (this.random() < .055) this.dropRelic(enemy.x, enemy.z);
          this.emit('kill', enemy);
        }
      }
  }
  applyFlame(flame) {
    // All impacts resolve once. Lingering graphics never become damage zones.
    if (flame.resolved || !this.active) return;
    flame.resolved = true;
    if (!flame.friendly && flame.cells.some(c => c.x === this.player.x && c.z === this.player.z)) {
      if (flame.effect === 'snare') { if (this.player.invincible <= 0) { this.player.slow = 2; this.emit('snared', {x:this.player.x,z:this.player.z}); } }
      else this.hurt(flame.enemy ? flame.damage ?? 25 : 20);
    }
    if (!this.active || flame.enemy) return;
    const targets = [...this.enemies, ...(this.boss ? [this.boss] : [])];
    const hit = targets.filter(e => !flame.hit.has(e.id) && flame.cells.some(c => c.x === e.x && c.z === e.z));
    for (const enemy of hit) { flame.hit.add(enemy.id); this.damageEnemy(enemy,flame.damage); }
    const chain = this.skillLevels.chain || 0;
    if (chain && hit.length && !flame.secondary && this.active) {
      let source = hit[0]; const used = new Set(hit.map(e=>e.id));
      for (let i=0;i<(chain >= 5 ? 5 : 2);i++) {
        const target = targets.filter(e => e.hp > 0 && !used.has(e.id) && distance(source,e)<=3 && this.reachableWithin(source,e,3)).sort((a,b)=>distance(source,a)-distance(source,b))[0];
        if (!target || !this.active) break;
        used.add(target.id); this.damageEnemy(target,chain);
        this.emit('chainArc', { from: {x:source.x,z:source.z}, x:target.x,z:target.z }); source=target;
      }
    }
    for (const anchor of [...this.anchors]) {
      if (!this.active || !flame.cells.some(c=>c.x===anchor.x&&c.z===anchor.z)) continue;
      anchor.hp -= flame.damage;
      if (anchor.hp <= 0) {
        this.anchors = this.anchors.filter(a=>a!==anchor);
        if (this.boss) { this.boss.stagger=4; this.boss.attackCooldown=Math.max(this.boss.attackCooldown,4); }
        this.addPickup(anchor.x,anchor.z,'crystal',3);
        this.emit('anchorBroken', anchor);
      }
    }
  }
  spawnBoss() {
    this.phase = 'boss';
    const x = Math.floor(this.width / 2), z = Math.floor(this.height / 2) - 1;
    for (let zz = z - 1; zz <= z + 1; zz++) for (let xx = x - 1; xx <= x + 1; xx++) {
      this.grid[zz][xx] = 0; this.emit('clear', { x: xx, z: zz });
    }
    const hp = 14 + this.round * 4;
    this.boss = { id: this.nextId++, x, z, type: 'boss', variant: this.biome.guardian || this.biome.id, name: this.biome.boss, hp, maxHp: hp, cooldown: 3.2, attackCooldown: 4, hitFlash: 0, attackIndex: 0, enraged: false };
    this.spawnClock = this.spawnInterval;
    this.emit('boss');
  }
  bossAttack() {
    if (!this.boss) return;
    const p = this.player, b = this.boss, cells = [], attack = b.attackIndex++;
    if (attack % 3 === 2 && queueArenaRite(this)) return;
    if (this.biome.id === 'garden' && attack % 2 === 0) {
      for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) if (Math.max(Math.abs(dx), Math.abs(dz)) === 2 && this.tile(p.x + dx, p.z + dz) === 0) cells.push({ x: p.x + dx, z: p.z + dz });
    } else if (this.biome.id === 'storm' && attack % 2 === 0) {
      for (const x of [p.x - 1, p.x + 1]) for (let z = 1; z < this.height - 1; z++) if (this.tile(x, z) === 0) cells.push({ x, z });
    } else if (this.biome.id === 'frost' && attack % 2 === 0) {
      for (let d = -3; d <= 3; d++) for (const sign of [-1, 1]) if (this.tile(p.x + d, p.z + d * sign) === 0) cells.push({ x: p.x + d, z: p.z + d * sign });
    } else if (this.stage.worldIndex === 1 && attack % 2 === 0) {
      for (let x = 1; x < this.width - 1; x++) if (this.tile(x, p.z) === 0) cells.push({ x, z: p.z });
      if (b.enraged) for (let z = 1; z < this.height - 1; z++) if (this.tile(p.x, z) === 0) cells.push({ x: p.x, z });
    } else if (this.stage.worldIndex === 2 && attack % 2 === 0) {
      for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) if (Math.max(Math.abs(dx), Math.abs(dz)) === 2 && this.tile(p.x + dx, p.z + dz) === 0) cells.push({ x: p.x + dx, z: p.z + dz });
      if (this.enemies.length < 12) this.spawnEnemy('wisp');
    } else if (attack % 2 === 1) {
      for (const [dx, dz] of DIRS) for (let i = 0; i <= (b.enraged ? 6 : 4); i++) {
        const x = b.x + dx * i, z = b.z + dz * i;
        if (this.tile(x, z) !== 0) break;
        if (!cells.some(c => c.x === x && c.z === z)) cells.push({ x, z });
      }
    } else {
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        if (this.tile(p.x + dx, p.z + dz) === 0) cells.push({ x: p.x + dx, z: p.z + dz });
      }
    }
    const duration = (b.enraged ? 1 : 1.2) + (this.round <= 3 ? .5 : .15);
    const names = { ruins: ['DOBRAR DOS SINOS', 'CRUZ DO SILÊNCIO'], forge: ['FORNALHA VIVA', 'RUPTURA ÍGNEA'], abyss: ['MARÉ DAS ALMAS', 'FENDA ESPECTRAL'], garden: ['COROA DE SEMENTES', 'RAÍZES DO SILÊNCIO'], storm: ['COLUNAS DO TROVÃO', 'CIRCUITO PARTIDO'], frost: ['LANÇAS DA AURORA', 'COROA DO INVERNO'] };
    this.warnings.push({ id: this.nextId++, cells, timer: duration, duration });
    this.emit('warning', { cells, duration, name: names[this.biome.id][attack % 2] });
  }
  defeatBoss() {
    if (!this.boss || !this.active) return;
    const boss = this.boss; this.boss = null; this.bosses++;
    this.earnedShards += this.stage.reward + Math.floor(this.kills / 5);
    this.materials.cores++;
    this.result = { victory: true, stage: this.round, shards: this.earnedShards };
    this.phase = 'intermission'; this.anchors = []; this.warnings = []; this.flames = []; this.bombs = []; this.echoes = [];
    this.emit('bossDefeated', boss);
  }
  nextRound() {
    if (this.phase !== 'intermission') return false;
    this.claimResult(); const next = this.round + 1; this.reset(next); this.phase = 'playing'; this.emit('nextRound'); return true;
  }
  openUpgrade(paid = false) {
    if (!this.active || (paid && this.crystals < this.forgeCost)) return false;
    this.upgradeReturn = this.phase;
    this.upgradeCost = paid ? this.forgeCost : 0;
    if (paid) { this.crystals -= this.forgeCost; this.forgeCount++; }
    else this.pendingLevels = Math.max(0, this.pendingLevels - 1);
    this.phase = 'upgrade'; this.rollOffers(); this.emit('upgrade'); return true;
  }
  rollOffers() {
    const available = SKILLS.filter(s => (this.skillLevels[s.id] || 0) < s.max && (s.id !== 'heal' || this.player.hp < this.player.maxHp));
    if (!available.length) available.push(SKILLS.find(s => s.id === 'heal'));
    this.offers = [];
    // One continuation plus two discoveries makes a five-pick build achievable.
    const owned = available.filter(s=>s.mastery && this.skillLevels[s.id] > 0 && this.skillLevels[s.id] < 5);
    if (owned.length) {
      const weighted = owned.flatMap(s=>Array.from({length:this.skillLevels[s.id]},()=>s));
      const chosen=weighted[Math.floor(this.random()*weighted.length)];
      this.offers.push(chosen); available.splice(available.indexOf(chosen),1);
    }
    while (available.length && this.offers.length < 3) this.offers.push(available.splice(Math.floor(this.random() * available.length), 1)[0]);
  }
  reroll() {
    if (this.phase !== 'upgrade' || this.crystals < 6) return false;
    this.crystals -= 6; this.rollOffers(); this.emit('upgrade'); return true;
  }
  chooseSkill(id) {
    if (this.phase !== 'upgrade' || !this.offers.some(s => s.id === id)) return false;
    this.skillLevels[id] = (this.skillLevels[id] || 0) + 1;
    const p = this.player;
    switch (id) {
      case 'power': p.damage++; break;
      case 'range': p.range++; break;
      case 'capacity': p.capacity++; break;
      case 'speed': p.step *= .9; break;
      case 'health': p.maxHp += 25; p.hp = Math.min(p.maxHp, p.hp + 35); break;
      case 'magnet': p.magnet++; break;
      case 'fuse': p.fuse *= .88; break;
      case 'dash': p.dashMax *= .82; break;
      case 'heal': p.hp = Math.min(p.maxHp, p.hp + 50); break;
      case 'vampire': p.vampire += 2; break;
      case 'shrapnel': if (this.skillLevels.shrapnel % 2 === 0) p.damage++; break;
      case 'ward': p.ward = 1; this.wardTimer = Math.max(6,20-this.skillLevels.ward*2); break;
    }
        this.phase = this.upgradeReturn;
    const skill = skillById(id);
    this.emit('skill', { id, color: skill.color });
    if (skill.mastery && this.skillLevels[id] === 5 && !this.masteries.includes(id)) {
      this.masteries.push(id);
      if (id==='power') { p.fire='azure'; p.damage+=2; }
      if (id==='range') p.pierce=Math.max(1,p.pierce||0);
      if (id==='health') { p.armor=Math.min(.6,(p.armor||0)+.2); p.hp=p.maxHp; }
      if (id==='magnet') p.magnet+=3;
      if (id==='shrapnel') p.damage++;
      if (id==='ward') this.wardTimer=6;
      this.emit('mastery', { id, name:skill.mastery, desc:skill.awakening, color:skill.color, x:p.x,z:p.z });
    }
    return true;
  }
  pause() {
    if (this.active) { this.resumePhase = this.phase; this.phase = 'paused'; this.emit('pause'); }
    else if (this.phase === 'paused') { this.phase = this.resumePhase; this.emit('resume'); }
  }
  die() {
    if (this.phase === 'dead') return;
    this.phase = 'dead'; this.earnedShards += Math.floor(this.kills / 5);
    this.result = { victory: false, stage: this.round, shards: this.earnedShards }; this.emit('dead');
  }
  environmentAttack() {
    if (!this.stage.worldIndex) return;
    const cells = [];
    if (this.biome.id === 'garden') {
      const p = this.player;
      for (const [dx, dz] of [[0, 0], [2, 0], [-2, 0], [0, 2], [0, -2]]) if (this.tile(p.x + dx, p.z + dz) === 0) cells.push({ x: p.x + dx, z: p.z + dz });
    } else if (this.biome.id === 'storm') {
      const x = this.player.x;
      for (let z = 1; z < this.height - 1; z++) if (this.tile(x, z) === 0) cells.push({ x, z });
    } else if (this.biome.id === 'frost') {
      for (const [dx, dz] of [[0, 0], ...DIRS]) if (this.tile(this.player.x + dx, this.player.z + dz) === 0) cells.push({ x: this.player.x + dx, z: this.player.z + dz });
    } else if (this.stage.worldIndex === 1) {
      for (let i = 0; i < 3 + this.stage.local; i++) {
        const x = 1 + Math.floor(this.random() * (this.width - 2)), z = 1 + Math.floor(this.random() * (this.height - 2));
        if (this.tile(x, z) === 0) cells.push({ x, z });
      }
    } else {
      const z = 1 + Math.floor(this.random() * (this.height - 2));
      for (let x = 1; x < this.width - 1; x++) if (this.tile(x, z) === 0) cells.push({ x, z });
    }
    if (cells.length) { this.warnings.push({ id: this.nextId++, cells, timer: this.stage.worldIndex >= 3 ? 2 : 1.65, environment: true, effect: this.biome.id === 'frost' ? 'snare' : null }); this.emit('hazard', { cells }); }
  }
  specialEnemy(enemy, dt) {
    if (enemy.type === 'mimic' && !enemy.awake) {
      enemy.intent = 'disguise';
      if (distance(enemy, this.player) <= 3) { enemy.awake = true; enemy.cooldown = 1.1; enemy.intent = 'ambush'; this.emit('mimicAwake', enemy); }
      return true;
    }
    if (enemy.type === 'oracle') {
      if (enemy.mending > 0) {
        enemy.mending = Math.max(0, enemy.mending - dt); enemy.intent = 'mend';
        if (!enemy.mending) {
          const targets = this.enemies.filter(e => e !== enemy && e.type !== 'oracle' && e.hp > 0 && e.hp < e.maxHp && distance(e, enemy) <= 4).slice(0, 3);
          for (const target of targets) { const amount = Math.min(2, target.maxHp - target.hp); target.hp += amount; this.emit('enemyHeal', { ...target, amount }); }
          enemy.intent = 'hunt';
        }
        return true;
      }
      if (enemy.castCooldown <= 0 && this.enemies.some(e => e !== enemy && e.type !== 'oracle' && e.hp < e.maxHp && distance(e, enemy) <= 4)) {
        enemy.mending = 1.1; enemy.castCooldown = 6; enemy.intent = 'mend'; this.emit('enemyMend', enemy); return true;
      }
    }
    if (['spore', 'weaver'].includes(enemy.type) && enemy.castCooldown <= 0 && distance(enemy, this.player) < 9) {
      const cells = [{ x: this.player.x, z: this.player.z }];
      if (enemy.type === 'spore') for (const [dx, dz] of DIRS) if (this.tile(this.player.x + dx, this.player.z + dz) === 0) cells.push({ x: this.player.x + dx, z: this.player.z + dz });
      this.warnings.push({ id: this.nextId++, cells, timer: 1.8, effect: enemy.type === 'weaver' ? 'snare' : null, damage: 16 });
      enemy.castCooldown = 6; enemy.cooldown = 1.3; enemy.intent = 'cast'; this.emit('enemyCast', enemy);
    }
    return false;
  }
  tick(dt) {
    if (!this.active) return;
    this.totalTime += dt;
    this.anchors = this.anchors.filter(a=>(a.life-=dt)>0);
    if (this.skillLevels.ward) {
      this.wardTimer -= dt;
      if (this.wardTimer<=0) { this.wardTimer=this.masteries.includes('ward')?6:20-this.skillLevels.ward*2; this.player.ward=1; this.emit('wardReady',{x:this.player.x,z:this.player.z}); }
    }
    this.comboTimer = Math.max(0, this.comboTimer - dt); if (!this.comboTimer) this.combo = 0;
    const p = this.player;
    p.slow = Math.max(0, (p.slow || 0) - dt);
    p.invincible = Math.max(0, p.invincible - dt); p.moveCooldown = Math.max(0, p.moveCooldown - dt); p.dashCooldown = Math.max(0, p.dashCooldown - dt);
    if (this.phase === 'playing') {
      this.elapsed = Math.min(ROUND_SECONDS, this.elapsed + dt);
      if (this.stage.miniboss && !this.miniSpawned && this.elapsed >= 60) {
        const mini = this.spawnEnemy('sentinel');
        if (mini) { this.miniSpawned = true; this.emit('miniboss', mini); }
      }
      if (this.elapsed >= ROUND_SECONDS) this.spawnBoss();
    }
    this.hazardClock -= dt;
    if (this.hazardClock <= 0) { this.hazardClock = Math.max(5, 12 - this.stage.local); this.environmentAttack(); }
    this.spawnClock -= dt;
    if (this.spawnClock <= 0) {
      this.spawnClock = this.spawnInterval;
      if (this.enemies.length < (this.boss ? Math.max(3, this.enemyLimit - 3) : this.enemyLimit)) this.spawnEnemy();
    }
    for (const echo of this.echoes) {
      echo.timer -= dt;
      if (echo.timer <= 0) {
        const flame = { ...echo, id: this.nextId++, life: .4, hit: new Set(), enemy: false };
        this.flames.push(flame); this.applyFlame(flame);
        this.emit('echo', { cells: echo.cells, x: echo.cells[0].x, z: echo.cells[0].z, fire: echo.fire });
      }
    }
    this.echoes = this.echoes.filter(e => e.timer > 0);
    if (!this.active) return;
    for (const b of [...this.bombs]) { b.fuse -= dt; if (b.fuse <= 0) this.explode(b); }
    for (const f of this.flames) f.life -= dt;
    this.flames = this.flames.filter(f => f.life > 0);
    if (!this.active) return;
    const hazards = this.dangerMap();
    for (const enemy of [...this.enemies, ...(this.boss ? [this.boss] : [])]) {
      let chargedThisTick = false;
      enemy.cooldown -= dt; enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
      enemy.slow = Math.max(0, (enemy.slow || 0) - dt);
      enemy.castCooldown = Math.max(0, (enemy.castCooldown ?? 4) - dt);
      enemy.frozen = Math.max(0,(enemy.frozen||0)-dt);
      enemy.stagger = Math.max(0,(enemy.stagger||0)-dt);
      if (enemy.frozen > 0 || enemy.stagger > 0) continue;
      if (this.specialEnemy(enemy, dt)) continue;
      if ((enemy.type === 'wisp' || enemy.type === 'sentinel') && enemy.castCooldown <= 0 && distance(enemy, p) < 9) {
        const cells = [{ x: p.x, z: p.z }];
        if (enemy.type === 'sentinel') for (const [dx, dz] of DIRS) if (this.tile(p.x + dx, p.z + dz) === 0) cells.push({ x: p.x + dx, z: p.z + dz });
        this.warnings.push({ id: this.nextId++, cells, timer: 1.3 });
        enemy.castCooldown = enemy.type === 'wisp' ? 4 : 5; enemy.cooldown = 1.3; enemy.intent = 'cast'; this.emit('enemyCast', enemy);
      }
      enemy.chargeCooldown = Math.max(0, (enemy.chargeCooldown || 0) - dt);
      if (enemy.windup > 0) {
        enemy.windup = Math.max(0, enemy.windup - dt);
        if (!enemy.windup) { enemy.chargeSteps = enemy.chargeCells.length; enemy.intent = 'charge'; enemy.cooldown = 0; this.emit('enemyCharge', enemy); }
        else { if (enemy.x === p.x && enemy.z === p.z) this.hurt(12); continue; }
      }
      if (enemy.cooldown <= 0) {
        if (enemy.chargeSteps > 0) {
          const x = enemy.x + enemy.chargeDir[0], z = enemy.z + enemy.chargeDir[1];
          if (this.walkable(x, z) && !this.occupied(x, z, enemy)) { enemy.x = x; enemy.z = z; enemy.chargeSteps--; chargedThisTick = true; this.emit('chargeTrail', enemy); }
          else enemy.chargeSteps = 0;
          enemy.cooldown = enemy.chargeSteps > 0 ? .11 : .8;
          if (!enemy.chargeSteps) { enemy.chargeCooldown = 3.4; enemy.intent = 'recover'; }
        } else {
          const lane = enemy.type === 'ember' && !enemy.chargeCooldown && !hazards.has(`${enemy.x},${enemy.z}`) ? this.chargeLane(enemy) : null;
          if (lane) {
            enemy.windup = this.round < 4 ? 1.1 : .8; enemy.chargeDir = [lane.dx, lane.dz]; enemy.chargeCells = lane.cells; enemy.intent = 'windup'; this.emit('enemyWindup', enemy);
          } else {
            const pos = this.nextStep(enemy, hazards);
            if (pos && !this.occupied(pos.x, pos.z, enemy)) { enemy.x = pos.x; enemy.z = pos.z; }
            enemy.cooldown = (enemy.intent === 'evade' ? .42 : enemy.type === 'boss' ? (enemy.enraged ? .75 : .95) : enemy.type === 'ember' ? .65 : enemy.type === 'beetle' ? 1.1 : .9) / (1 + Math.min(.5, (this.round - 1) * .035)) * (enemy.slow ? 1.8 : 1) * (this.round === 1 ? 1.35 : this.round === 2 ? 1.2 : 1);
          }
        }
      }
      if (enemy.x === p.x && enemy.z === p.z) this.hurt(enemy.type === 'boss' ? 30 : chargedThisTick || enemy.intent === 'charge' ? 20 : 12);
    }
    if (this.boss && this.active) {
      if (this.boss.hp <= this.boss.maxHp / 2 && !this.boss.enraged) {
        this.boss.enraged = true; this.boss.attackCooldown = 1.6;
        this.warnings = []; queueArenaRite(this);
        this.emit('bossEnraged', this.boss);
      }
      if (!this.boss.stagger && !this.boss.frozen) this.boss.attackCooldown -= dt;
      if (this.boss.attackCooldown <= 0) { this.bossAttack(); this.boss.attackCooldown = Math.max(2.2, 5.2 - this.round * .18) * (this.boss.enraged ? .8 : 1); }
    }
    for (const w of [...this.warnings]) {
      w.timer -= dt;
      if (w.timer <= 0) {
        if (w.rite) { resolveArenaRite(this,w); if (!w.damage) continue; }
        const flame = { id: this.nextId++, cells: w.cells, life: .65, damage: w.damage ?? 25, effect: w.effect, hit: new Set(), enemy: true, fire: this.stage.worldIndex >= 2 ? 'spectral' : 'normal' };
        this.flames.push(flame); this.applyFlame(flame);
        this.emit(w.effect === 'snare' ? 'webBurst' : 'enemyExplosion', { cells: w.cells });
      }
    }
    this.warnings = this.warnings.filter(w => w.timer > 0);
    if (!this.active) return;
    this.collect();
    if (this.pendingLevels > 0) this.openUpgrade();
  }
}
