import { WORLDS, stageFor, RELICS, relicById } from './campaign.js';
export const WIDTH = 15;
export const HEIGHT = 13;
export const ROUND_SECONDS = 120;
export const BIOMES = WORLDS;
export const SKILLS = [
  { id: 'power', name: 'Pólvora instável', icon: 'Flame', branch: 'DESTRUIÇÃO', desc: '+1 de dano em todas as explosões.', color: '#ff985c', max: 8 },
  { id: 'range', name: 'Rastro de fogo', icon: 'Expand', branch: 'DESTRUIÇÃO', desc: '+1 bloco de alcance para suas bombas.', color: '#ff985c', max: 5 },
  { id: 'capacity', name: 'Bolsos sem fundo', icon: 'Bomb', branch: 'ARSENAL', desc: '+1 bomba simultânea. Mais caos, mais possibilidades.', color: '#b5a0ff', max: 5 },
  { id: 'speed', name: 'Passos fantasma', icon: 'Wind', branch: 'MOBILIDADE', desc: 'Mova-se 10% mais rápido pela masmorra.', color: '#72dcc5', max: 5 },
  { id: 'health', name: 'Coração de pedra', icon: 'Heart', branch: 'VITALIDADE', desc: '+25 de vida máxima e recupera 35 de vida.', color: '#fb7993', max: 6 },
  { id: 'magnet', name: 'Chamado da fenda', icon: 'Magnet', branch: 'COLETA', desc: 'Atrai cristais a uma distância maior.', color: '#72dcc5', max: 4 },
  { id: 'fuse', name: 'Pavio curto', icon: 'Timer', branch: 'ARSENAL', desc: 'Bombas explodem 12% mais rápido.', color: '#b5a0ff', max: 4 },
  { id: 'dash', name: 'Salto dimensional', icon: 'Zap', branch: 'MOBILIDADE', desc: 'Reduz em 18% a recarga da esquiva.', color: '#72dcc5', max: 4 },
  { id: 'heal', name: 'Segundo fôlego', icon: 'HeartPulse', branch: 'VITALIDADE', desc: 'Recupera 50 de vida imediatamente.', color: '#fb7993', max: Infinity },
  { id: 'vampire', name: 'Pacto carmesim', icon: 'Droplets', branch: 'VITALIDADE', desc: 'Derrotar um monstro recupera +2 de vida.', color: '#fb7993', max: 4 },
];
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
export function seededRandom(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

export class Game {
  constructor({ random = Math.random, meta = {} } = {}) {
    this.random = random;
    this.meta = meta;
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
    this.forgeCount = 0; this.skillLevels = {}; this.pendingLevels = 0; this.earnedShards = 0;
    this.combo = 0; this.comboTimer = 0; this.relics = []; this.echoes = []; this.miniSpawned = false;
    this.hazardClock = 10; this.resultClaimed = false; this.result = null; this.relicDropCount = 0;
    this.player = { x: 1, z: 1, hp: 100 + (this.meta.health || 0) * 10, maxHp: 100 + (this.meta.health || 0) * 10,
      damage: 2 + (this.meta.power || 0), range: 2, capacity: 2, step: .19, fuse: 2.1,
      magnet: 1.25, dashMax: 3.5, dashCooldown: 0, invincible: 0, moveCooldown: 0, vampire: 0, facing: [0, 1], fire: 'normal', armor: 0, revive: false };
    this.generateArena();
  }
  get stage() { return stageFor(this.round); }
  get biome() { return this.stage.world; }
  get intelligence() { return Math.min(.85, (this.round - 1) * .075 + this.elapsed / 120 * .12); }
  get forgeCost() { return 20 + this.forgeCount * 10; }
  get active() { return this.phase === 'playing' || this.phase === 'boss'; }
  generateArena() {
    const { width, height, layout, worldIndex } = this.stage;
    this.grid = Array.from({ length: height }, (_, z) => Array.from({ length: width }, (_, x) => {
      if (x === 0 || z === 0 || x === width - 1 || z === height - 1) return 1;
      const centerX = Math.floor(width / 2), centerZ = Math.floor(height / 2);
      const open = layout === 'courtyard' && Math.abs(x - centerX) <= 2 && Math.abs(z - centerZ) <= 2 || layout === 'crossroads' && (x === centerX || z === centerZ) || layout === 'lanes' && z % 4 === 2;
      if (x % 2 === 0 && z % 2 === 0 && !open) return 1;
      if (x + z <= 5 || (x === 1 && z <= 5) || (z === 1 && x <= 5)) return 0;
      return !open && this.random() < .30 + worldIndex * .025 ? 2 : 0;
    }));
    this.bombs = []; this.flames = []; this.enemies = []; this.pickups = []; this.warnings = [];
    this.boss = null; this.spawnClock = 5; this.player.x = 1; this.player.z = 1;
    this.player.invincible = 2; this.player.moveCooldown = 0; this.player.dashCooldown = 0;
    for (const [x, z] of [[3, 1], [1, 4], [5, 1], [7, 5], [11, 9]]) {
      this.grid[z][x] = 0; this.addPickup(x, z, 'crystal', 2);
    }
    // A cache close to spawn teaches item collection in every stage.
    const cache = { x: 3, z: 3 }; this.grid[cache.z][cache.x] = 2;
    this.cacheCell = cache;
    for (let i = 0; i < 3 + Math.min(5, Math.floor((this.round - 1) / 2)); i++) this.spawnEnemy();
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
    p.x += dx; p.z += dz; p.moveCooldown = p.step;
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
    p.dashCooldown = p.dashMax; p.invincible = Math.max(p.invincible, .5);
    this.emit('dash', { x: p.x, z: p.z, fromX, fromZ }); this.collect(); return true;
  }
  plantBomb() {
    if (!this.active || this.bombs.length >= this.player.capacity) return false;
    const p = this.player;
    if (this.bombs.some(b => b.x === p.x && b.z === p.z)) return false;
    this.bombs.push({ id: this.nextId++, x: p.x, z: p.z, fuse: p.fuse, maxFuse: p.fuse, range: p.range, damage: p.damage });
    this.emit('bomb', { x: p.x, z: p.z }); return true;
  }
  blastCells(bomb) {
    const cells = [{ x: bomb.x, z: bomb.z }];
    for (const [dx, dz] of DIRS) {
      for (let i = 1; i <= bomb.range; i++) {
        const x = bomb.x + dx * i, z = bomb.z + dz * i;
        if (this.tile(x, z) === 1) break;
        cells.push({ x, z });
        if (this.tile(x, z) === 2) break;
      }
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
    if (id === 'shell') { p.maxHp += 20; p.hp += 20; p.armor = .2; }
    if (id === 'magnet') { p.magnet += 2; p.capacity++; }
    if (id === 'phoenix') p.revive = true;
    this.emit('relic', { id, x: p.x, z: p.z }); return true;
  }
  collect() {
    for (const pickup of [...this.pickups]) {
      if (distance(this.player, pickup) > this.player.magnet) continue;
      // Magnet never pulls through stone walls or unopened crates.
      if (!this.reachableWithin(this.player, pickup, Math.floor(this.player.magnet))) continue;
      this.pickups = this.pickups.filter(p => p !== pickup);
      if (pickup.type === 'relic') this.equipRelic(pickup.value);
      else if (pickup.type === 'heart') this.player.hp = Math.min(this.player.maxHp, this.player.hp + 20);
      else { this.crystals += pickup.value; this.collected += pickup.value; this.xp += pickup.value * 3; }
      this.emit('pickup', pickup);
    }
    while (this.xp >= this.nextXp) {
      this.xp -= this.nextXp; this.level++; this.nextXp = Math.floor(this.nextXp * 1.3); this.pendingLevels++;
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
    const hp = ({ slime: 2, ember: 3, beetle: 5, wisp: 3, sentinel: 12 }[type] || 2) + Math.floor((this.round - 1) * .35);
    const enemy = { id: this.nextId++, ...cell, type, hp, maxHp: hp, cooldown: 1 + this.random(), hitFlash: 0, intent: 'hunt', awareness: this.random(), chargeCooldown: 3, castCooldown: 4, slow: 0, windup: 0, chargeSteps: 0 };
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
    for (const f of this.flames) add(f.cells, 0);
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
    if (enemy.type === 'wisp' && !planningHazards.has(`${enemy.x},${enemy.z}`)) {
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
    amount = Math.ceil(amount * (1 - (this.player.armor || 0)));
    this.player.hp = Math.max(0, this.player.hp - amount); this.player.invincible = 1.4;
    this.emit('hurt', { x: this.player.x, z: this.player.z, amount });
    if (!this.player.hp && this.player.revive) {
      this.player.revive = false; this.player.hp = Math.ceil(this.player.maxHp / 2); this.player.invincible = 3;
      this.emit('revive', { x: this.player.x, z: this.player.z });
    } else if (!this.player.hp) this.die();
  }
  applyFlame(flame) {
    if (flame.cells.some(c => c.x === this.player.x && c.z === this.player.z)) this.hurt(flame.enemy ? 25 : 20);
    if (this.phase === 'dead') return;
    if (flame.enemy) return;
    for (const enemy of [...this.enemies, ...(this.boss ? [this.boss] : [])]) {
      if (flame.hit.has(enemy.id) || !flame.cells.some(c => c.x === enemy.x && c.z === enemy.z)) continue;
      flame.hit.add(enemy.id); enemy.hp -= flame.damage; enemy.hitFlash = .18;
      if (this.relics.includes('frost')) enemy.slow = enemy.type === 'boss' ? 1.2 : 2.5;
      this.emit('enemyHit', { ...enemy, damage: flame.damage });
      if (enemy.hp <= 0) {
        if (enemy.type === 'boss') this.defeatBoss();
        else {
          this.enemies = this.enemies.filter(e => e !== enemy); this.kills++;
          this.combo = this.comboTimer > 0 ? this.combo + 1 : 1; this.comboTimer = 4;
          this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.vampire);
          this.addPickup(enemy.x, enemy.z, 'crystal', enemy.type === 'ember' ? 5 : 3);
          if (enemy.type === 'sentinel') { this.dropRelic(enemy.x, enemy.z); this.earnedShards += 3; this.emit('miniDefeated', enemy); }
          else if (this.random() < .055) this.dropRelic(enemy.x, enemy.z);
          this.emit('kill', enemy);
        }
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
    this.boss = { id: this.nextId++, x, z, type: 'boss', variant: this.biome.id, name: this.biome.boss, hp, maxHp: hp, cooldown: 2.5, attackCooldown: 3, hitFlash: 0, attackIndex: 0, enraged: false };
    this.emit('boss');
  }
  bossAttack() {
    if (!this.boss) return;
    const p = this.player, b = this.boss, cells = [], attack = b.attackIndex++;
    if (this.stage.worldIndex === 1 && attack % 2 === 0) {
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
    this.warnings.push({ id: this.nextId++, cells, timer: b.enraged ? 1 : 1.2 });
    this.emit('warning', { cells });
  }
  defeatBoss() {
    if (!this.boss || !this.active) return;
    const boss = this.boss; this.boss = null; this.bosses++;
    this.earnedShards += this.stage.reward + Math.floor(this.kills / 5);
    this.result = { victory: true, stage: this.round, shards: this.earnedShards };
    this.phase = 'intermission'; this.warnings = []; this.flames = []; this.bombs = []; this.echoes = [];
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
    }
    this.phase = this.upgradeReturn; this.emit('skill', { id }); return true;
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
    if (this.stage.worldIndex === 1) {
      for (let i = 0; i < 3 + this.stage.local; i++) {
        const x = 1 + Math.floor(this.random() * (this.width - 2)), z = 1 + Math.floor(this.random() * (this.height - 2));
        if (this.tile(x, z) === 0) cells.push({ x, z });
      }
    } else {
      const z = 1 + Math.floor(this.random() * (this.height - 2));
      for (let x = 1; x < this.width - 1; x++) if (this.tile(x, z) === 0) cells.push({ x, z });
    }
    if (cells.length) { this.warnings.push({ id: this.nextId++, cells, timer: 1.65, environment: true }); this.emit('hazard', { cells }); }
  }
  tick(dt) {
    if (!this.active) return;
    this.totalTime += dt;
    this.comboTimer = Math.max(0, this.comboTimer - dt); if (!this.comboTimer) this.combo = 0;
    const p = this.player;
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
      this.spawnClock = Math.max(2, 7 - this.round * .3 - this.elapsed / 85);
      if (this.enemies.length < 8 + Math.min(12, this.round)) this.spawnEnemy();
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
    for (const f of [...this.flames]) { f.life -= dt; if (f.life > 0) this.applyFlame(f); }
    this.flames = this.flames.filter(f => f.life > 0);
    if (!this.active) return;
    const hazards = this.dangerMap();
    for (const enemy of [...this.enemies, ...(this.boss ? [this.boss] : [])]) {
      let chargedThisTick = false;
      enemy.cooldown -= dt; enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
      enemy.slow = Math.max(0, (enemy.slow || 0) - dt);
      enemy.castCooldown = Math.max(0, (enemy.castCooldown ?? 4) - dt);
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
            enemy.cooldown = (enemy.intent === 'evade' ? .42 : enemy.type === 'boss' ? (enemy.enraged ? .75 : .95) : enemy.type === 'ember' ? .65 : enemy.type === 'beetle' ? 1.1 : .9) / (1 + Math.min(.5, (this.round - 1) * .035)) * (enemy.slow ? 1.8 : 1);
          }
        }
      }
      if (enemy.x === p.x && enemy.z === p.z) this.hurt(enemy.type === 'boss' ? 30 : chargedThisTick || enemy.intent === 'charge' ? 20 : 12);
    }
    if (this.boss && this.active) {
      if (this.boss.hp <= this.boss.maxHp / 2 && !this.boss.enraged) {
        this.boss.enraged = true; this.boss.attackCooldown = 1.6;
        for (let i = 0; i < 2; i++) if (this.enemies.length < 24) this.spawnEnemy();
        this.emit('bossEnraged', this.boss);
      }
      this.boss.attackCooldown -= dt;
      if (this.boss.attackCooldown <= 0) { this.bossAttack(); this.boss.attackCooldown = Math.max(2.2, 4 - this.round * .12) * (this.boss.enraged ? .75 : 1); }
    }
    for (const w of [...this.warnings]) {
      w.timer -= dt;
      if (w.timer <= 0) {
        this.flames.push({ id: this.nextId++, cells: w.cells, life: .65, damage: 25, hit: new Set(), enemy: true, fire: this.stage.worldIndex === 2 ? 'spectral' : 'normal' });
        this.emit('enemyExplosion', { cells: w.cells });
      }
    }
    this.warnings = this.warnings.filter(w => w.timer > 0);
    if (!this.active) return;
    this.collect();
    if (this.pendingLevels > 0) this.openUpgrade();
  }
}
