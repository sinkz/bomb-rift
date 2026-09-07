import { METRIC_KEYS } from '../shared/scoring.js';
import { aggregateExpedition, DIFFICULTIES, CAMPAIGN_STAGES } from '../shared/expedition.js';
import { SKILLS } from '../src/skills.js';
import { RELICS } from '../src/campaign.js';
export class ApiError extends Error { constructor(code, status = 400) { super(code); this.status = status; } }
export const fail = (code, status) => { throw new ApiError(code, status); };
export const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(value);
const integer = (n, max = 1e8) => Number.isSafeInteger(n) && n >= 0 && n <= max;
export function promotionInput(body) {
  if (!body || typeof body !== 'object') fail('invalid_profile');
  const clean = (value, max, required = false) => {
    if (typeof value !== 'string') fail('invalid_profile');
    const text = value.normalize('NFC').trim();
    if ([...text].length > max || required && !text || /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/.test(text)) fail('invalid_profile');
    return text;
  };
  const name = clean(body.name, 24, true), tagline = clean(body.tagline ?? '', 140);
  const raw = clean(body.url ?? '', 512); let url = '';
  if (raw) {
    let parsed; try { parsed = new URL(raw); } catch { fail('invalid_link'); }
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || !parsed.hostname.includes('.') || parsed.hostname.endsWith('.local') || parsed.hostname === 'localhost' || /^[\d.]+$/.test(parsed.hostname) || parsed.hostname.includes(':')) fail('invalid_link');
    parsed.hash = parsed.hash.slice(0, 160); url = parsed.href;
    if (url.length > 512) fail('invalid_link');
  }
  return { name, tagline, url };
}

export function validateRun(input, session, now = Date.now()) {
  if (input?.kind === 'campaign') {
    if (session.stage !== 1 || !Object.hasOwn(DIFFICULTIES,input.difficulty) || input.difficulty !== session.difficulty || !Array.isArray(input.stages) || !input.stages.length || input.stages.length > CAMPAIGN_STAGES) fail('invalid_campaign');
    const stages = input.stages.map((stage,i) => {
      if (stage.kind || stage.stage !== i+1 || i < input.stages.length-1 && !stage.victory) fail('invalid_campaign');
      return validateRun(stage,{...session,stage:i+1,campaign:true},now);
    });
    if (stages.at(-1).victory && stages.length !== CAMPAIGN_STAGES) fail('unfinished_campaign');
    const result = aggregateExpedition(stages, input.difficulty);
    if (result.seconds > (now-session.started_at)/1000+3 || result.seconds > 14400) fail('invalid_duration');
    return result;
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('invalid_run');
  const r = structuredClone(input), m = r.metrics;
  if (r.stage !== session.stage || typeof r.victory !== 'boolean' || typeof r.bossEncountered !== 'boolean') fail('invalid_run');
  for (const key of ['seconds','bossSeconds','hp','maxHp','bosses','crystals','crates','levels']) if (!integer(r[key])) fail('invalid_run');
  if (!m || METRIC_KEYS.some(k => !integer(m[k]))) fail('invalid_run');
  if (r.seconds > 7200 || r.seconds > (now - session.started_at) / 1000 + 3 || now > session.expires_at) fail('invalid_duration');
  if (!r.maxHp || r.hp > r.maxHp || r.bossSeconds > r.seconds || r.bosses > 1 || m.miniKills > 1 || m.revives > (session.campaign ? 10 : 1)) fail('invalid_run');
  if (r.victory && (r.bosses !== 1 || !r.bossEncountered || r.seconds < 120 || r.hp === 0)) fail('invalid_run');
  if (!r.victory && (r.hp !== 0 || r.bosses !== 0)) fail('invalid_run');
  if (!r.bossEncountered && (r.bossSeconds || m.bossDamage) || r.bossEncountered && r.seconds - r.bossSeconds < 119) fail('invalid_run');
  if (m.bossDamage > m.damageDealt || m.chainExplosions > m.bombsExploded || m.bombsExploded > m.bombsPlaced || m.maxCombo > m.normalKills + m.miniKills) fail('invalid_run');
  if (m.normalKills + m.miniKills > 20 + r.seconds * 2 || m.bombsPlaced > 30 + r.seconds * 60 || m.dashes > 3 + r.seconds * 60) fail('implausible_run');
  if (m.revives && !m.damageTaken || m.hitsTaken && !m.damageTaken || m.damageTaken && !m.hitsTaken) fail('invalid_run');
  if (!r.skills || typeof r.skills !== 'object' || Array.isArray(r.skills) || Object.entries(r.skills).some(([id,n]) => !SKILLS.some(s => s.id === id) || !integer(n, 500))) fail('invalid_build');
  if (Object.values(r.skills).reduce((a,b) => a+b,0) !== m.choices) fail('invalid_build');
  if (!Array.isArray(r.masteries) || r.masteries.length > SKILLS.length || new Set(r.masteries).size !== r.masteries.length || r.masteries.some(id => !SKILLS.some(s => s.id === id && s.mastery) || !(r.skills[id] >= 5))) fail('invalid_build');
  if (!Array.isArray(r.relics) || new Set(r.relics).size !== r.relics.length || r.relics.some(id => !RELICS.some(x => x.id === id))) fail('invalid_build');
  if (!r.materials || !integer(r.materials.scrap) || !integer(r.materials.cores)) fail('invalid_run');
  // Only approved fields cross the persistence boundary.
  return Object.fromEntries(['stage','victory','seconds','bossSeconds','bossEncountered','hp','maxHp','bosses','crystals','crates','levels','skills','masteries','relics','materials'].map(k=>[k,r[k]]).concat([['metrics',Object.fromEntries(METRIC_KEYS.map(k=>[k,m[k]]))]]));
}
