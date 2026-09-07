// These attacks open routes. Rune anchors never block movement and reward bombs.
export const ARENA_RITES = {
  ruins: { name: 'O CAMPANÁRIO DESABA', hint: 'Pilares vão ruir. Exploda as runas para atordoar Mórthos!', color: '#c5a1ff', shape: 'pillars' },
  forge: { name: 'A FORNALHA SE ABRE', hint: 'Saia da faixa laranja. Exploda as válvulas para resfriar Vulkar!', color: '#ffac68', shape: 'row' },
  abyss: { name: 'O HORIZONTE SE PARTE', hint: 'Nyxara muda de posição. Exploda os espelhos e interrompa a rainha!', color: '#75e8eb', shape: 'diagonal', teleport: true },
  garden: { name: 'RAÍZES SOB A PEDRA', hint: 'As raízes rompem os pilares. Destrua os bulbos luminosos!', color: '#b3eb8d', shape: 'pillars' },
  storm: { name: 'SOBRECARGA DO NÚCLEO', hint: 'Saia do circuito amarelo. Destrua os condutores para parar Fulgra!', color: '#ffe085', shape: 'column' },
  frost: { name: 'O INVERNO SE ESTILHAÇA', hint: 'O gelo abre uma diagonal. Destrua os cristais e quebre a coroa!', color: '#a3dfff', shape: 'diagonal' },
};

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
  const cells = candidates.slice(0, rite.shape === 'pillars' ? 4 : 10);
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
  game.warnings.push({ id: game.nextId++, bossId:b.id, cells, duration, timer: duration, rite: game.biome.id, color: rite.color, damage: !entrance && ['forge','storm'].includes(game.biome.id) ? 18 : 0 });
  b.castTimer=duration; b.intent='cast'; b.castTarget={x:game.player.x,z:game.player.z};
  b.cooldown = Math.max(b.cooldown, duration + .6);
  b.attackCooldown = 1.2;
  game.emit('warning', { id:b.id, cells, duration, name: rite.name });
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
