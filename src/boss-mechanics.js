// These attacks open routes. Rune anchors never block movement and reward bombs.
export const ARENA_RITES = {
  ruins: { name: 'O CAMPANÁRIO DESABA', hint: 'Pilares vão ruir. Exploda as runas para atordoar Mórthos!', color: '#c5a1ff', shape: 'pillars' },
  forge: { name: 'A FORNALHA SE ABRE', hint: 'Saia da faixa laranja. Exploda as válvulas para resfriar Vulkar!', color: '#ffac68', shape: 'row' },
  abyss: { name: 'O HORIZONTE SE PARTE', hint: 'Nyxara muda de posição. Exploda os espelhos e interrompa a rainha!', color: '#75e8eb', shape: 'diagonal', teleport: true },
  garden: { name: 'RAÍZES SOB A PEDRA', hint: 'As raízes rompem os pilares. Destrua os bulbos luminosos!', color: '#b3eb8d', shape: 'pillars' },
  storm: { name: 'SOBRECARGA DO NÚCLEO', hint: 'Saia do circuito amarelo. Destrua os condutores para parar Fulgra!', color: '#ffe085', shape: 'column' },
  frost: { name: 'O INVERNO SE ESTILHAÇA', hint: 'O gelo abre uma diagonal. Destrua os cristais e quebre a coroa!', color: '#a3dfff', shape: 'diagonal' },
};

const DIRS = [[0,-1],[1,0],[0,1],[-1,0]];
const distance = (a,b) => Math.abs(a.x-b.x)+Math.abs(a.z-b.z);
const open = (g,x,z) => g.tile(x,z) === 0;
const add = (out,g,x,z) => { if (open(g,x,z) && !out.some(c => c.x===x && c.z===z)) out.push({x,z}); };

// Every guardian attack is assembled from these shapes so each pattern keeps a
// readable silhouette on the floor: a player can name the shape before it lands.
const square = (g,c,r) => { const out=[]; for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++)add(out,g,c.x+dx,c.z+dz); return out; };
const ring = (g,c,r) => { const out=[]; for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++)if(Math.max(Math.abs(dx),Math.abs(dz))===r)add(out,g,c.x+dx,c.z+dz); return out; };
const cross = (g,c,len) => { const out=[]; add(out,g,c.x,c.z); for(const [dx,dz] of DIRS)for(let i=1;i<=len;i++){const x=c.x+dx*i,z=c.z+dz*i; if(!open(g,x,z))break; add(out,g,x,z);} return out; };
const rows = (g,zs) => { const out=[]; for(const z of zs)for(let x=1;x<g.width-1;x++)add(out,g,x,z); return out; };
const columns = (g,xs) => { const out=[]; for(const x of xs)for(let z=1;z<g.height-1;z++)add(out,g,x,z); return out; };
const diagonals = (g,c,r) => { const out=[]; for(let d=-r;d<=r;d++)for(const s of [-1,1])add(out,g,c.x+d,c.z+d*s); return out; };
function lane(g,b,p,len) {
  const dx = Math.abs(p.x-b.x) >= Math.abs(p.z-b.z) ? Math.sign(p.x-b.x) : 0, dz = dx ? 0 : Math.sign(p.z-b.z);
  const out = []; if (!dx && !dz) return out;
  for (let i=1;i<=len;i++) { const x=b.x+dx*i,z=b.z+dz*i; if(!open(g,x,z))break; out.push({x,z}); }
  return out;
}
export function landingSite(g,b) {
  const p = g.player, spots = [];
  for (let z=1;z<g.height-1;z++)for(let x=1;x<g.width-1;x++) {
    const cell = {x,z};
    if (!g.walkable(x,z) || g.occupied(x,z,b) || distance(cell,p) < 4 || distance(cell,p) > 9) continue;
    if (!g.reachableWithin(p,cell,12)) continue;
    spots.push(cell);
  }
  return spots.length ? spots[Math.floor(g.random()*spots.length)] : null;
}

// Each guardian owns a repertoire ordered from teaching patterns to signature
// moves. The last entry is the desperation move, unlocked only in phase three.
const move = (id,name,phase,build,extra={}) => ({ id, name, phase, build, ...extra });
export const BOSS_MOVES = {
  ruins: [
    move('toque','DOBRAR DOS SINOS',1,(g,b,p)=>square(g,p,1)),
    move('cruz','CRUZ DO SILÊNCIO',1,(g,b,p)=>cross(g,distance(b,p)>4?p:b,5)),
    move('anel','ANEL DE PEDRA',2,(g,b,p)=>ring(g,p,2),{combo:'toque'}),
    move('marcha','MARCHA DO SINO',2,(g,b,p)=>lane(g,b,p,6),{dash:true}),
    move('campanario','O CAMPANÁRIO CAI',3,(g,b)=>[...ring(g,b,2),...ring(g,b,4)],{signature:true,keepAway:true,anchor:true}),
  ],
  forge: [
    move('veio','VEIO DE LAVA',1,(g,b,p)=>rows(g,[p.z])),
    move('fornalha','FORNALHA VIVA',1,(g,b,p)=>square(g,p,1)),
    move('ruptura','RUPTURA ÍGNEA',2,(g,b,p)=>[...rows(g,[p.z]),...columns(g,[p.x])],{combo:'fornalha'}),
    move('escoria','INVESTIDA DE ESCÓRIA',2,(g,b,p)=>lane(g,b,p,6),{dash:true}),
    move('incandescente','CHÃO INCANDESCENTE',3,(g,b,p)=>rows(g,[p.z-2,p.z,p.z+2]),{signature:true,followUp:{name:'O CHÃO AINDA QUEIMA',build:(g,b,p,w)=>rows(g,[w.origin.z-1,w.origin.z+1])}}),
  ],
  abyss: [
    move('mare','MARÉ DAS ALMAS',1,(g,b,p)=>ring(g,p,2)),
    move('fenda','FENDA ESPECTRAL',1,(g,b,p)=>cross(g,distance(b,p)>4?p:b,5)),
    move('salto','SALTO DO VAZIO',2,(g,b,p,at)=>at?square(g,at,1):[],{teleport:true}),
    move('chamado','CHAMADO DO ABISMO',2,(g,b,p)=>square(g,p,1),{summon:'wisp',combo:'mare'}),
    move('horizonte','O HORIZONTE DEVORA',3,(g,b,p,at)=>at?[...square(g,at,1),...ring(g,b,2)]:[],{signature:true,teleport:true}),
  ],
  garden: [
    move('coroa','COROA DE SEMENTES',1,(g,b,p)=>ring(g,p,2)),
    move('raizes','RAÍZES DO SILÊNCIO',1,(g,b,p)=>cross(g,distance(b,p)>4?p:b,5)),
    move('bulbo','BULBO ESTOURADO',2,(g,b,p)=>square(g,p,1),{combo:'coroa'}),
    move('avanco','AVANÇO DE RAÍZES',2,(g,b,p)=>lane(g,b,p,6),{dash:true}),
    move('cerco','O JARDIM SE FECHA',3,(g,b,p)=>[...ring(g,p,2),...ring(g,p,4)],{signature:true}),
  ],
  storm: [
    move('colunas','COLUNAS DO TROVÃO',1,(g,b,p)=>columns(g,[p.x-1,p.x+1])),
    move('circuito','CIRCUITO PARTIDO',1,(g,b,p)=>cross(g,distance(b,p)>4?p:b,5)),
    move('grade','GRADE ELÉTRICA',2,(g,b,p)=>[...rows(g,[p.z]),...columns(g,[p.x])],{combo:'colunas'}),
    move('arco','ARCO DIRETO',1,(g,b,p)=>lane(g,b,p,8),{dash:true}),
    move('sobrecarga','SOBRECARGA TOTAL',3,(g,b,p)=>columns(g,[p.x-2,p.x,p.x+2]),{signature:true,followUp:{name:'O CIRCUITO FECHA',build:(g,b,p,w)=>rows(g,[w.origin.z-2,w.origin.z,w.origin.z+2])}}),
  ],
  frost: [
    move('lancas','LANÇAS DA AURORA',1,(g,b,p)=>diagonals(g,p,3)),
    move('coroa','COROA DO INVERNO',1,(g,b,p)=>ring(g,p,1)),
    move('geada','ANEL DE GEADA',2,(g,b,p)=>ring(g,p,2),{combo:'coroa'}),
    move('avalanche','AVALANCHE',2,(g,b,p)=>lane(g,b,p,6),{dash:true}),
    move('inverno','O INVERNO FECHA',3,(g,b,p)=>[...diagonals(g,p,4),...ring(g,p,2)],{signature:true}),
  ],
};
export const PHASE_LABELS = { 1: 'I · O DESPERTAR', 2: 'II · FÚRIA', 3: 'III · DESESPERO' };
export const MIN_TELEGRAPH = 1;
export const bossPhaseFor = boss => { const ratio = boss.maxHp ? boss.hp / boss.maxHp : 1; return ratio <= .3 ? 3 : ratio <= .6 ? 2 : 1; };
export const movesFor = biome => BOSS_MOVES[biome] || BOSS_MOVES.ruins;

// Early worlds keep a two-pattern vocabulary and slow telegraphs; the last
// worlds unlock the whole repertoire and cut the reaction window nearly in half.
export function bossRepertoire(game, boss) {
  const list = movesFor(game.biome.id), cap = game.round <= 3 ? 2 : game.round <= 9 ? 3 : list.length;
  const basic = list.filter(m => !m.signature && m.phase <= boss.phase).slice(0, cap);
  const signature = boss.phase >= 3 ? list.filter(m => m.signature) : [];
  return [...basic, ...signature];
}
export function bossTelegraph(game, boss, chosen = {}) {
  const base = boss.phase >= 3 ? 1.05 : boss.phase >= 2 ? 1.15 : 1.3;
  const teaching = game.round <= 3 ? .6 : game.round <= 9 ? .3 : game.round <= 15 ? .15 : .05;
  return Math.max(MIN_TELEGRAPH, base + teaching + (chosen.signature ? .45 : 0));
}
export function bossRhythm(game, boss) {
  const base = boss.phase >= 3 ? 1.2 : boss.phase >= 2 ? 1.6 : 2.1;
  if (boss.comboQueue?.length) return base * .55;
  return base * (game.round <= 3 ? 1.35 : game.round <= 9 ? 1.12 : 1);
}
export function chooseBossMove(game, boss) {
  const pool = bossRepertoire(game, boss);
  if (!pool.length) return movesFor(game.biome.id)[0];
  if (boss.comboQueue?.length) { const queued = boss.comboQueue.shift(); const linked = pool.find(m => m.id === queued); if (linked) return linked; }
  const signature = pool.find(m => m.signature);
  if (signature && boss.lastMove !== signature.id) {
    if ((boss.signatureBeat ?? 0) <= 0) { boss.signatureBeat = 2; return signature; }
    boss.signatureBeat--;
  }
  const plain = pool.filter(m => !m.signature);
  const fresh = plain.filter(m => m.id !== boss.lastMove);
  const choices = fresh.length ? fresh : plain.length ? plain : pool;
  return choices[Math.floor(game.random() * choices.length)] || choices[0];
}

// Fairness floor: whatever the pattern, at least one tile the player can still
// walk to before impact must stay clean. Nothing the guardian does is a checkmate.
export function playerReach(game, steps) {
  const p = game.player, seen = new Set([`${p.x},${p.z}`]), out = [{ x: p.x, z: p.z }];
  let frontier = out.slice();
  for (let i = 0; i < steps; i++) {
    const next = [];
    for (const c of frontier) for (const [dx,dz] of DIRS) {
      const x = c.x+dx, z = c.z+dz, key = `${x},${z}`;
      if (seen.has(key) || !game.walkable(x,z)) continue;
      seen.add(key); next.push({x,z}); out.push({x,z});
    }
    frontier = next;
  }
  return out;
}
// One step of the budget is spent on reaction and on the step already in flight,
// so the guaranteed shelter always sits closer than the raw timing allows.
export const escapeSteps = (game, duration) => Math.min(8, Math.max(1, Math.floor(duration / Math.max(.08, game.player.step * (game.player.slow > 0 ? 1.6 : 1))) - 1));
export function safeHouses(game, cells, duration) {
  const danger = new Set(cells.map(c => `${c.x},${c.z}`));
  // Chao aceso nao e refugio: uma casa em brasa e tao fatal quanto uma marcada.
  return playerReach(game, escapeSteps(game, duration)).filter(c => !danger.has(`${c.x},${c.z}`) && !game.harmful?.(c.x, c.z));
}
export function carveSafeHouse(game, cells, duration) {
  const reach = playerReach(game, escapeSteps(game, duration)), danger = new Set(cells.map(c => `${c.x},${c.z}`));
  // Marks already on the floor count as danger too: two overlapping patterns
  // must never add up to a checkmate.
  const pending = new Set(game.warnings.filter(w => w.damage !== 0).flatMap(w => w.cells).map(c => `${c.x},${c.z}`));
  const livre = c => !danger.has(`${c.x},${c.z}`) && !pending.has(`${c.x},${c.z}`) && !game.harmful?.(c.x, c.z);
  if (reach.some(livre)) return cells;
  const boss = game.boss || game.player;
  const clear = reach.filter(c => !pending.has(`${c.x},${c.z}`) && !game.harmful?.(c.x, c.z));
  const refuge = (clear.length ? clear : reach).slice().sort((a,c) => distance(c,boss) - distance(a,boss))[0];
  // Terceiro degrau, e o unico que mexe no mundo em vez de na marca: se o
  // refugio que sobrou esta em brasa, a brasa apaga. Entregar xeque-mate seria
  // pior que perder uma casa de perigo. Nunca deve acontecer -- o orcamento e
  // dimensionado para isso, e o teste assere que o contador fica em zero.
  if (game.harmful?.(refuge.x, refuge.z)) {
    game.hazardField.remove(refuge.x, refuge.z);
    game.hazardRescues = (game.hazardRescues || 0) + 1;
  }
  return cells.filter(c => c.x !== refuge.x || c.z !== refuge.z);
}

export function queueArenaRite(game, { entrance = false } = {}) {
  if (!game.boss || game.warnings.some(w => w.rite)) return false;
  const rite = ARENA_RITES[game.biome.id], b = game.boss, candidates = [];
  const cx = Math.floor(game.width / 2), cz = Math.floor(game.height / 2);
  const offset = b.attackIndex % 2 ? 2 : -2;
  for (let z = 2; z < game.height - 2; z++) for (let x = 2; x < game.width - 2; x++) {
    const selected = rite.shape === 'row' ? z === cz + offset : rite.shape === 'column' ? x === cx + offset : rite.shape === 'diagonal' ? x - cx === z - cz : game.tile(x,z) === 1;
    if (selected && Math.abs(x-cx)+Math.abs(z-cz) <= 8) candidates.push({x,z});
  }
  if (rite.shape === 'pillars') candidates.sort((a,c) => Math.abs(a.x-b.x)+Math.abs(a.z-b.z)-Math.abs(c.x-b.x)-Math.abs(c.z-b.z));
  let cells = candidates.slice(0, rite.shape === 'pillars' ? 4 : 10);
  if (entrance) {
    // Cut a connected escape/chase route through remaining crates and pillars.
    let x=b.x,z=b.z;
    while(x!==game.player.x || z!==game.player.z) {
      if(x!==game.player.x)x+=Math.sign(game.player.x-x);else z+=Math.sign(game.player.z-z);
      if(!cells.some(c=>c.x===x&&c.z===z))cells.push({x,z});
    }
  }
  if (!cells.length && rite.shape === 'pillars') {
    for(const dx of [-2,2])for(const dz of [-2,2]) {
      const x=b.x+dx,z=b.z+dz;
      if(x>0&&z>0&&x<game.width-1&&z<game.height-1)cells.push({x,z});
    }
  }
  if (!cells.length) return false;
  const duration = game.round <= 3 ? 2.4 : 2;
  const damage = !entrance && ['forge','storm'].includes(game.biome.id) ? 18 : 0;
  if (damage) cells = carveSafeHouse(game, cells, duration);
  game.warnings.push({ id: game.nextId++, bossId:b.id, cells, duration, timer: duration, rite: game.biome.id, color: rite.color, damage });
  b.castTimer=duration; b.intent='cast'; b.castTarget={x:game.player.x,z:game.player.z};
  b.cooldown = Math.max(b.cooldown, duration + .6);
  b.attackCooldown = 1.2;
  game.emit('warning', { id:b.id, cells, duration, name: rite.name, phase: b.phase || 1 });
  game.emit('arenaRite', { ...rite, cells });
  return true;
}

export function resolveArenaRite(game, warning) {
  if (!game.boss || !game.active) return;
  const rite = ARENA_RITES[warning.rite];
  for (const cell of warning.cells) {
    if (cell.x <= 0 || cell.z <= 0 || cell.x >= game.width-1 || cell.z >= game.height-1) continue;
    if (game.tile(cell.x,cell.z)) { game.grid[cell.z][cell.x] = 0; game.emit('clear', cell); }
  }
  const sites = warning.cells.filter(c => Math.abs(c.x-game.player.x)+Math.abs(c.z-game.player.z) > 2 && !game.bombs.some(b => b.x===c.x&&b.z===c.z));
  game.anchors = [];
  for (const cell of sites.filter((_,i) => i % Math.max(1,Math.floor(sites.length/2))===0).slice(0,2)) {
    game.anchors.push({ id: game.nextId++, ...cell, hp: 2, life: 16, color: rite.color });
  }
  if (rite.teleport && sites.length) {
    const from = {x:game.boss.x,z:game.boss.z}, destination = sites[sites.length-1];
    Object.assign(game.boss, destination);
    game.emit('bossTeleport', { ...destination, from, color: rite.color });
  }
  game.emit('arenaShift', { cells: warning.cells, color: rite.color });
}

// Runs when a telegraphed guardian move lands: the movement half of an attack
// always happens after the floor was marked, never before.
export function resolveBossMove(game, warning) {
  const b = game.boss; if (!b || !game.active || !warning.move || warning.followedUp) return;
  const chosen = movesFor(game.biome.id).find(m => m.id === warning.move); if (!chosen) return;
  if (chosen.dash && warning.path?.length) {
    const from = { x: b.x, z: b.z };
    let target = null;
    for (const cell of warning.path) {
      if (!game.walkable(cell.x, cell.z) || game.occupied(cell.x, cell.z, b)) break;
      target = cell;
    }
    if (target) {
      b.facing = [Math.sign(target.x-from.x), Math.sign(target.z-from.z)];
      b.x = target.x; b.z = target.z;
      game.emit('bossDash', { id: b.id, from, x: b.x, z: b.z, cells: warning.path });
      game.emit('bossStep', { id: b.id, x: b.x, z: b.z });
    }
  }
  if (chosen.teleport && warning.landing && game.walkable(warning.landing.x, warning.landing.z) && !game.occupied(warning.landing.x, warning.landing.z, b)) {
    const from = { x: b.x, z: b.z };
    b.x = warning.landing.x; b.z = warning.landing.z;
    game.emit('bossTeleport', { x: b.x, z: b.z, from, color: ARENA_RITES[game.biome.id].color });
  }
  if (chosen.summon && game.enemies.length < 12) game.spawnEnemy(chosen.summon);
  if (chosen.anchor) {
    const spot = warning.cells.find(c => game.tile(c.x,c.z) === 0 && distance(c, game.player) > 2 && !game.anchors.some(a => a.x===c.x && a.z===c.z) && !game.bombs.some(bomb => bomb.x===c.x && bomb.z===c.z));
    if (spot) game.anchors.push({ id: game.nextId++, ...spot, hp: 2, life: 16, color: ARENA_RITES[game.biome.id].color });
  }
  if (chosen.followUp) {
    const duration = Math.max(MIN_TELEGRAPH, bossTelegraph(game, b) * .85);
    const cells = carveSafeHouse(game, chosen.followUp.build(game, b, game.player, warning), duration);
    if (cells.length) {
      b.castTimer = duration; b.recovery = 0; b.cooldown = Math.max(b.cooldown, duration); b.intent = 'cast';
      game.warnings.push({ id: game.nextId++, bossId: b.id, cells, timer: duration, duration, move: warning.move, origin: warning.origin, followedUp: true, combo: true });
      game.emit('warning', { id: b.id, cells, duration, name: chosen.followUp.name, move: warning.move, phase: b.phase, combo: true });
    }
  }
}
