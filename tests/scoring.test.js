import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, seededRandom } from '../src/game.js';
import { captureRun, scoreReport, emptyMetrics } from '../shared/scoring.js';
const fresh=()=>{const g=new Game({random:seededRandom(4)});g.start();g.enemies=[];g.pickups=[];g.player.invincible=0;return g;};
test('published formula example totals 10609 and does not reward damage or bomb spam',()=>{
  const r={stage:3,victory:true,outcome:'slain',bosses:1,seconds:165,bossSeconds:45,hp:70,maxHp:100,crates:12,crystals:30,levels:3,masteries:[],metrics:{...emptyMetrics(),normalKills:20,miniKills:1,maxCombo:6,damageTaken:30}};
  assert.equal(scoreReport(r).total,10609);r.metrics.bombsPlaced=100000;r.metrics.damageDealt=100000;assert.equal(scoreReport(r).total,10609);
  r.victory=false;const loss=scoreReport(r);assert(loss.total>0);assert.equal(loss.parts.find(p=>p.id==='speed').points,0);
});
test('actual damage caps overkill and counts minichefs separately',()=>{
  const g=fresh();const e={id:700,type:'sentinel',hp:3,x:5,z:5};g.enemies=[e];g.damageEnemy(e,1000);
  assert.equal(g.stats.damageDealt,3);assert.equal(g.stats.miniKills,1);assert.equal(g.stats.normalKills,0);
  g.damageEnemy(e,1000);assert.equal(g.stats.damageDealt,3);
});
test('revive preserves actual lost HP, healing, blocks and flawless eligibility',()=>{
  const g=fresh();g.player.hp=12;g.player.revive=true;g.hurt(100);
  assert.equal(g.stats.damageTaken,12);assert.equal(g.stats.revives,1);assert.equal(g.stats.healed,50);
  g.player.invincible=0;g.player.ward=1;g.hurt(50);assert.equal(g.stats.blocked,1);assert.equal(g.stats.damageTaken,12);
  g.restoreHealth(500);assert.equal(g.stats.healed,100);
});
test('only successful bombs and dash actions count, and reset starts a clean report',()=>{
  const g=fresh();assert(g.plantBomb());assert(!g.plantBomb());assert.equal(g.stats.bombsPlaced,1);
  g.explode(g.bombs[0]);assert.equal(g.stats.bombsExploded,1);const saved=captureRun(g);g.start();assert.equal(g.stats.bombsPlaced,0);assert.equal(saved.metrics.bombsPlaced,1);
});
