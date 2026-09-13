import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, seededRandom, SKILLS } from '../src/game.js';
import { stageFor } from '../src/campaign.js';
import { queueArenaRite, resolveArenaRite } from '../src/boss-mechanics.js';
import { Music, THEMES } from '../src/music.js';
import { skillArt, skillPreview } from '../src/skill-art.js';
import { masteryProgress } from '../src/skills.js';
import { PROGRESSION_EN } from '../src/progression-en.js';
const blank = (stage=1) => {
  const g=new Game({random:seededRandom(21),meta:{unlockedStage:18}});g.start(stage);
  g.enemies=[];g.pickups=[];g.spawnClock=Infinity;g.hazardClock=Infinity;g.player.invincible=0;
  for(let z=1;z<g.height-1;z++)for(let x=1;x<g.width-1;x++)g.grid[z][x]=0;
  g.drainEvents();return g;
};
function pick(g,id,n=1){for(let i=0;i<n;i++){assert(g.openUpgrade());g.offers=[SKILLS.find(s=>s.id===id)];assert(g.chooseSkill(id));}}
// O juramento e feito na SEGUNDA escolha da fase e encurta o despertar da jurada
// de cinco para quatro (src/oath.js). Estes testes cobrem o caminho nao-jurado,
// entao gastam a segunda escolha num consumivel: 'heal' nao tem despertar, logo
// nada e jurado e o limiar continua cinco.
function semJurar(g){assert(g.openUpgrade());g.offers=[SKILLS.find(s=>s.id==='heal')];assert(g.chooseSkill('heal'));}
const enemy=(id,x,z,hp=20)=>({id,x,z,hp,maxHp:hp,type:'slime',cooldown:100,hitFlash:0});
function hit(g,cells,damage=2){const flame={cells,damage,hit:new Set(),friendly:true};g.applyFlame(flame);return flame;}

test('every persistent skill awakens on pick five, once, and resets on the next stage',()=>{
  for(const skill of SKILLS.filter(s=>s.mastery)){
    const g=blank();pick(g,skill.id,1);semJurar(g);pick(g,skill.id,3);
    assert.equal(g.masteries.length,0,skill.id+' despertou antes da quinta sem ter sido jurada');
    pick(g,skill.id);assert.deepEqual(g.masteries,[skill.id]);
    assert.equal(g.drainEvents().filter(e=>e.type==='mastery').length,1);
    g.spawnBoss();g.defeatBoss();g.nextRound();assert.deepEqual(g.masteries,[]);assert.deepEqual(g.skillLevels,{});
    assert.equal(g.oath,null,'o juramento sobreviveu a troca de fase');
  }
});
test('a jurada desperta na quarta escolha, e so enquanto o juramento for honrado',()=>{
  // O premio do juramento e o atalho, e o atalho e premio de fidelidade
  // PERFEITA. Medido com semente fixa, 60 partidas: exigindo fidelidade, quem
  // honra desperta em 83% e quem nao honra em 7%; concedendo o atalho so por
  // ter jurado, quem honra continua em 83% e quem NAO honra sobe para 27%.
  // O portao nao custa nada a quem se compromete e custa tudo a quem nao se
  // compromete, que e exatamente o que se quer de um juramento.
  for(const skill of SKILLS.filter(s=>s.mastery)){
    const fiel=blank();pick(fiel,skill.id,2);
    assert.equal(fiel.oath,skill.id,skill.id+' nao virou juramento na segunda escolha');
    pick(fiel,skill.id,2);
    assert.deepEqual(fiel.masteries,[skill.id],skill.id+' nao despertou na quarta com o juramento honrado');
    // O despertar e o teto nos DOIS limiares: quatro aqui, cinco sem juramento.
    fiel.rollOffers();
    assert(!fiel.offers.some(o=>o.id===skill.id),skill.id+' voltou a ser oferecida depois de despertar no quarto');

    const traidor=blank();pick(traidor,skill.id,2);
    assert.equal(traidor.oath,skill.id);
    semJurar(traidor);
    assert(traidor.oathBroken,'trair o juramento nao foi registrado');
    pick(traidor,skill.id,2);
    assert.equal(traidor.masteries.length,0,skill.id+' manteve o atalho depois da traicao');
    pick(traidor,skill.id);
    assert.deepEqual(traidor.masteries,[skill.id],skill.id+' nao despertou na quinta depois de trair');
  }
});
test('healing remains consumable and cannot awaken',()=>{const g=blank();pick(g,'heal',5);assert.deepEqual(g.masteries,[]);});
test('drafts offer sixteen distinct skills across seeds, and keep one unfinished build option',()=>{
  const offered=new Set();for(let seed=0;seed<180;seed++){const g=blank();g.random=seededRandom(seed);g.player.hp=30;g.rollOffers();g.offers.forEach(s=>offered.add(s.id));assert.equal(new Set(g.offers.map(s=>s.id)).size,3);}
  assert.equal(offered.size,16);
  // A vaga reservada torna publico um mecanismo que ja existia calado: o
  // rollOffers ja tendia a reoferecer o que voce tinha, com peso pelo nivel, e
  // nada no jogo dizia isso. Para um jogador com um alvo em mente, declarar a
  // vaga leva o despertar de 67% para 81%.
  const g=blank();pick(g,'frost',2);assert.equal(g.oath,'frost');
  for(let i=0;i<20;i++){g.rollOffers();assert(g.offers.some(s=>s.id==='frost'),'a vaga jurada nao foi reservada');}
});
test('blue sun adds its mastery bonus exactly once and final-slot and first-bomb strategies work',()=>{
  const g=blank();pick(g,'power',5);assert.equal(g.player.damage,9);assert.equal(g.player.fire,'azure');pick(g,'power');assert.equal(g.player.damage,10);
  pick(g,'fuse',5);g.plantBomb();assert.equal(g.bombs[0].damage,13);
  pick(g,'capacity',5);g.bombs=[];for(let i=0;i<g.player.capacity;i++){g.player.x=i+1;g.plantBomb();}assert.equal(g.bombs.at(-1).damage,14);
});
test('chain hits unique neighbors once and cannot cross walls',()=>{
  const g=blank();pick(g,'chain',5);g.enemies=[enemy(100,4,3),enemy(101,5,3),enemy(102,6,3)];
  const f=hit(g,[{x:4,z:3}]);assert.deepEqual(g.enemies.map(e=>e.hp),[18,15,15]);g.applyFlame(f);assert.deepEqual(g.enemies.map(e=>e.hp),[18,15,15]);
  const h=blank();pick(h,'chain');h.enemies=[enemy(100,4,3),enemy(101,6,3)];h.grid[3][5]=1;hit(h,[{x:4,z:3}]);assert.equal(h.enemies[1].hp,20);
});
test('winter freeze halts movement, rewards a second impact, and resists on bosses',()=>{
  const g=blank();pick(g,'frost',5);g.enemies=[enemy(100,4,3)];hit(g,[{x:4,z:3}]);assert.equal(g.enemies[0].frozen,2);hit(g,[{x:4,z:3}]);assert.equal(g.enemies[0].hp,14);
  g.enemies[0].cooldown=0;g.tick(.2);assert.equal(g.enemies[0].x,4);g.spawnBoss();hit(g,[g.boss],1);assert.equal(g.boss.frozen,.5);
});
test('supernova diagonals stop at stone and comet impacts leave no damaging residue',()=>{
  const g=blank();pick(g,'shrapnel',5);g.grid[6][6]=1;const cells=g.blastCells({x:4,z:4,range:2});assert(cells.some(c=>c.x===5&&c.z===5));assert(!cells.some(c=>c.x===7&&c.z===7));
  pick(g,'afterglow',5);g.enemies=[enemy(100,3,1)];g.player.facing=[1,0];g.dash();assert.equal(g.enemies[0].hp,12);assert.equal(g.player.hp,100);g.tick(.1);assert.equal(g.enemies[0].hp,12);
});
test('shield regeneration and rites freeze during an upgrade or pause',()=>{
  const g=blank();pick(g,'ward',4);g.player.ward=0;g.openUpgrade();const timer=g.wardTimer;g.tick(20);assert.equal(g.wardTimer,timer);g.chooseSkill(g.offers[0].id);g.tick(6);assert.equal(g.player.ward,1);
  g.player.hp=70;g.player.invincible=0;g.hurt(20);assert.equal(g.player.hp,80);assert.equal(g.player.ward,0);
});
test('every shrapnel selection improves reach or damage, with a distinct fifth upgrade',()=>{
  const g=blank();let previous={reach:0,damage:g.player.damage};
  for(let level=1;level<=5;level++){
    // A curva completa de cinco degraus so existe sem juramento -- a jurada
    // fecha no quarto. Gastar a segunda escolha num consumivel mantem a antiga.
    if(level===2)semJurar(g);
    pick(g,'shrapnel');const cells=g.blastCells({x:6,z:6,range:2});
    const reach=Math.max(...cells.filter(c=>c.x-6===c.z-6).map(c=>Math.abs(c.x-6)));
    assert(reach>previous.reach||g.player.damage>previous.damage);
    previous={reach,damage:g.player.damage};
  }
  assert.equal(previous.reach,4);assert.equal(previous.damage,5);
});
test('alchemy speeds XP and discounts paid upgrades without double charging',()=>{
  const g=blank();pick(g,'alchemy',5);g.addPickup(1,1,'crystal',10);g.collect();assert.equal(g.level,2);assert.equal(g.xp,12);g.crystals=100;
  assert.equal(g.forgeCost,15);g.openUpgrade(true);assert.equal(g.crystals,85);assert(!g.openUpgrade(true));assert.equal(g.crystals,85);
});
test('all arenas are expanded by one tile per side and retain odd dimensions',()=>{
  assert.deepEqual([stageFor(1).width,stageFor(1).height],[17,15]);assert.deepEqual([stageFor(18).width,stageFor(18).height],[23,21]);
  for(let i=1;i<=36;i++){const s=stageFor(i);assert.equal(s.width%2,1);assert.equal(s.height%2,1);}
});
test('six boss rites open routes, leave boundaries intact and expose destructible anchors',()=>{
  for(const stage of [1,4,7,10,13,16]){
    const g=blank(stage);g.spawnBoss();g.grid[4][4]=1;g.grid[4][6]=1;g.grid[6][4]=1;
    assert(queueArenaRite(g));const w=g.warnings.at(-1);assert(w.duration>=2);assert(w.cells.every(c=>c.x>0&&c.z>0&&c.x<g.width-1&&c.z<g.height-1));
    g.pause();g.tick(20);assert.equal(w.timer,w.duration);g.pause();resolveArenaRite(g,w);
    assert(w.cells.every(c=>g.tile(c.x,c.z)===0));assert(g.anchors.length>0);assert(g.anchors.every(a=>g.walkable(a.x,a.z)));
    const anchor=g.anchors[0];hit(g,[anchor]);assert.equal(g.boss.stagger,4);assert(!g.anchors.includes(anchor));
    const hp=g.boss.hp;hit(g,[g.boss],2);assert.equal(g.boss.hp,hp-3);
    assert(g.grid[0].every(t=>t===1));assert.equal(g.tile(g.player.x,g.player.z),0);
  }
});
test('every skill has art, a numeric preview, and an English mastery translation',()=>{
  const g=blank();for(const s of SKILLS){assert.match(skillArt(s.id),/data-pixel-art/);assert(!skillPreview(g,s.id).includes('undefined'));assert(masteryProgress(g,s.id));if(s.mastery){assert(PROGRESSION_EN[s.mastery]);assert(PROGRESSION_EN[s.awakening]);}}
});
test('new damaging boss rites hit on impact once and their residue is safe',()=>{
  for(const stage of [4,13]){
    const g=blank(stage);g.spawnBoss();g.boss.cooldown=100;g.boss.attackCooldown=100;queueArenaRite(g);
    const w=g.warnings.at(-1),cell=w.cells.find(c=>g.tile(c.x,c.z)===0);
    g.player.x=cell.x;g.player.z=cell.z;g.tick(w.duration+.001);assert.equal(g.player.hp,82);
    g.player.invincible=0;g.tick(.1);assert.equal(g.player.hp,82);
  }
});
test('original refuge score covers eight bars with finite, bounded notes and no percussion',()=>{
  const notes=[],receiver={key:'refuge',note(...args){notes.push(args);},hat(){assert.fail('No refuge drums');}};
  for(let i=0;i<128;i++)Music.prototype.schedule.call(receiver,i,i*30/76,30/76);
  assert.equal(THEMES.refuge.melody.length,64);assert(notes.length>100);assert(notes.every(([midi,at,duration,volume])=>Number.isFinite(midi)&&Number.isFinite(at)&&duration>0&&volume<=.22));
});
