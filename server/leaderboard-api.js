import { SCORE_VERSION, SEASON, scoreReport } from '../shared/scoring.js';
import { ApiError, fail, promotionInput, validateRun, uuid } from './validation.js';
const now = () => Date.now();
const enc = new TextEncoder();
const hash = async value => [...new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join('');
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff', ...headers } });
const stmt = (db, sql, ...args) => db.prepare(sql).bind(...args);
const first = (db, sql, ...args) => stmt(db,sql,...args).first();
const all = async (db, sql, ...args) => (await stmt(db,sql,...args).all()).results;
const publicRun = row => ({ id:row.id, stage:row.stage, score:row.score, victory:!!row.victory, seconds:row.seconds, date:row.finished_at, published:!!row.published, report:JSON.parse(row.data), breakdown:JSON.parse(row.breakdown) });

async function body(request) {
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) fail('json_required',415);
  if (Number(request.headers.get('Content-Length')) > 16384) fail('payload_too_large',413);
  const reader=request.body?.getReader(); if (!reader) fail('invalid_json');
  const decoder=new TextDecoder(); let text='',size=0;
  while (true) { const {done,value}=await reader.read(); if(done)break; size+=value.length; if(size>16384){await reader.cancel();fail('payload_too_large',413);} text+=decoder.decode(value,{stream:true}); }
  try { const input=JSON.parse(text+decoder.decode());if(!input||typeof input!=='object'||Array.isArray(input))fail('invalid_json');return input; } catch { fail('invalid_json'); }
}
async function owner(request, db, required=true) {
  const cookie=request.headers.get('Cookie')?.match(/(?:^|;\s*)br_profile=([a-f0-9.-]+)/)?.[1];
  if (cookie) {
    const [id,secret]=cookie.split('.');
    if(uuid(id)&&secret?.length===64){const row=await first(db,'SELECT * FROM profiles WHERE id=?',id);if(row && row.token_hash===await hash(secret)){if(row.hidden)fail('profile_hidden',403);return row;}}
  }
  if(required)fail('profile_required',401); return null;
}
async function limit(db, key, max, span=60) {
  const time=now(), id=key+':'+Math.floor(time/(span*1000));
  const row=await first(db,'INSERT INTO rate_limits(id,count,expires_at) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1 RETURNING count',id,time+span*1000);
  if(row.count>max)fail('rate_limited',429);
}
async function verifyTurnstile(request, env, token) {
  if(!env.TURNSTILE_SECRET)return;
  if(typeof token!=='string'||token.length>2048)fail('verification_required',403);
  const response=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({secret:env.TURNSTILE_SECRET,response:token})});
  const result=await response.json();
  if(!result.success || result.hostname!==new URL(request.url).hostname || result.action!=='publish')fail('verification_failed',403);
}
function bestStatement(db, row, stage) {
  return stmt(db,`INSERT INTO leaderboard_best(profile_id,season,stage,run_id,score,victory,minis,seconds,finished_at)
    VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(profile_id,season,stage) DO UPDATE SET
    run_id=excluded.run_id,score=excluded.score,victory=excluded.victory,minis=excluded.minis,seconds=excluded.seconds,finished_at=excluded.finished_at
    WHERE (excluded.score,excluded.victory,excluded.minis,-excluded.seconds,-excluded.finished_at) >
    (leaderboard_best.score,leaderboard_best.victory,leaderboard_best.minis,-leaderboard_best.seconds,-leaderboard_best.finished_at)`,row.profile_id,row.season,stage,row.id,row.score,row.victory,row.minis,row.seconds,row.finished_at);
}

export async function onRequest(context) {
  const {request,env}=context, db=env.DB;
  try {
    const url=new URL(request.url), route=url.pathname.replace(/\/$/,'');
    if(request.method==='GET' && route==='/api/config')return json({available:!!db&&!!env.RANKING_SECRET,season:SEASON,version:SCORE_VERSION,mode:'casual-beta',turnstileSiteKey:env.TURNSTILE_SITE_KEY||null});
    if(!db || !env.RANKING_SECRET)fail('ranking_unavailable',503);
    if(!['GET','POST'].includes(request.method))fail('method_not_allowed',405);
    if(request.method==='POST' && request.headers.get('Origin')!==url.origin)fail('origin_forbidden',403);
    const ipHash=async () => hash(env.RANKING_SECRET+':'+(request.headers.get('CF-Connecting-IP')||'local'));

    if(request.method==='GET' && route==='/api/leaderboard') {
      const stage=Number(url.searchParams.get('stage')||0), page=Number(url.searchParams.get('page')||0);
      if(!Number.isInteger(stage)||stage<0||stage>10000||!Number.isInteger(page)||page<0||page>4)fail('invalid_filter');
      const key=new Request(url.origin+`/api/leaderboard?stage=${stage}&page=${page}&season=${SEASON}`);
      const cache=globalThis.caches?.default, cached=await cache?.match(key);if(cached)return cached;
      const rows=await all(db,`SELECT r.*,p.name,p.tagline,p.id AS player_id,l.id AS link_id,l.url,
        COALESCE((SELECT SUM(clicks) FROM click_daily WHERE link_id=l.id),0) AS clicks,
        COALESCE((SELECT SUM(visitors) FROM click_daily WHERE link_id=l.id),0) AS visitors
        FROM leaderboard_best b JOIN runs r ON r.id=b.run_id JOIN profiles p ON p.id=b.profile_id
        LEFT JOIN promotion_links l ON l.id=p.link_id AND l.hidden=0
        WHERE b.season=? AND b.stage=? AND r.published=1 AND r.hidden=0 AND p.hidden=0
        ORDER BY b.score DESC,b.victory DESC,b.minis DESC,b.seconds,b.finished_at,b.run_id LIMIT 21 OFFSET ?`,SEASON,stage,page*20);
      const response=json({season:SEASON,mode:'casual-beta',page,hasMore:rows.length>20,rows:rows.slice(0,20).map((r,i)=>({...publicRun(r),position:page*20+i+1,playerId:r.player_id,name:r.name,tagline:r.tagline,link:r.url?{id:r.link_id,url:r.url,clicks:r.clicks,visitors:r.visitors}:null}))},200,{'Cache-Control':'public, max-age=30'});
      if(cache)context.waitUntil(cache.put(key,response.clone())); return response;
    }
    if(request.method==='GET' && route==='/api/me') {
      const p=await owner(request,db);
      const link=p.link_id?await first(db,'SELECT url FROM promotion_links WHERE id=? AND hidden=0',p.link_id):null;
      const runs=await all(db,'SELECT * FROM runs WHERE profile_id=? ORDER BY finished_at DESC LIMIT 10',p.id);
      return json({id:p.id,name:p.name,tagline:p.tagline,url:link?.url||'',runs:runs.map(publicRun)});
    }
    if(request.method!=='POST')fail('not_found',404);
    const input=await body(request);
    await limit(db,'ip:'+await ipHash(),120);

    if(route==='/api/profile') {
      const p=await owner(request,db,false);if(p)return json({id:p.id,name:p.name});
      await limit(db,'signup:'+await ipHash(),12,3600);
      const id=crypto.randomUUID(), secret=[...crypto.getRandomValues(new Uint8Array(32))].map(x=>x.toString(16).padStart(2,'0')).join('');
      await stmt(db,'INSERT INTO profiles(id,token_hash,created_at) VALUES(?,?,?)',id,await hash(secret),now()).run();
      const secure=url.protocol==='https:'?'; Secure':'';
      return json({id,name:''},201,{'Set-Cookie':`br_profile=${id}.${secret}; HttpOnly; SameSite=Strict; Path=/; Max-Age=31536000${secure}`});
    }
    if(route==='/api/links/click') {
      if(!uuid(input.linkId)||!uuid(input.eventId)||!uuid(input.visitorId))fail('invalid_click');
      const link=await first(db,`SELECT l.* FROM promotion_links l JOIN profiles p ON p.link_id=l.id WHERE l.id=? AND l.hidden=0 AND p.hidden=0 AND EXISTS(SELECT 1 FROM runs WHERE profile_id=p.id AND published=1 AND hidden=0)`,input.linkId);
      if(!link)fail('not_found',404);
      const p=await owner(request,db,false);if(p?.id===link.profile_id)return json({counted:false});
      await limit(db,'click:'+await ipHash()+':'+link.id,30,3600);
      const day=new Date().toISOString().slice(0,10),visitor=await hash(env.RANKING_SECRET+':'+day+':'+input.visitorId);
      const result=await stmt(db,'INSERT OR IGNORE INTO click_events(id,link_id,visitor,day,created_at) VALUES(?,?,?,?,?)',input.eventId,link.id,visitor,day,now()).run();
      return json({counted:result.meta.changes>0});
    }
    if(route==='/api/reports') {
      if(!uuid(input.profileId)||!['spam','unsafe-link','offensive','suspicious-score'].includes(input.reason))fail('invalid_report');
      await limit(db,'report:'+await ipHash(),6,3600);
      if(!await first(db,'SELECT id FROM profiles WHERE id=?',input.profileId))fail('not_found',404);
      await stmt(db,'INSERT INTO reports(id,profile_id,reporter_hash,reason,created_at) VALUES(?,?,?,?,?)',crypto.randomUUID(),input.profileId,await ipHash(),input.reason,now()).run();return json({received:true});
    }
    const p=await owner(request,db);
    if(route==='/api/profile/update') {
      await verifyTurnstile(request,env,input.turnstileToken);
      const promo=promotionInput(input);let linkId=null;
      if(promo.url){const id=crypto.randomUUID();await stmt(db,'INSERT OR IGNORE INTO promotion_links(id,profile_id,url,created_at) VALUES(?,?,?,?)',id,p.id,promo.url,now()).run();const link=await first(db,'SELECT id,hidden FROM promotion_links WHERE profile_id=? AND url=?',p.id,promo.url);if(link.hidden)fail('link_hidden',403);linkId=link.id;}
      await stmt(db,'UPDATE profiles SET name=?,tagline=?,link_id=? WHERE id=?',promo.name,promo.tagline,linkId,p.id).run();return json({saved:true});
    }
    if(route==='/api/runs/start') {
      if(!Number.isInteger(input.stage)||input.stage<1||input.stage>10000||!uuid(input.id))fail('invalid_stage');
      await limit(db,'start:'+p.id,15,3600);
      context.waitUntil(db.batch([
        stmt(db,'DELETE FROM rate_limits WHERE id IN (SELECT id FROM rate_limits WHERE expires_at<? LIMIT 100)',now()-3600000),
        stmt(db,'DELETE FROM click_events WHERE id IN (SELECT id FROM click_events WHERE created_at<? LIMIT 100)',now()-172800000),
      ]).catch(()=>{}));
      const time=now();await stmt(db,'INSERT OR IGNORE INTO game_sessions(id,profile_id,stage,version,started_at,expires_at) VALUES(?,?,?,?,?,?)',input.id,p.id,input.stage,SCORE_VERSION,time,time+7800000).run();
      const session=await first(db,'SELECT * FROM game_sessions WHERE id=? AND profile_id=?',input.id,p.id);
      if(!session||session.stage!==input.stage)fail('session_conflict',409);
      return json({id:session.id,expiresAt:session.expires_at,version:session.version});
    }
    if(route==='/api/runs/finish') {
      if(!uuid(input.id))fail('invalid_session');
      const session=await first(db,'SELECT * FROM game_sessions WHERE id=? AND profile_id=?',input.id,p.id);if(!session)fail('not_found',404);
      const existing=await first(db,'SELECT * FROM runs WHERE id=?',input.id);if(existing)return json(publicRun(existing));
      if(session.version!==SCORE_VERSION)fail('outdated_session',409);
      const report=validateRun(input.report,session), breakdown=scoreReport(report);
      await db.batch([
        stmt(db,'INSERT OR IGNORE INTO runs(id,profile_id,season,version,stage,score,victory,minis,seconds,finished_at,data,breakdown) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',input.id,p.id,SEASON,SCORE_VERSION,report.stage,breakdown.total,Number(report.victory),report.metrics.miniKills,report.seconds,now(),JSON.stringify(report),JSON.stringify(breakdown)),
        stmt(db,"UPDATE game_sessions SET state='finished' WHERE id=? AND profile_id=?",input.id,p.id),
      ]);return json(publicRun(await first(db,'SELECT * FROM runs WHERE id=?',input.id)));
    }
    if(route==='/api/runs/publish') {
      if(!uuid(input.id))fail('invalid_session');
      const row=await first(db,'SELECT * FROM runs WHERE id=? AND profile_id=? AND hidden=0',input.id,p.id);if(!row)fail('not_found',404);
      const promo=promotionInput(input);await verifyTurnstile(request,env,input.turnstileToken);
      await limit(db,'publish:'+p.id,30,3600);
      let linkId=null;
      if(promo.url){await stmt(db,'INSERT OR IGNORE INTO promotion_links(id,profile_id,url,created_at) VALUES(?,?,?,?)',crypto.randomUUID(),p.id,promo.url,now()).run();const link=await first(db,'SELECT id,hidden FROM promotion_links WHERE profile_id=? AND url=?',p.id,promo.url);if(link.hidden)fail('link_hidden',403);linkId=link.id;}
      await db.batch([
        stmt(db,'UPDATE profiles SET name=?,tagline=?,link_id=? WHERE id=?',promo.name,promo.tagline,linkId,p.id),
        stmt(db,'UPDATE runs SET published=1 WHERE id=? AND profile_id=?',row.id,p.id),
        bestStatement(db,row,0),bestStatement(db,row,row.stage),
      ]);
      if(globalThis.caches?.default)context.waitUntil(Promise.all([0,row.stage].flatMap(stage=>Array.from({length:5},(_,page)=>caches.default.delete(new Request(url.origin+`/api/leaderboard?stage=${stage}&page=${page}&season=${SEASON}`))))));
      return json({published:true,score:row.score,id:row.id});
    }
    fail('not_found',404);
  } catch(error) {
    if(error instanceof ApiError)return json({error:error.message},error.status,error.status===429?{'Retry-After':'60'}:{});
    console.error('Ranking request failed:',error.name);return json({error:'ranking_unavailable'},503);
  }
}
