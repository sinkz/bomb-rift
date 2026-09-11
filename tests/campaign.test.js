import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, seededRandom } from '../src/game.js';
import { stageFor, RELICS, CAMPAIGN_LENGTH } from '../src/campaign.js';

const game = (stage = 1, seed = 42) => {
  const g = new Game({ random: seededRandom(seed), meta: { unlockedStage: stage, health: 2, power: 1, shards: 7 } });
  g.start(stage); g.enemies = []; g.pickups = []; g.spawnClock = Infinity; g.player.invincible = 999;
  return g;
};
const tick = (g, seconds) => { for(let i = 0; i < seconds * 60; i++) { g.tick(1/60); if(g.phase === 'upgrade') g.chooseSkill(g.offers[0].id); } };

test('eighteen authored stages lead to unlimited ascensions with matching worlds', () => {
  for(let n=1;n<=90;n++) { const s=stageFor(n); assert.equal(s.cycle,Math.floor((n-1)/CAMPAIGN_LENGTH)); assert.equal(s.worldIndex,Math.floor((n-1)%CAMPAIGN_LENGTH/3)); }
  assert.equal(stageFor(19).name,stageFor(1).name); assert(stageFor(19).reward>stageFor(1).reward);
  assert(stageFor(9).width>stageFor(1).width); assert(stageFor(9).height>stageFor(1).height);
});
test('locked and malformed stage requests do not modify a running stage', () => {
  const g=game(); const player=g.player;
  for(const n of [2,100,0,-1,NaN,1.5]) assert.equal(g.start(n),false);
  assert.equal(g.player,player); assert.equal(g.round,1);
});
test('victory saves one reward, unlocks the next phase and resets all temporary systems', () => {
  const g=game(); g.kills=11; g.crystals=99; g.skillLevels.range=4; g.player.range=6; g.forgeCount=3; g.xp=31; g.level=4; g.equipRelic('azure'); g.equipRelic('phoenix');
  g.spawnBoss(); g.defeatBoss(); const reward=g.earnedShards;
  assert.equal(reward,10); assert(g.claimResult()); assert(!g.claimResult()); g.defeatBoss();
  assert.equal(g.meta.shards,7+reward); assert.equal(g.meta.unlockedStage,2);
  assert(g.returnToMap()); assert(g.start(2));
  assert.deepEqual(g.relics,[]); assert.deepEqual(g.skillLevels,{}); assert.equal(g.player.damage,3); assert.equal(g.player.maxHp,120); assert.equal(g.player.hp,120);
  assert.equal(g.player.range,2); assert.equal(g.player.fire,'normal'); assert.equal(g.player.revive,false);
  for(const field of ['xp','crystals','forgeCount','earnedShards','pendingLevels']) assert.equal(g[field],0);
  assert.equal(g.level,1); assert.equal(g.meta.shards,17);
});
test('death gives only earned essence and keeps campaign unlocks', () => {
  const g=game(5); g.kills=14; g.player.invincible=0; g.hurt(999);
  assert(g.claimResult()); assert(!g.claimResult()); assert.equal(g.meta.shards,9); assert.equal(g.meta.unlockedStage,5);
});
test('all world layouts have safe spawn, reachable cache and intact boundaries', () => {
  for(let stage=1;stage<=CAMPAIGN_LENGTH;stage++) for(let seed=1;seed<=20;seed++) {
    const g=game(stage,seed); assert.equal(g.grid.length,g.height); assert(g.grid.every(row=>row.length===g.width));
    assert.equal(g.tile(1,1),0); assert.equal(g.tile(2,1),0); assert.equal(g.tile(1,2),0); assert.equal(g.tile(3,3),2);
    assert(g.grid[0].every(t=>t===1)); assert(g.grid.at(-1).every(t=>t===1)); assert(g.grid.every(row=>row[0]===1 && row.at(-1)===1));
    // Removing destructibles must connect every floor cell, including boss spawn.
    const seen=new Set(['1,1']), q=[[1,1]];
    while(q.length) { const [x,z]=q.shift(); for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]) { const key=`${x+dx},${z+dz}`; if(g.tile(x+dx,z+dz)!==1&&!seen.has(key)){seen.add(key);q.push([x+dx,z+dz]);} } }
    for(let z=1;z<g.height-1;z++) for(let x=1;x<g.width-1;x++) if(g.tile(x,z)!==1) assert(seen.has(`${x},${z}`));
  }
});
test('beginners follow the player into forecasts while later hunters seek safety', () => {
  const g=game(); for(let z=1;z<12;z++) for(let x=1;x<14;x++) g.grid[z][x]=0;
  g.player.x=7;g.player.z=3;const enemy={id:2,type:'slime',x:4,z:3,awareness:.4};
  g.bombs=[{id:700,x:3,z:3,fuse:.4,range:3}];
  assert.deepEqual(g.nextStep(enemy),{x:5,z:3}); assert.equal(enemy.intent,'hunt');
  g.round=9; const escape=g.nextStep(enemy); assert.equal(enemy.intent,'evade'); assert(!g.dangerMap().has(`${escape.x},${escape.z}`));
});
test('blue fire, clock and echo combine into mechanically different bombs', () => {
  const g=game();g.equipRelic('azure');g.equipRelic('clock');g.equipRelic('echo');assert(!g.equipRelic('clock'));
  g.plantBomb();const bomb=g.bombs[0];assert.equal(bomb.damage,6);assert.equal(bomb.range,3);assert.equal(bomb.fuse,3.1);
  g.explode(bomb);assert.equal(g.flames[0].fire,'azure');assert.equal(g.flames[0].life,1.1);assert.equal(g.echoes.length,1);
  g.drainEvents();tick(g,1);assert(g.drainEvents().some(e=>e.type==='echo'));assert.equal(g.echoes.length,0);
});
test('frost slows targets and phoenix prevents death only once', () => {
  const g=game();g.equipRelic('frost');const e={id:999,type:'slime',hp:20,x:5,z:5};g.enemies=[e];
  g.applyFlame({cells:[{x:5,z:5}],damage:2,hit:new Set()});assert.equal(e.slow,2.5);
  g.equipRelic('phoenix');g.player.hp=1;g.player.invincible=0;g.hurt(50);assert.equal(g.phase,'playing');assert.equal(g.player.hp,60);assert.equal(g.player.revive,false);
  g.player.invincible=0;g.hurt(999);assert.equal(g.phase,'dead');
});
test('relic collection equips without corrupting numeric currency and avoids duplicates', () => {
  const g=game();g.addPickup(1,1,'relic','magnet');g.collect();assert(g.relics.includes('magnet'));assert.equal(g.crystals,0);assert.equal(g.xp,0);assert.equal(g.player.magnet,3.25);
  for(const r of RELICS) g.equipRelic(r.id);g.dropRelic(1,1);assert.equal(g.pickups[0].type,'crystal');
});
test('the champion closes a hunt stage at 120s, drops a relic and never appears elsewhere', () => {
  // Cacada: nada aos 60s. O campeao nasce aos 120s, no lugar do guardiao.
  const g=game(1);assert.equal(g.stage.kind,'hunt');
  g.elapsed=59.98;g.tick(.05);assert(!g.enemies.some(e=>e.type==='sentinel'),'nao ha sentinela aos 60s');
  g.elapsed=119.98;g.tick(.05);
  const champ=g.champion;assert(champ,'o campeao fecha a cacada');assert.equal(g.phase,'boss');
  assert(champ.maxHp>12,'o campeao e mais duro que um sentinela comum');
  g.tick(.1);assert.equal(g.enemies.filter(e=>e.type==='sentinel').length,1,'so um campeao por fase');
  g.applyFlame({cells:[{x:champ.x,z:champ.z}],damage:9999,hit:new Set()});
  assert(g.pickups.some(p=>p.type==='relic'));assert(g.earnedShards>=3);
  assert.equal(g.phase,'intermission');assert.equal(g.result.outcome,'champion');assert.equal(g.bosses,0);
  // Perseguicao e duelo nao tem campeao nenhum.
  for(const stage of [2,3]){const other=game(stage);other.elapsed=119.98;other.tick(.05);
    assert.equal(other.champion,null,`a fase ${stage} nao tem campeao`);}
});
test('world hazards are announced, bounded, pause-safe and distinct', () => {
  const g=game(4);g.environmentAttack();assert(g.warnings.length);const warning=g.warnings[0];assert.equal(warning.timer,1.65);assert(warning.cells.every(c=>g.tile(c.x,c.z)===0));
  g.pause();g.tick(10);assert.equal(warning.timer,1.65);g.pause();tick(g,1.7);assert(g.flames.some(f=>f.enemy));
  const abyss=game(7);abyss.environmentAttack();assert(abyss.warnings[0].cells.every(c=>c.z===abyss.warnings[0].cells[0].z));
  const ruins=game();ruins.environmentAttack();assert.equal(ruins.warnings.length,0);
});
test('wisp telegraphs a ranged attack without needing an open charge lane', () => {
  const g=game(7);g.player.x=3;g.player.z=3;g.grid[3][3]=0;
  const w={id:999,type:'wisp',x:7,z:3,hp:5,maxHp:5,cooldown:5,castCooldown:0,hitFlash:0};g.enemies=[w];g.tick(.01);
  assert.equal(w.intent,'cast');assert(g.warnings.some(w=>w.cells.some(c=>c.x===3&&c.z===3)));assert(g.drainEvents().some(e=>e.type==='enemyCast'));
});

// A entrada cinematica do primeiro guardiao. So o duelo tem, e so em 'ruins':
// e um teste de ritmo antes de espalhar a coreografia para os seis mundos.
test('a entrada do primeiro guardiao congela a arena, invoca escolta e so entao cria o chefe', () => {
  const g = game(3);
  assert.equal(g.stage.kind, 'duel');
  assert.equal(g.biome.id, 'ruins');

  g.spawnBoss();
  // Primeiro a arena se parte; o chefe ainda nao existe.
  assert.equal(g.phase, 'transition');
  assert.equal(g.transition.kind, 'duel');
  assert.equal(g.boss, null);

  tick(g, 2.7);
  // Terminada a remodelagem, encadeia na entrada em vez de criar o chefe.
  assert.equal(g.phase, 'transition');
  assert.equal(g.transition.kind, 'entrance');
  assert.equal(g.boss, null);

  const batidas = [];
  const hpInicial = g.player.hp;
  for (let i = 0; i < 5 * 60 && g.phase === 'transition'; i++) {
    g.tick(1 / 60);
    for (const event of g.drainEvents()) if (event.type === 'bossEntranceBeat') batidas.push(event);
  }

  assert.deepEqual(batidas.map(b => b.kind), ['rumble', 'fissure', 'summon', 'slam']);
  // I2 vale de graca aqui: o jogo nao simula nada durante a transicao.
  assert.equal(g.player.hp, hpInicial);

  const escolta = batidas.find(b => b.kind === 'summon').escort;
  assert.equal(escolta.length, 3);
  for (const unit of escolta) {
    assert(g.walkable(unit.x, unit.z), 'escolta nasceu em parede');
    assert(Math.abs(unit.x - g.player.x) + Math.abs(unit.z - g.player.z) > 5, 'escolta nasceu perto demais do jogador');
  }
  assert.equal(new Set(escolta.map(u => `${u.x},${u.z}`)).size, 3, 'escolta empilhada na mesma casa');

  assert.equal(g.phase, 'boss');
  assert(g.boss, 'o guardiao nao chegou ao fim da entrada');
  assert.deepEqual({ x: g.boss.x, z: g.boss.z }, g.bossSeat);
});

test('perseguicao e cacada nao ganham entrada cinematica', () => {
  const chase = game(2);
  assert.equal(chase.stage.kind, 'chase');
  chase.spawnBoss();
  assert.equal(chase.phase, 'boss');
  assert(chase.boss, 'a perseguicao deve trazer o guardiao na hora');
});
