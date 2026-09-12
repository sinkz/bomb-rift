import { WORLDS, stageFor, RELICS, relicById, entranceFor } from './campaign.js';
import { HazardField } from './hazards.js';
import { directorFor } from './hazard-cycle.js';
import { normalizeMeta, startingStats, settleLegacy } from './legacy.js';
import { emptyMetrics, captureRun, scoreReport } from '../shared/scoring.js';
import { DIFFICULTIES, CAMPAIGN_STAGES, aggregateExpedition, difficultyUnlocked } from '../shared/expedition.js';
export const WIDTH = 17;
export const HEIGHT = 15;
export const ROUND_SECONDS = 120;
// Na perseguicao o guardiao quebra exatamente onde comecaria o ato do desespero.
export const FLEE_RATIO = .30;
export const BIOMES = WORLDS;
import { SKILLS, skillById } from './skills.js';
import { queueArenaRite, resolveArenaRite, resolveBossMove, chooseBossMove, carveSafeHouse, bossTelegraph, bossRhythm, bossPhaseFor, movesFor, landingSite, PHASE_LABELS, ARENA_RITES } from './boss-mechanics.js';
import { updateBossAI } from './boss-ai.js';
export { SKILLS };
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
export function seededRandom(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

export class Game {
  constructor({ random = Math.random, meta = {}, campaignMode = false } = {}) {
    this.random = random;
    this.meta = Object.assign(meta, normalizeMeta(meta));
    this.campaignMode = campaignMode;
    this.difficulty = campaignMode ? this.meta.difficulty : 'easy';
    this.expedition = null;
    if (campaignMode) this.meta.unlockedStage = 1;
    this.events = [];
    this.nextId = 1;
    this.phase = 'menu';
    this.reset();
  }
  // Quem encerra a fase: o guardiao no duelo e na perseguicao, o campeao na cacada.
  // O campeao NAO e this.boss de proposito -- senao herdaria updateBossAI, os tres
  // atos e os ritos de arena, que sao gramatica de guardiao.
  get finale() { return this.boss || this.champion; }
  emit(type, data = {}) { this.events.push({ ...data, entityType: data.type, type }); }
  drainEvents() { return this.events.splice(0); }
  reset(stage = 1) {
    this.round = stage; this.width = this.stage.width; this.height = this.stage.height;
    this.elapsed = 0; this.totalTime = 0; this.kills = 0; this.bosses = 0;
    this.stats = { ...emptyMetrics(), bossStartedAt: null };
    this.crystals = 0; this.collected = 0; this.level = 1; this.xp = 0; this.nextXp = 36;
    this.forgeCount = 0; this.skillLevels = {}; this.masteries = []; this.wardTimer = 0; this.pendingLevels = 0; this.earnedShards = 0;
    this.combo = 0; this.comboTimer = 0; this.relics = []; this.echoes = []; this.miniSpawned = false;
    this.champion = null; this.transition = null;
    this.hazardField = this.hazardField || new HazardField();
    this.hazardField.clear(); this.hazardDirector = null;
    this.surge = false; this.cratesTotal = this.cratesTotal || 0;
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
  get challenge() { return DIFFICULTIES[this.difficulty]; }
  get lives() { return this.expedition?.lives ?? 1; }
  get lifeCost() { return 40 + (this.expedition?.purchases || 0) * 25; }
  get expeditionScore() { return this.expedition?.stages.length ? scoreReport(aggregateExpedition(this.expedition.stages, this.difficulty)).total : 0; }
  setDifficulty(id) {
    if (!difficultyUnlocked(this.meta, id) || this.expedition && !this.expedition.ended || this.phase !== 'menu') return false;
    this.difficulty = this.meta.difficulty = id; this.meta.unlockedStage = 1; return true;
  }
  buyLife() {
    if (!this.expedition || this.expedition.ended || !['playing','boss','paused','intermission','menu'].includes(this.phase) || this.lives >= 3 || this.expedition.purchases >= 3 || this.crystals < this.lifeCost) return false;
    this.crystals -= this.lifeCost; this.expedition.purchases++; this.expedition.lives++;
    this.emit('extraLife'); return true;
  }
  get intelligence() { return Math.min(.9, this.challenge.intelligence + (this.round - 1) * .065 + this.elapsed / 120 * (this.round === 1 ? .04 : .08)); }
  get enemyLimit() {
    // Convexa: quase plana no comeco, dispara no ultimo terco. E o que
    // transforma os 30s finais numa corrida ate o chefe em vez de sala de espera.
    const mare = Math.round(9 * Math.min(1, this.elapsed / ROUND_SECONDS) ** 1.7);
    // No finale a horda recua: o guardiao tem de ser o protagonista da luta, e
    // nao mais um no meio de catorze.
    return 4 + Math.min(14, this.round) + (this.finale ? Math.min(3, mare) : mare);
  }
  get spawnInterval() {
    const base = Math.max(1.6, 10 - (this.round - 1) * .4 - 8.4 * Math.min(1, this.elapsed / ROUND_SECONDS) ** 1.35);
    // Durante o finale o ritmo afrouxa de novo, pelo mesmo motivo do teto.
    const ritmo = this.finale ? Math.max(6, base + 4) : base;
    return ritmo * this.challenge.spawn * (this.surge && !this.finale ? .45 : 1);
  }
  get forgeCost() { return Math.floor((20 + this.forgeCount * 10) * (this.masteries.includes('alchemy') ? .75 : 1)); }
  get active() { return this.phase === 'playing' || this.phase === 'boss'; }
  generateArena() {
    this.cratesTotal = 0;
    const { width, height, layout, worldIndex } = this.stage;
    this.grid = Array.from({ length: height }, (_, z) => Array.from({ length: width }, (_, x) => {
      if (x === 0 || z === 0 || x === width - 1 || z === height - 1) return 1;
      const centerX = Math.floor(width / 2), centerZ = Math.floor(height / 2);
      const open = layout === 'courtyard' && Math.abs(x - centerX) <= 2 && Math.abs(z - centerZ) <= 2 || layout === 'crossroads' && (x === centerX || z === centerZ) || layout === 'lanes' && z % 4 === 2 || layout === 'gardens' && (Math.abs(x - centerX) <= 1 || z % 6 === 3) || layout === 'bridges' && (z % 4 === 2 || x === centerX);
      if (x % 2 === 0 && z % 2 === 0 && !open) return 1;
      if (x + z <= 5 || (x === 1 && z <= 5) || (z === 1 && x <= 5)) return 0;
      const caixa = !open && this.random() < .30 + worldIndex * .025;
      if (caixa) this.cratesTotal++;
      return caixa ? 2 : 0;
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
    if (this.campaignMode) {
      if (!['menu','dead','intermission'].includes(this.phase)) return false;
      if (this.expedition && !this.expedition.ended) {
        if (!this.resultClaimed || stage !== this.expedition.stages.length + 1 || stage > CAMPAIGN_STAGES) return false;
      } else {
        if (stage !== 1) return false;
        this.expedition = { stages: [], lives: 1, purchases: 0, ended: false, report: null, routed: [] };
        this.meta.unlockedStage = 1;
      }
    }
    if (!Number.isInteger(stage) || stage < 1 || stage > Math.max(1, this.meta.unlockedStage || 1)) return false;
    this.reset(stage); this.phase = 'playing'; this.emit('start'); return true;
  }
  returnToMap() { if (this.active || this.phase === 'upgrade') return false; this.phase = 'menu'; this.emit('map'); return true; }
  claimResult() {
    if (this.resultClaimed || !this.result) return false;
    this.resultClaimed = true;
    this.meta.shards = (this.meta.shards || 0) + this.earnedShards;
    if (!this.campaignMode) this.meta.runs = (this.meta.runs || 0) + 1;
    this.meta.bestRound = Math.max(this.meta.bestRound || 0, this.round);
    this.meta.bestKills = Math.max(this.meta.bestKills || 0, this.kills);
    if (this.result.victory) this.meta.unlockedStage = Math.max(this.meta.unlockedStage || 1, this.round + 1);
    this.meta.bestStage = Math.max(this.meta.bestStage || 0, this.result.victory ? this.round : this.round - 1);
    settleLegacy(this);
    if (this.campaignMode && this.expedition && !this.expedition.ended) {
      const run = this.expedition;
      run.stages.push(captureRun(this));
      run.ended = !this.result.victory || this.round === CAMPAIGN_STAGES;
      if (run.ended) {
        run.report = aggregateExpedition(run.stages, this.difficulty);
        if (this.result.victory && !this.meta.difficultyClears.includes(this.difficulty)) this.meta.difficultyClears.push(this.difficulty);
        if (!this.result.victory) run.lives = 0;
        this.meta.unlockedStage = 1; this.meta.runs++;
      } else if (this.round % 3 === 0 && run.lives < 3) {
        run.lives++; this.emit('extraLife');
      }
    }
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
    this.stats.dashes++;
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
    this.stats.bombsPlaced++;
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
  explode(bomb, chained = false) {
    if (!this.bombs.includes(bomb)) return;
    this.stats.bombsExploded++; if (chained) this.stats.chainExplosions++;
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
      if (chained) this.explode(chained, true);
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
    if (id === 'shell') { p.maxHp += 20; this.restoreHealth(20); p.armor = Math.min(.6, p.armor + .2); }
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
      else if (pickup.type === 'heart') { this.restoreHealth(20); if (this.relics.includes('mercy')) this.player.ward = 1; }
      else if (pickup.type === 'scrap' || pickup.type === 'cores') this.materials[pickup.type] += pickup.value;
      else { this.crystals += pickup.value; this.collected += pickup.value; this.xp += Math.round(pickup.value * 3 * (1 + (this.skillLevels.alchemy || 0) * .12)); if (this.masteries.includes('magnet')) this.restoreHealth(pickup.value); }
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
      if (this.harmful(x, z)) continue;
      if (this.walkable(x, z) && distance({ x, z }, this.player) > 5 && !this.enemies.some(e => e.x === x && e.z === z)) candidates.push({ x, z });
    }
    if (!candidates.length) return;
    const cell = candidates[Math.floor(this.random() * candidates.length)];
    const tipos = [...new Set(this.biome.enemies)];
    const liberados = new Set(tipos.slice(0, Math.min(tipos.length, 1 + Math.floor(this.elapsed / 32))));
    // Filtra a lista ORIGINAL, nao a de tipos unicos: o bioma repete o inimigo
    // comum de proposito para ele continuar sendo o mais frequente.
    const pool = this.biome.enemies.filter(t => liberados.has(t));
    const type = forcedType || pool[Math.floor(this.random() * pool.length)];
    const hp = Math.ceil((({ slime: 2, ember: 3, beetle: 5, wisp: 3, sentinel: 12, spore: 3, weaver: 3, oracle: 4, mimic: 4 }[type] || 2) + Math.floor((this.round - 1) * .35)) * this.challenge.hp);
    const enemy = { id: this.nextId++, ...cell, type, hp, maxHp: hp, cooldown: 1 + this.random(), hitFlash: 0, intent: 'hunt', awareness: this.random(), chargeCooldown: 3, castCooldown: 4, slow: 0, windup: 0, chargeSteps: 0 };
    if (type === 'mimic') { enemy.awake = false; enemy.intent = 'disguise'; }
    this.enemies.push(enemy); return enemy;
  }
  /**
   * Um passo da brasa errante. O diretor decide o que acontece; aqui a gente
   * so traduz em dano e em evento de cena. Ele so roda no duelo, e so depois
   * de o guardiao chegar -- a coreografia de entrada e dele sozinho.
   */
  stepHazards(dt) {
    const diretor = this.hazardDirector;
    if (!diretor || !this.boss) return;
    const acontecimentos = diretor.update(dt, {
      width: this.width, height: this.height,
      tile: (x, z) => this.tile(x, z),
      random: this.random,
      player: this.player,
      ato: this.boss.phase || 1,
      // Nunca sobre bomba armada nem sobre item no chao: soterrar recompensa
      // seria punir quem foi buscar.
      blocked: new Set([
        ...this.bombs.map(b => `${b.x},${b.z}`),
        ...this.pickups.map(p => `${p.x},${p.z}`),
      ]),
    });
    for (const ocorrencia of acontecimentos) {
      // 'bate' era o pulso da regiao inteira. Nao serve para dano: quem
      // atravessava entre dois pulsos passava de graca. Fica so como batida
      // visual; quem fere e queimarJogador, que olha onde o jogador ESTA.
      if (ocorrencia.tipo === 'bate') continue;
      this.emit('hazard' + ocorrencia.tipo[0].toUpperCase() + ocorrencia.tipo.slice(1),
        { cells: ocorrencia.cells, kind: ocorrencia.kind, color: this.biome.color });
    }
    // Queima DEPOIS de anunciar. O diretor ja pos as casas no campo dentro do
    // update, entao queimar antes emitiria o dano na frente do proprio aviso --
    // e quem le a fila de eventos veria dano sem marca.
    this.queimarJogador(dt);
  }
  /**
   * Queima enquanto os pes estiverem no fogo. E presenca, nao pulso: o dano
   * acompanha ONDE o jogador esta, e nao o relogio da regiao.
   *
   * A janela de invencibilidade e menor que o intervalo do perigo de proposito.
   * Com os 1,4s normais de um golpe, a lava (que bate a cada 0,55s) perdia dois
   * de cada tres tiques e ficar em cima quase nao doia.
   */
  queimarJogador(dt) {
    const p = this.player;
    const celula = this.hazardField.get(p.x, p.z);
    if (!celula) { p.burning = 0; p.burnTimer = 0; return; }
    const regra = celula.regra;
    p.burning = Math.min(1, (p.burning || 0) + dt * 3);
    p.burnTimer = (p.burnTimer || 0) - dt;
    if (p.burnTimer > 0) return;
    p.burnTimer = regra.tick;
    if (regra.effect === 'snare') {
      if (p.invincible <= 0) { p.slow = 2; this.emit('snared', { x: p.x, z: p.z }); }
      return;
    }
    // Fura a invencibilidade, e nao concede nenhuma.
    //
    // Medido em 2026-09-12: com o comportamento normal, a lava (tique .55) e a
    // ruina (tique .75) tiravam a MESMA coisa numa luta cheia -- 48 contra 47
    // em cinco segundos. Nao era o tique que governava, era o 1,4s de
    // invencibilidade dos golpes do guardiao e da horda, que e maior que
    // qualquer tique de brasa. A afinacao por bioma existia no codigo e nao
    // chegava na vida do jogador.
    //
    // Agora o unico relogio da queimadura e o burnTimer, entao cada mundo
    // machuca do jeito que a regra dele diz.
    this.hurt(regra.damage, { iframes: 0, pierce: true, de: { x: p.x, z: p.z, tipo: 'chao' } });
    this.emit('hazardBurn', { x: p.x, z: p.z, kind: celula.kind, color: this.biome.color });
  }
  /** Quantas caixas ainda ha no mapa. */
  get cratesLeft() { return Math.max(0, (this.cratesTotal || 0) - this.cratesBroken); }

  /**
   * O mapa acabou e ainda falta tempo. Relatado jogando: "acabaram as caixas e
   * eu tive que esperar 40 segundos matando monstros fracos demais".
   *
   * A fenda responde. NAO adiantando o finale -- validation.js exige 120s de
   * fase, e terminar antes invalidaria a partida legitima -- mas soltando os
   * lacaios mais duros do mundo e apertando o ritmo do que vem depois.
   */
  checkArenaCleared() {
    if (this.surge || !this.active || this.finale) return;
    if (!this.cratesTotal || this.cratesLeft > 0) return;
    this.surge = true;
    // Os mais duros do bioma, nao os de sempre: o incomodo era a horda fraca.
    const duros = [...new Set(this.biome.enemies)];
    const tipo = duros[duros.length - 1];
    const quantos = 3 + this.stage.local;
    const nascidos = [];
    for (let i = 0; i < quantos; i++) {
      const inimigo = this.spawnEnemy(tipo);
      if (inimigo) nascidos.push({ x: inimigo.x, z: inimigo.z, type: inimigo.type });
    }
    this.spawnClock = Math.min(this.spawnClock, 1.2);
    // 'enemy' e nao 'type': o emit carimba o tipo do EVENTO em type, e um campo
    // com o mesmo nome no payload seria sobrescrito em silencio.
    this.emit('arenaCleared', { cells: nascidos, enemy: tipo, color: this.biome.color, count: nascidos.length });
  }
  /** Essa casa fere AGORA? Perigo persistente nao e terreno: walkable() nao muda. */
  harmful(x, z) { return this.hazardField.has(x, z); }
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
    for (const celula of this.hazardField.list()) add([celula], 0);
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
  restoreHealth(amount) {
    const actual = Math.max(0, Math.min(amount, this.player.maxHp - this.player.hp));
    this.player.hp += actual; this.stats.healed += actual; return actual;
  }
  /**
   * @param {object} opcoes
   * @param {number} opcoes.iframes  invencibilidade concedida. ZERO significa
   *   nao mexer na que ja existe -- e o que o chao em brasa usa, porque ferir
   *   voce nao pode te proteger do guardiao no mesmo instante.
   * @param {boolean} opcoes.pierce  ignora a invencibilidade em vez de respeita-la.
   */
  hurt(amount, { iframes = 1.4, pierce = false, de = null } = {}) {
    if (!this.active) return;
    if (!pierce && this.player.invincible > 0) return;
    if (this.player.ward > 0) { this.stats.blocked++; this.player.ward--; this.player.invincible = .9; if (this.masteries.includes('ward')) this.restoreHealth(10); this.emit('blocked', { x: this.player.x, z: this.player.z }); return; }
    amount = Math.ceil(amount * this.challenge.damage * (1 - (this.player.armor || 0)));
    const actual = Math.min(this.player.hp, amount); this.stats.damageTaken += actual; if (actual > 0) this.stats.hitsTaken++;
    this.player.hp = Math.max(0, this.player.hp - amount);
    if (iframes > 0) this.player.invincible = iframes;
    // 'de' e a casa que originou o golpe, quando ha uma. Relatado jogando:
    // "levei dano mas nao fica claro DE ONDE" -- sem isso a cena so sabe onde
    // voce estava, que e justamente a informacao que o jogador ja tem.
    this.emit('hurt', { x: this.player.x, z: this.player.z, amount, de: de ? { x: de.x, z: de.z, tipo: de.tipo || de.type || null } : null });
    if (!this.player.hp && this.player.revive) {
      this.stats.revives++; this.player.revive = false; this.restoreHealth(Math.ceil(this.player.maxHp / 2)); this.player.invincible = 3;
      this.emit('revive', { x: this.player.x, z: this.player.z });
    } else if (!this.player.hp && this.campaignMode && this.lives > 1) {
      this.expedition.lives--; this.stats.revives++; this.restoreHealth(this.player.maxHp);
      this.player.invincible = 4; this.player.slow = 0;
      this.emit('revive', { x: this.player.x, z: this.player.z });
    } else if (!this.player.hp) this.die();
  }
  damageEnemy(enemy, damage) {
    if (!this.active || enemy.hp <= 0) return;
    if (enemy.type === 'boss' && enemy.stagger > 0) damage = Math.ceil(damage * 1.5);
    if (this.masteries.includes('frost') && enemy.frozen > 0) damage += 2;
    const actual = Math.min(enemy.hp, damage); this.stats.damageDealt += actual; if (enemy.type === 'boss') this.stats.bossDamage += actual;
    enemy.hp -= damage; enemy.hitFlash = .18;
    if (enemy.type === 'mimic') { enemy.awake = true; enemy.intent = 'hunt'; }
    const cold = this.skillLevels.frost || 0;
    if (cold || this.relics.includes('frost')) enemy.slow = Math.max(enemy.slow || 0, enemy.type === 'boss' ? 1.2 : Math.max(cold ? 1+ cold*.3 : 0,this.relics.includes('frost') ? 2.5 : 0));
    if (cold >= 5) enemy.frozen = enemy.type === 'boss' ? .5 : 2;
    this.emit('enemyHit', { ...enemy, damage });
      // Perseguicao: o limiar e verificado antes do teste de morte, entao um
      // golpe que o cruzaria e clampeado em vez de matar. Matar nao e opcao.
      if (enemy.type === 'boss' && this.stage.kind === 'chase' && enemy.hp <= enemy.maxHp * FLEE_RATIO) {
        enemy.hp = Math.max(1, enemy.hp);
        return this.routeBoss(enemy);
      }
      if (enemy.hp <= 0) {
        if (enemy.type === 'boss') this.defeatBoss();
        else {
          this.enemies = this.enemies.filter(e => e !== enemy); this.kills++;
          this.stats[enemy.type === 'sentinel' ? 'miniKills' : 'normalKills']++;
          this.combo = this.comboTimer > 0 ? this.combo + 1 : 1; this.comboTimer = 4;
          this.stats.maxCombo = Math.max(this.stats.maxCombo, this.combo);
          this.restoreHealth(this.player.vampire);
          if (this.masteries.includes('dash')) this.player.dashCooldown = Math.max(0,this.player.dashCooldown-.6);
          if (this.masteries.includes('vampire') && this.player.hp === this.player.maxHp) this.player.ward = 1;
          this.addPickup(enemy.x, enemy.z, 'crystal', enemy.type === 'ember' ? 5 : 3);
          if (this.kills % 3 === 0) this.addPickup(enemy.x, enemy.z, 'scrap', 1);
          if (enemy.type === 'mimic') this.addPickup(enemy.x, enemy.z, 'scrap', 2);
          if (enemy.type === 'sentinel') { this.dropRelic(enemy.x, enemy.z); this.addPickup(enemy.x, enemy.z, 'cores', 1); this.earnedShards += 3; this.emit('miniDefeated', enemy); }
          if (enemy === this.champion) this.defeatChampion(enemy);
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
      else {
        const perto = flame.cells.reduce((a, c) =>
          Math.abs(c.x - this.player.x) + Math.abs(c.z - this.player.z) < Math.abs(a.x - this.player.x) + Math.abs(a.z - this.player.z) ? c : a, flame.cells[0]);
        this.hurt(flame.enemy ? flame.damage ?? 25 : 20, { de: { ...perto, tipo: flame.hazard ? 'chao' : flame.enemy ? 'golpe' : 'bomba' } });
      }
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
        this.stats.anchorsBroken++;
        this.anchors = this.anchors.filter(a=>a!==anchor);
        if (this.boss) {
          this.boss.stagger=4; this.boss.castTimer=0; this.boss.attackCooldown=1.2;
          // Anchors stay the strongest counter-play: they also break the combo.
          this.boss.comboQueue=[]; this.boss.retreat=0;
          this.warnings=this.warnings.filter(w=>w.bossId!==this.boss.id);
          this.emit('bossStagger',{id:this.boss.id});
        }
        this.addPickup(anchor.x,anchor.z,'crystal',3);
        this.emit('anchorBroken', {...anchor,target:this.boss?{x:this.boss.x,z:this.boss.z}:null});
      }
    }
  }
  // No duelo a arena se transforma ANTES do guardiao existir: a transicao congela
  // a simulacao, o mapa muda, e so entao ele entra. Na perseguicao ele entra direto.
  spawnBoss() {
    this.stats.bossStartedAt = this.totalTime;
    if (this.stage.kind === 'duel') {
      this.transition = { kind: 'duel', timer: 1.6 };
      this.phase = 'transition';
      this.reshapeArena();
      return;
    }
    this.phase = 'boss';
    this.createBoss();
  }
  // Onde o guardiao sempre pousa. A mesma conta de createBoss, num lugar so,
  // para a coreografia da entrada mirar exatamente a casa que ele vai ocupar.
  get bossSeat() { return { x: Math.floor(this.width / 2), z: Math.floor(this.height / 2) - 1 }; }
  // So o duelo ganha entrada: na perseguicao o guardiao te caca, nao se
  // apresenta. Devolve false quando o mundo nao tem entrada autorada.
  beginEntrance() {
    const plan = entranceFor(this.biome);
    if (!plan) return false;
    const seat = this.bossSeat;
    this.transition = { kind: 'entrance', timer: plan.duration, duration: plan.duration, beats: plan.beats, fired: 0 };
    this.phase = 'transition';
    this.emit('bossEntrance', { ...seat, name: this.biome.boss, line: this.biome.quote, color: this.biome.color, duration: plan.duration });
    return true;
  }
  runEntranceBeats() {
    const t = this.transition, elapsed = t.duration - t.timer, seat = this.bossSeat;
    while (t.fired < t.beats.length && t.beats[t.fired].at <= elapsed) {
      const beat = t.beats[t.fired++];
      const escort = beat.kind === 'summon' ? this.summonEscort(beat.count ?? 3, seat) : [];
      this.emit('bossEntranceBeat', { kind: beat.kind, ...seat, color: this.biome.color, escort, name: this.biome.boss, line: this.biome.quote });
      // O guardiao chega antes do fim da transicao de proposito: assim ele roda
      // a animacao de entrada na tela enquanto o jogo ainda esta congelado.
      if (beat.arrive && !this.boss) this.createBoss();
    }
  }
  // A escolta nasce pelo mesmo spawnEnemy de sempre — andavel, longe do jogador,
  // desocupada — e so entao e puxada para perto do trono, e apenas para uma casa
  // que passaria no mesmo teste. Nenhum invariante de posicionamento afrouxa.
  summonEscort(count, seat) {
    const escort = [];
    for (let i = 0; i < count; i++) {
      const enemy = this.spawnEnemy();
      if (!enemy) break;
      const near = [];
      for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
        const x = seat.x + dx, z = seat.z + dz;
        if (!this.walkable(x, z)) continue;
        if (distance({ x, z }, this.player) <= 5) continue;
        if (this.enemies.some(e => e !== enemy && e.x === x && e.z === z)) continue;
        near.push({ x, z });
      }
      if (near.length) Object.assign(enemy, near[Math.floor(this.random() * near.length)]);
      escort.push({ x: enemy.x, z: enemy.z, type: enemy.type });
    }
    return escort;
  }
  // A arena do duelo. Regra dura: o plano so e aplicado se TODA casa de chao
  // continuar alcancavel a pe a partir de onde o jogador esta. Parede que
  // desconecta e descartada, e no pior caso o plano degenera para so remocoes,
  // que nunca prendem ninguem.
  connected(grid, from) {
    const seen = new Set([`${from.x},${from.z}`]), queue = [from];
    let floor = 0;
    for (let z = 1; z < this.height - 1; z++) for (let x = 1; x < this.width - 1; x++) if (grid[z][x] !== 1) floor++;
    while (queue.length) {
      const c = queue.shift();
      for (const [dx, dz] of DIRS) {
        const x = c.x + dx, z = c.z + dz, key = `${x},${z}`;
        if (x < 1 || z < 1 || x >= this.width - 1 || z >= this.height - 1) continue;
        if (seen.has(key) || grid[z][x] === 1) continue;
        seen.add(key); queue.push({ x, z });
      }
    }
    return seen.size >= floor;
  }
  reshapeArena() {
    const p = this.player, cx = Math.floor(this.width / 2), cz = Math.floor(this.height / 2) - 1;
    const shape = ARENA_RITES[this.biome.id]?.shape || 'pillars';
    const blocked = new Set();
    // Nunca soterrar o jogador, o que ele pode alcancar num passo, a clareira do
    // guardiao, uma bomba armada ou um item no chao.
    for (const [dx, dz] of [[0,0], ...DIRS]) blocked.add(`${p.x+dx},${p.z+dz}`);
    for (let z = cz - 2; z <= cz + 2; z++) for (let x = cx - 2; x <= cx + 2; x++) blocked.add(`${x},${z}`);
    for (const b of this.bombs) blocked.add(`${b.x},${b.z}`);
    for (const item of this.pickups) blocked.add(`${item.x},${item.z}`);

    const opens = [], walls = [];
    for (let z = 1; z < this.height - 1; z++) for (let x = 1; x < this.width - 1; x++) {
      if (blocked.has(`${x},${z}`)) continue;
      const onShape = shape === 'row' ? z === cz : shape === 'column' ? x === cx
        : shape === 'diagonal' ? Math.abs((x - cx) - (z - cz)) <= 1 || Math.abs((x - cx) + (z - cz)) <= 1
        : (x % 4 === 2 && z % 4 === 2);
      const ring = Math.max(Math.abs(x - cx), Math.abs(z - cz));
      if (onShape || ring <= 4) { if (this.grid[z][x] !== 0) opens.push({ x, z, to: 0 }); }
      else if (this.grid[z][x] === 0 && ring > 5 && (x + z) % 3 === 0) walls.push({ x, z, to: 1 });
    }

    const next = this.grid.map(row => row.slice());
    const plan = [];
    for (const cell of opens) { next[cell.z][cell.x] = 0; plan.push(cell); }
    for (const cell of walls) {
      next[cell.z][cell.x] = 1;
      if (this.connected(next, p)) plan.push(cell);
      else next[cell.z][cell.x] = this.grid[cell.z][cell.x];
    }
    for (const cell of plan) { this.grid[cell.z][cell.x] = cell.to; this.emit(cell.to ? 'raise' : 'clear', { x: cell.x, z: cell.z }); }
    this.emit('arenaReshape', { cells: plan, shape, color: this.biome.color, opened: opens.length, raised: plan.length - opens.length });
    return plan;
  }
  createBoss() {
    const x = Math.floor(this.width / 2), z = Math.floor(this.height / 2) - 1;
    for (let zz = z - 1; zz <= z + 1; zz++) for (let xx = x - 1; xx <= x + 1; xx++) {
      this.grid[zz][xx] = 0; this.emit('clear', { x: xx, z: zz });
    }
    const grudge = !!this.expedition?.routed?.includes(this.stage.worldIndex);
    const hp = Math.ceil((14 + this.round * 4) * this.challenge.hp * (grudge ? 1.35 : 1));
    this.boss = { id: this.nextId++, x, z, type: 'boss', variant: this.biome.guardian || this.biome.id, name: this.biome.boss, hp, maxHp: hp, cooldown: 3.2, attackCooldown: 4, hitFlash: 0, attackIndex: 0, enraged: false };
    Object.assign(this.boss, { phase: 1, lastMove: null, comboQueue: [], signatureBeat: 0, riteCounter: grudge ? 2 : 3, retreat: 0, dodgeCooldown: 0, grudge });
    this.boss.entranceTimer = .5; this.boss.intent = 'spawn';
    if (this.stage.kind === 'duel') this.hazardDirector = directorFor(this.biome, this.hazardField);
    this.spawnClock = this.spawnInterval;
    this.emit('boss');
  }
  openBossArena() { queueArenaRite(this, { entrance: true }); }
  bossAttack() {
    if (!this.boss) return null;
    const p = this.player, b = this.boss;
    // Rites stay on their own clock so the arena keeps opening routes and
    // replanting anchors between the guardian's own patterns.
    if (--b.riteCounter <= 0 && queueArenaRite(this)) { b.riteCounter = b.phase >= 3 ? 2 : 3; return null; }
    const repertoire = movesFor(this.biome.id);
    let chosen = chooseBossMove(this, b), at = chosen.teleport ? landingSite(this, b) : null, cells = chosen.build(this, b, p, at);
    // A dash with no room and a rift with no landing fall back to the opening
    // pattern instead of firing an empty, unreadable warning.
    if (cells.length < (chosen.dash ? 2 : 1)) { chosen = repertoire[0]; at = null; cells = chosen.build(this, b, p, null); }
    if (!cells.length) cells = [{ x: p.x, z: p.z }];
    const duration = bossTelegraph(this, b, chosen);
    const path = chosen.dash ? cells.slice() : null;
    cells = carveSafeHouse(this, cells, duration);
    b.attackIndex++; b.lastMove = chosen.id;
    if (chosen.combo && b.phase >= 2 && this.round >= 4) b.comboQueue = [chosen.combo];
    // Self-centred finishers need room: the guardian backs off right after casting.
    if (chosen.keepAway && Math.abs(b.x - p.x) + Math.abs(b.z - p.z) < 4) b.retreat = 1.2;
    b.castTimer = duration; b.castTarget = { x: p.x, z: p.z }; b.intent = 'cast';
    const warning = { id: this.nextId++, bossId: b.id, cells, timer: duration, duration, move: chosen.id, origin: { x: p.x, z: p.z } };
    if (path) warning.path = path;
    if (chosen.teleport && at) warning.landing = { ...at };
    if (chosen.signature) warning.signature = true;
    this.warnings.push(warning);
    this.emit('warning', { id: b.id, cells, duration, name: chosen.name, move: chosen.id, phase: b.phase, signature: !!chosen.signature });
    if (chosen.signature) this.emit('bossSignature', { id: b.id, x: b.x, z: b.z, move: chosen.id, name: chosen.name, duration, color: this.biome.color });
    return chosen;
  }
  // Toda vitoria de fase passa por aqui. Os tres tipos mudam so o `outcome`,
  // que e o que o servidor cruza contra o tipo derivado do numero da fase.
  clearStage(outcome) {
    this.earnedShards += this.stage.reward + Math.floor(this.kills / 5);
    this.materials.cores++;
    this.result = { victory: true, stage: this.round, shards: this.earnedShards, outcome };
    this.hazardDirector?.limpar(); this.hazardDirector = null;
    this.phase = 'intermission'; this.anchors = []; this.warnings = []; this.flames = []; this.bombs = []; this.echoes = [];
    // Unico anuncio de fase vencida. Antes so 'bossDefeated' abria a tela, entao
    // cacada e perseguicao terminavam sem nada: 12 das 18 fases travavam aqui.
    this.emit('stageCleared', { outcome });
  }
  defeatBoss() {
    if (!this.boss || !this.active) return;
    const boss = this.boss; this.boss = null; this.bosses++;
    this.clearStage('slain');
    this.emit('bossDefeated', boss);
  }
  // Cacada: um campeao no lugar do guardiao, aos 120s. Nascer aos 60s quebraria
  // o piso de 120 segundos que o servidor exige em toda vitoria.
  spawnChampion() {
    if (this.champion) return;
    this.phase = 'boss';
    this.stats.bossStartedAt = this.totalTime;
    const champion = this.spawnEnemy('sentinel');
    if (!champion) { this.phase = 'playing'; return; }
    const scale = 1 + (this.round - 1) * .12;
    champion.maxHp = Math.ceil(28 * scale * this.challenge.hp);
    champion.hp = champion.maxHp; champion.champion = true; champion.name = this.biome.champion || 'CAMPEÃO DA FENDA';
    this.champion = champion; this.miniSpawned = true;
    this.spawnClock = this.spawnInterval;
    this.emit('champion', champion);
  }
  defeatChampion(champion) {
    if (this.champion !== champion || !this.active) return;
    this.champion = null;
    this.clearStage('champion');
    this.emit('championDefeated', champion);
  }
  // Perseguicao: o guardiao quebra antes do desespero e some. Nao da para mata-lo
  // -- o golpe que cruzaria o limiar e clampeado no mesmo lugar que dispara a fuga.
  routeBoss(boss) {
    if (!this.boss || this.phase === 'transition') return;
    this.transition = { kind: 'flee', timer: 3.2 };
    this.phase = 'transition';
    this.warnings = []; this.flames = []; this.bombs = []; this.echoes = []; this.anchors = [];
    this.emit('bossFlee', { id: boss.id, x: boss.x, z: boss.z, name: boss.name, line: this.biome.fleeLine || '', color: this.biome.color });
  }
  finishTransition() {
    const done = this.transition; this.transition = null;
    if (done?.kind === 'flee') {
      const boss = this.boss; this.boss = null;
      const world = this.stage.worldIndex;
      if (this.expedition && !this.expedition.routed.includes(world)) this.expedition.routed.push(world);
      this.clearStage('routed');
      this.emit('bossRouted', boss || {});
      return;
    }
    if (done?.kind === 'duel' && this.beginEntrance()) return;
    if (done?.kind === 'duel' || done?.kind === 'entrance') {
      this.phase = 'boss';
      if (!this.boss) this.createBoss();
    }
  }
  nextRound() {
    if (this.phase !== 'intermission') return false;
    this.claimResult(); const next = this.round + 1;
    if (this.campaignMode) return this.start(next);
    this.reset(next); this.phase = 'playing'; this.emit('nextRound'); return true;
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
    this.stats.choices++;
    const p = this.player;
    switch (id) {
      case 'power': p.damage++; break;
      case 'range': p.range++; break;
      case 'capacity': p.capacity++; break;
      case 'speed': p.step *= .9; break;
      case 'health': p.maxHp += 25; this.restoreHealth(35); break;
      case 'magnet': p.magnet++; break;
      case 'fuse': p.fuse *= .88; break;
      case 'dash': p.dashMax *= .82; break;
      case 'heal': this.restoreHealth(50); break;
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
      if (id==='health') { p.armor=Math.min(.6,(p.armor||0)+.2); this.restoreHealth(p.maxHp); }
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
    this.player.hp = 0;
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
    if (this.phase === 'transition') {
      this.transition.timer -= dt;
      if (this.transition.kind === 'entrance') this.runEntranceBeats();
      if (this.transition.timer <= 0) this.finishTransition();
      return;
    }
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
      if (this.elapsed >= ROUND_SECONDS) this.stage.kind === 'hunt' ? this.spawnChampion() : this.spawnBoss();
    }
    this.stepHazards(dt);
    this.checkArenaCleared();
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
        this.stats.echoExplosions++;
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
    updateBossAI(this, dt, hazards);
    for (const enemy of [...this.enemies]) {
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
        else { if (enemy.x === p.x && enemy.z === p.z) this.hurt(12, { de: { x: enemy.x, z: enemy.z, tipo: enemy.type } }); continue; }
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
            enemy.cooldown = (enemy.intent === 'evade' ? .42 : enemy.type === 'boss' ? (enemy.enraged ? .75 : .95) : enemy.type === 'ember' ? .65 : enemy.type === 'beetle' ? 1.1 : .9) / (1 + Math.min(.5, (this.round - 1) * .035)) * (enemy.slow ? 1.8 : 1) * (this.round === 1 ? 1.35 : this.round === 2 ? 1.2 : 1) / this.challenge.speed;
          }
        }
      }
      if (enemy.x === p.x && enemy.z === p.z) this.hurt(enemy.type === 'boss' ? 30 : chargedThisTick || enemy.intent === 'charge' ? 20 : 12, { de: { x: enemy.x, z: enemy.z, tipo: enemy.type } });
    }
    if (this.boss && this.active) {
      const b = this.boss, phase = bossPhaseFor(b);
      // Three real acts instead of one fury flip: each threshold wipes the
      // pending marks, reopens the arena (fresh anchors) and resets the rhythm.
      if (phase > b.phase && !b.stagger && !b.frozen) {
        b.phase = phase; b.comboQueue = []; b.lastMove = null; b.signatureBeat = 0; b.retreat = 0;
        b.castTimer = 0; b.recovery = 0; b.attackCooldown = phase >= 3 ? 1.1 : 1.6;
        this.warnings = []; queueArenaRite(this);
        if (!b.enraged) { b.enraged = true; this.emit('bossEnraged', b); }
        this.emit('bossPhase', { id: b.id, x: b.x, z: b.z, phase, label: PHASE_LABELS[phase], name: b.name, hp: b.hp, maxHp: b.maxHp, color: this.biome.color });
      }
      if (!b.stagger && !b.frozen && !b.entranceTimer && !b.castTimer && !b.recovery) {
        b.attackCooldown -= dt;
        // The beat is read after the attack, so a pattern that just linked a
        // follow-up gets the fast second half of its combo.
        if (b.attackCooldown <= 0) { this.bossAttack(); b.attackCooldown = bossRhythm(this, b); }
      }
    }
    for (const w of [...this.warnings]) {
      w.timer -= dt;
      if (w.timer <= 0) {
        if (w.bossId) {
          if (!this.boss || this.boss.id !== w.bossId) continue;
          // Desperation buys a longer counter-attack window: the bigger the
          // telegraph the player just read, the wider the opening it earns.
          this.boss.castTimer=0; this.boss.recovery = w.signature ? 1.5 : this.boss.phase >= 3 ? .95 : .65; this.boss.cooldown=this.boss.recovery;
          if(w.breach) for(const c of w.cells){this.grid[c.z][c.x]=0;this.emit('clear',c);}
          this.emit('bossImpact',{id:this.boss.id,x:this.boss.x,z:this.boss.z,cells:w.cells,color:this.biome.color});
          resolveBossMove(this, w);
        }
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
