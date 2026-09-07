export class RankingError extends Error { constructor(code) { super(code); this.code=code; } }
export class GlobalRanking {
  constructor() { this.current=null; this.rows=[]; this.config=null; this.profile=null; this.profilePromise=null; this.pending=new Map(); }
  async request(path, body) {
    const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),12000);
    try {
      const r=await fetch('/api/'+path,{method:body===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:controller.signal});
      if(!r.headers.get('content-type')?.includes('application/json'))throw new RankingError('ranking_unavailable');
      const data=await r.json();if(!r.ok)throw new RankingError(data.error||'ranking_unavailable');return data;
    } catch(e) { throw e instanceof RankingError ? e : new RankingError('ranking_unavailable'); } finally { clearTimeout(timer); }
  }
  async ensureProfile() {
    if(!this.profilePromise)this.profilePromise=this.request('profile',{}).then(async()=>{this.profile=await this.request('me');return this.profile;}).catch(e=>{this.profilePromise=null;throw e;});
    return this.profilePromise;
  }
  begin(stage, difficulty = 'easy') {
    const session={id:crypto.randomUUID(),stage,difficulty};this.current=session;
    session.promise=this.ensureProfile().then(()=>this.request('runs/start',{id:session.id,stage,difficulty})).catch(()=>null);
  }
  finish(row) {
    if(!row?.report||!this.current)return;
    const session=this.current;
    row.global={id:session.id,status:'saving'};
    const save=()=>session.promise.then(async valid=>{
      if(!valid)throw new RankingError('offline_run');
      const result=await this.request('runs/finish',{id:session.id,report:row.report});
      row.global.status='ready';row.global.saved=result;return result;
    }).catch(e=>{row.global.status='local';row.global.error=e.code;return null;});
    row.global.retry=()=>{row.global.status='saving';row.global.promise=save();return row.global.promise;};
    row.global.promise=save();
  }
  async publish(row, values) {
    const saved=await row.global?.promise;if(!saved)throw new RankingError(row.global?.error||'offline_run');
    const response=await this.request('runs/publish',{id:saved.id,...values});
    row.global.status='published';this.profile={...this.profile,...values};return response;
  }
  async leaderboard(stage=0,page=0) {
    const data=await this.request(`leaderboard?stage=${stage}&page=${page}`); if(!stage&&!page)this.rows=data.rows;return data;
  }
  async init() { try { this.config=await this.request('config'); } catch { this.config={available:false}; } return this.config; }
  click(linkId) {
    let visitorId;try {visitorId=localStorage.getItem('bomb-rift-visitor');if(!/^[a-f0-9-]{36}$/.test(visitorId||'')){visitorId=crypto.randomUUID();localStorage.setItem('bomb-rift-visitor',visitorId);}}catch{visitorId=crypto.randomUUID();}
    const body=JSON.stringify({linkId,eventId:crypto.randomUUID(),visitorId});
    // Keep the actual href usable even when analytics fail or are blocked.
    fetch('/api/links/click',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body,keepalive:true}).catch(()=>{});
  }
}
