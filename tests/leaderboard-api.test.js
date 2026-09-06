import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { onRequest } from '../server/leaderboard-api.js';
import { emptyMetrics } from '../shared/scoring.js';
import { promotionInput } from '../server/validation.js';
import { validateRun } from '../server/validation.js';

class TestD1 {
  constructor(){this.db=new DatabaseSync(':memory:');this.db.exec(readFileSync(new URL('../migrations/0001_global_ranking.sql',import.meta.url),'utf8'));}
  prepare(sql) {
    const owner=this;
    return { bind(...args) {
      const statement=owner.db.prepare(sql);
      return {
        first:async()=>statement.get(...args)||null,
        all:async()=>({results:statement.all(...args)}),
        run:async()=>({meta:{changes:Number(statement.run(...args).changes)}}),
      };
    } };
  }
  async batch(statements){this.db.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());this.db.exec('COMMIT');return results;}catch(e){this.db.exec('ROLLBACK');throw e;}}
}
function setup(extraEnv={}){const DB=new TestD1(),pending=[];return {DB,pending,async call(path,data,cookie='',origin='https://test.local'){
  const headers={Origin:origin,'CF-Connecting-IP':'192.0.2.2'};if(cookie)headers.Cookie=cookie;if(data!==undefined)headers['Content-Type']='application/json';
  const response=await onRequest({request:new Request('https://test.local/api/'+path,{method:data===undefined?'GET':'POST',headers,body:data===undefined?undefined:JSON.stringify(data)}),env:{DB,RANKING_SECRET:'public-test-only-secret',...extraEnv},waitUntil:p=>pending.push(p)});
  await Promise.all(pending.splice(0));return {status:response.status,body:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};
}};}
async function profile(api){const p=await api.call('profile',{});assert.equal(p.status,201);return p;}
const report=()=>({stage:1,victory:true,seconds:165,bossSeconds:45,bossEncountered:true,hp:70,maxHp:100,bosses:1,crystals:30,crates:12,levels:3,skills:{power:3},masteries:[],relics:[],materials:{scrap:4,cores:1},metrics:{...emptyMetrics(),normalKills:20,maxCombo:6,choices:3,damageDealt:100,bossDamage:18,damageTaken:30,hitsTaken:2,bombsPlaced:35,bombsExploded:34}});
test('awakenings require five actual selections of their skill',()=>{
  const r=report(),now=Date.now(),session={stage:1,started_at:now-180000,expires_at:now+1000};
  assert.throws(()=>validateRun({...r,masteries:['range']},session,now),/invalid_build/);
  assert.throws(()=>validateRun({...r,masteries:['power']},session,now),/invalid_build/);
  assert.equal(validateRun({...r,skills:{power:5},metrics:{...r.metrics,choices:5},masteries:['power']},session,now).masteries.length,1);
});
test('public submissions require a successful Turnstile token for this hostname and action',async t=>{
  const api=setup({TURNSTILE_SECRET:'test-server-secret'}),p=await profile(api),f=await finish(api,p);
  const values={id:f.id,name:'Tester',turnstileToken:'test-token'};
  let verification={success:false};
  t.mock.method(globalThis,'fetch',async(url,options)=>{
    assert.equal(url,'https://challenges.cloudflare.com/turnstile/v0/siteverify');
    assert.equal(JSON.parse(options.body).secret,'test-server-secret');
    return Response.json(verification);
  });
  assert.equal((await api.call('runs/publish',{id:f.id,name:'Tester'},p.cookie)).status,403);
  for(const result of [{success:false},{success:true,hostname:'other.example',action:'publish'},{success:true,hostname:'test.local',action:'login'}]){
    verification=result;assert.equal((await api.call('runs/publish',values,p.cookie)).status,403);
  }
  assert.equal((await api.call('leaderboard')).body.rows.length,0);
  verification={success:true,hostname:'test.local',action:'publish'};
  assert.equal((await api.call('runs/publish',values,p.cookie)).status,200);
  assert.equal((await api.call('profile/update',{name:'Changed'},p.cookie)).status,403);
});
async function finish(api,p){const id=crypto.randomUUID();assert.equal((await api.call('runs/start',{id,stage:1},p.cookie)).status,200);api.DB.db.prepare('UPDATE game_sessions SET started_at=? WHERE id=?').run(Date.now()-180000,id);const r=await api.call('runs/finish',{id,report:report()},p.cookie);assert.equal(r.status,200,JSON.stringify(r.body));return {id,row:r.body};}
test('a run is private until publishing, computes its score and is idempotent',async()=>{
  const a=setup(),p=await profile(a),f=await finish(a,p);
  assert.equal((await a.call('leaderboard')).body.rows.length,0);
  const again=await a.call('runs/finish',{id:f.id,report:{...report(),score:999999}},p.cookie);assert.equal(again.body.score,f.row.score);
  const published=await a.call('runs/publish',{id:f.id,name:'Diego',tagline:'Meu projeto',url:'https://github.com/example'},p.cookie);assert.equal(published.status,200);
  assert.equal((await a.call('runs/publish',{id:f.id,name:'Diego',tagline:'Meu projeto',url:'https://github.com/example'},p.cookie)).status,200);
  const board=(await a.call('leaderboard')).body;assert.equal(board.rows.length,1);assert.equal(board.rows[0].score,f.row.score);assert.equal(board.rows[0].name,'Diego');
  assert.equal(a.DB.db.prepare('SELECT COUNT(*) AS n FROM runs').get().n,1);
});
test('ownership, origin, unsupported URLs and impossible runs are rejected',async()=>{
  const a=setup(),p=await profile(a),q=await profile(a),f=await finish(a,p);
  assert.equal((await a.call('runs/publish',{id:f.id,name:'Other'},q.cookie)).status,404);
  assert.equal((await a.call('profile',{},'','https://evil.example')).status,403);
  assert.equal((await a.call('runs/publish',{id:f.id,name:'Diego',url:'javascript:alert(1)'},p.cookie)).status,400);
  const id=crypto.randomUUID();await a.call('runs/start',{id,stage:1},p.cookie);
  assert.equal((await a.call('runs/finish',{id,report:report()},p.cookie)).body.error,'invalid_duration');
  assert.throws(()=>promotionInput({name:'A',url:'https://trusted.example@evil.example'}));
});
test('outbound clicks deduplicate events, ignore owners and count approximate visitors',async()=>{
  const a=setup(),p=await profile(a),f=await finish(a,p);await a.call('runs/publish',{id:f.id,name:'Maker',url:'https://example.com'},p.cookie);
  const link=(await a.call('leaderboard')).body.rows[0].link;
  const click={linkId:link.id,eventId:crypto.randomUUID(),visitorId:crypto.randomUUID()};
  assert.equal((await a.call('links/click',click,p.cookie)).body.counted,false);
  assert.equal((await a.call('links/click',click)).body.counted,true);assert.equal((await a.call('links/click',click)).body.counted,false);
  await a.call('links/click',{...click,eventId:crypto.randomUUID()});
  const after=(await a.call('leaderboard')).body.rows[0].link;assert.equal(after.clicks,2);assert.equal(after.visitors,1);
});
test('each player keeps one best entry and link changes do not inherit analytics',async()=>{
  const a=setup(),p=await profile(a),f=await finish(a,p);await a.call('runs/publish',{id:f.id,name:'Maker',url:'https://example.com'},p.cookie);
  const second=await finish(a,p);await a.call('runs/publish',{id:second.id,name:'Maker',url:'https://another.example'},p.cookie);
  const board=(await a.call('leaderboard')).body;assert.equal(board.rows.length,1);assert.equal(board.rows[0].link.url,'https://another.example/');assert.equal(board.rows[0].link.clicks,0);
  await a.call('profile/update',{name:'Maker',tagline:'',url:''},p.cookie);assert.equal((await a.call('leaderboard')).body.rows[0].link,null);
});
