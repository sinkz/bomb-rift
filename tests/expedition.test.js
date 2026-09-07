import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, seededRandom } from '../src/game.js';
import { LocalRanking } from '../src/ranking.js';
import { normalizeMeta } from '../src/legacy.js';
import { scoreReport } from '../shared/scoring.js';
import { validateRun } from '../server/validation.js';
const create = meta => new Game({campaignMode:true,random:seededRandom(12),meta});
function win(g){g.elapsed=120;g.totalTime=120;g.spawnBoss();g.totalTime=150;g.damageEnemy(g.boss,1e5);assert.equal(g.phase,'intermission');g.claimResult();}
test('attempt accumulates stages once, rejects farming/jumps and only ranks on a terminal result',()=>{
  const g=create({health:3,shards:90,unlockedStage:14}),rank=new LocalRanking();
  assert.equal(g.meta.unlockedStage,1);assert.equal(g.meta.bestStage,13);
  assert.equal(g.start(2),false);assert.equal(g.start(1),true);win(g);
  assert.equal(g.claimResult(),false);assert.equal(g.expedition.stages.length,1);assert.equal(rank.record(g),null);
  const first=g.expeditionScore;g.returnToMap();assert.equal(g.start(1),false);assert.equal(g.start(3),false);assert.equal(g.start(2),true);
  g.totalTime=12;g.die();g.claimResult();
  const row=rank.record(g);assert.equal(row.report.stages.length,2);assert.equal(row.seconds,162);assert.ok(row.score>=first);assert.equal(rank.record(g),null);
  assert.equal(g.meta.unlockedStage,1);assert.equal(g.meta.health,3);assert.ok(g.meta.shards>=90);assert.equal(g.lives,0);
  g.returnToMap();assert.equal(g.start(1),true);assert.equal(g.expeditionScore,0);assert.equal(g.lives,1);assert.equal(g.skillLevels.power,undefined);
});
test('extra lives have real cost, a cap, preserve the stage and do not replace phoenix',()=>{
  const g=create();g.start();g.crystals=500;g.skillLevels.power=2;
  assert.equal(g.buyLife(),true);assert.equal(g.crystals,460);assert.equal(g.buyLife(),true);assert.equal(g.crystals,395);
  assert.equal(g.buyLife(),false);assert.equal(g.lives,3);
  g.player.revive=true;g.player.invincible=0;g.hurt(10000);assert.equal(g.lives,3);assert.equal(g.phase,'playing');
  g.player.invincible=0;g.hurt(10000);assert.equal(g.lives,2);assert.equal(g.player.hp,g.player.maxHp);assert.equal(g.skillLevels.power,2);assert.equal(g.player.invincible,4);
  assert.equal(g.buyLife(),true);assert.equal(g.crystals,305);g.player.invincible=0;g.hurt(10000);assert.equal(g.buyLife(),false);
  g.player.invincible=0;g.hurt(10000);g.player.invincible=0;g.hurt(10000);assert.equal(g.phase,'dead');g.claimResult();assert.equal(g.lives,0);
});
test('all eighteen wins unlock the next difficulty, world rewards grant lives, hard is materially stronger',()=>{
  const g=create();assert.equal(g.setDifficulty('hard'),false);g.start();
  for(let stage=1;stage<=18;stage++){if(stage>1)assert.equal(g.start(stage),true);win(g);if(stage===3)assert.equal(g.lives,2);if(stage<18)assert.equal(g.expedition.ended,false);}
  assert.equal(g.expedition.ended,true);assert.equal(g.expedition.report.bosses,18);assert.deepEqual(g.meta.difficultyClears,['easy']);assert.equal(g.meta.unlockedStage,1);
  const now=Date.now(),session={stage:1,difficulty:'easy',started_at:now-3000000,expires_at:now+1000};
  assert.equal(validateRun(g.expedition.report,session,now).stages.length,18);
  const easy=g.expedition.report,base=easy.stages.reduce((n,s)=>n+scoreReport(s).total,0);assert.equal(scoreReport(easy).total,base);
  g.returnToMap();assert.equal(g.setDifficulty('medium'),true);g.start();assert.equal(g.setDifficulty('easy'),false);
  for(let stage=1;stage<=18;stage++){if(stage>1)g.start(stage);win(g);}
  g.returnToMap();assert.equal(g.setDifficulty('hard'),true);g.start();assert.equal(g.challenge.hp,2.3);assert.equal(g.challenge.damage,1.85);
  const easyGame=create();easyGame.start();assert.ok(g.enemies[0].hp>easyGame.enemies[0].hp);assert.ok(g.spawnInterval<easyGame.spawnInterval*.6);assert.ok(g.intelligence>easyGame.intelligence);
  assert.equal(scoreReport({...easy,difficulty:'hard'}).total,Math.floor(base*2.25));
});
test('API rejects partial wins, skipped stages, altered difficulty and forged aggregate totals',()=>{
  const g=create();g.start();win(g);g.start(2);g.totalTime=10;g.die();g.claimResult();
  const now=Date.now(),session={stage:1,difficulty:'easy',started_at:now-200000,expires_at:now+1000},r=g.expedition.report;
  assert.throws(()=>validateRun({...r,stages:[r.stages[0]]},session,now),/unfinished_campaign/);
  assert.throws(()=>validateRun({...r,stages:[r.stages[1]]},session,now),/invalid_campaign/);
  assert.throws(()=>validateRun({...r,difficulty:'hard'},session,now),/invalid_campaign/);
  const rebuilt=validateRun({...r,bosses:99999,seconds:0,metrics:{normalKills:99999}},session,now);
  assert.equal(rebuilt.bosses,1);assert.equal(rebuilt.seconds,160);assert.equal(rebuilt.metrics.normalKills,0);
});
test('saved difficulty unlocks require a contiguous sequence and survive a new attempt',()=>{
  assert.deepEqual(normalizeMeta({difficultyClears:['hard'],difficulty:'hard'}).difficultyClears,[]);
  const g=create({difficulty:'hard',difficultyClears:['easy','medium'],health:5});assert.equal(g.difficulty,'hard');assert.equal(g.meta.health,5);
  assert.equal(create({difficulty:'invalid'}).difficulty,'easy');
});
