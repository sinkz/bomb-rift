export const RESOURCES = {
  shards: { name: 'Essências', color: '#b4dfb0', tip: 'Abates, minichefes e vitórias. Usadas nos talentos.' },
  scrap: { name: 'Sucata', color: '#e6b17f', tip: 'Cada duas caixas ou três abates deixam sucata. Usada na oficina.' },
  cores: { name: 'Núcleos', color: '#a6cfff', tip: 'Guardião vencido: +1. Minichefes também deixam um núcleo para coletar.' },
};
export const TALENTS = [
  { id: 'power', name: 'Chama ancestral', branch: 'demolition', art: 'power', desc: '+1 de dano inicial por nível.', max: 5, rank: 1, cost: n => ({ shards: 12 + n * 12 }) },
  { id: 'reach', name: 'Geometria do caos', branch: 'demolition', art: 'range', desc: '+1 de alcance inicial por nível.', max: 2, rank: 2, requires: ['power', 1], cost: n => ({ shards: 16 + n * 12, scrap: 10 + n * 8 }) },
  { id: 'stock', name: 'Arsenal de bolso', branch: 'demolition', art: 'capacity', desc: '+1 bomba simultânea por nível.', max: 2, rank: 3, requires: ['reach', 1], cost: n => ({ shards: 22 + n * 14, cores: 1 + n }) },
  { id: 'health', name: 'Raízes da vida', branch: 'survival', art: 'health', desc: '+10 de vida inicial por nível.', max: 10, rank: 1, cost: n => ({ shards: 5 + n * 5 }) },
  { id: 'armor', name: 'Pele de basalto', branch: 'survival', art: 'health', desc: '+3% de redução de dano por nível.', max: 4, rank: 2, requires: ['health', 1], cost: n => ({ shards: 10 + n * 8, scrap: 8 + n * 5 }) },
  { id: 'siphon', name: 'Pacto de retorno', branch: 'survival', art: 'vampire', desc: 'Recupera +1 de vida por abate por nível.', max: 3, rank: 3, requires: ['armor', 2], cost: n => ({ shards: 18 + n * 12, cores: 1 }) },
  { id: 'stride', name: 'Passos do andarilho', branch: 'mobility', art: 'speed', desc: 'Intervalo entre passos 4% menor por nível.', max: 4, rank: 1, cost: n => ({ shards: 6 + n * 6, scrap: 4 + n * 3 }) },
  { id: 'dash', name: 'Fio do horizonte', branch: 'mobility', art: 'dash', desc: 'Recarga da esquiva 8% menor por nível.', max: 4, rank: 2, requires: ['stride', 1], cost: n => ({ shards: 10 + n * 8, scrap: 8 + n * 4 }) },
  { id: 'magnet', name: 'Órbita da fortuna', branch: 'mobility', art: 'magnet', desc: '+1 casa de atração por nível. Paredes continuam bloqueando a coleta.', max: 2, rank: 3, requires: ['dash', 1], cost: n => ({ shards: 16 + n * 12, cores: 1 }) },
];
export const BRANCHES = [
  { id: 'demolition', name: 'Demolição', color: '#ffb181', motto: 'Abra caminho com poder.' },
  { id: 'survival', name: 'Sobrevivência', color: '#ed99b5', motto: 'Uma faísca difícil de apagar.' },
  { id: 'mobility', name: 'Mobilidade', color: '#99decb', motto: 'Esteja sempre um passo à frente.' },
];
export const GEAR = [
  { id: 'pulse', slot: 'core', name: 'Coração de pulso', art: 'reactor', color: '#ffb577', desc: 'A confiável bomba de Faísca. Equilibrada e pronta para a estrada.', rank: 1, cost: {} },
  { id: 'azure-core', slot: 'core', name: 'Reator azul', art: 'reactor', color: '#86d9ff', desc: '+1 dano, chamas azuis e +0,3s de pavio para preparar a fuga.', rank: 2, cost: { shards: 10, scrap: 14, cores: 1 } },
  { id: 'twin-core', slot: 'core', name: 'Câmara gêmea', art: 'twin', color: '#d4afff', desc: '+1 bomba simultânea e +1 alcance. Cerque a horda por dois lados.', rank: 3, cost: { shards: 16, scrap: 22, cores: 2 } },
  { id: 'traveler', slot: 'boots', name: 'Botas de estrada', art: 'boots', color: '#d8b58b', desc: 'Seu primeiro par. Leves, gastas e cheias de histórias.', rank: 1, cost: {} },
  { id: 'wind-boots', slot: 'boots', name: 'Botas do vendaval', art: 'wing', color: '#90e4c7', desc: 'Passos 10% mais rápidos e esquiva com recarga 15% menor.', rank: 1, cost: { shards: 6, scrap: 10 } },
  { id: 'bastion-boots', slot: 'boots', name: 'Passos do bastião', art: 'boots', color: '#eab4a3', desc: '+15 de vida máxima e 8% de redução de dano.', rank: 2, cost: { shards: 10, scrap: 14 } },
  { id: 'compass', slot: 'charm', name: 'Bússola partida', art: 'charm', color: '#d6c299', desc: 'Nem sempre aponta o norte. Sempre aponta para uma aventura.', rank: 1, cost: {} },
  { id: 'salvager', slot: 'charm', name: 'Ímã do sucateiro', art: 'salvage', color: '#e6ba82', desc: '+1 casa de coleta e +25% de sucata ao encerrar a fase (arredondado para baixo).', rank: 1, cost: { shards: 5, scrap: 8 } },
  { id: 'guardian-charm', slot: 'charm', name: 'Selo da alvorada', art: 'charm', color: '#bbe2e8', desc: 'Comece cada fase com um bloqueio gratuito e +1 de cura por abate.', rank: 3, cost: { shards: 15, scrap: 16, cores: 1 } },
];
export const SLOTS = { core: 'NÚCLEO DA BOMBA', boots: 'BOTAS', charm: 'TALISMÃ' };
export const OUTFITS = [
  { id: 'ember', name: 'Faísca original', color: '#f68b3d', light: '#ffbf7b', cost: {} },
  { id: 'jade', name: 'Jade errante', color: '#55af88', light: '#b4edab', cost: { scrap: 5 } },
  { id: 'polar', name: 'Aurora polar', color: '#5baccf', light: '#beefff', cost: { scrap: 5 } },
  { id: 'rose', name: 'Rosa do caos', color: '#d875a1', light: '#ffc0d4', cost: { scrap: 5 } },
  { id: 'royal', name: 'Herdeiro da fenda', color: '#986ace', light: '#d6b0ff', cost: { scrap: 8, cores: 1 } },
];
export const CONTRACTS = [
  { id: 'first-guardian', name: 'O sino caiu', art: 'power', desc: 'Vença seu primeiro guardião.', stat: 'guardians', goal: 1, reward: { scrap: 6, cores: 1 } },
  { id: 'demolisher', name: 'Nada fica de pé', art: 'range', desc: 'Destrua 30 caixas ao longo das expedições.', stat: 'crates', goal: 30, reward: { scrap: 12, shards: 6 } },
  { id: 'hunter', name: 'Caçador de fendas', art: 'vampire', desc: 'Derrote 30 monstros ao longo das expedições.', stat: 'kills', goal: 30, reward: { scrap: 8, shards: 8 } },
  { id: 'cartographer', name: 'Além da caldeira', art: 'dash', desc: 'Conquiste seis fases diferentes.', stat: 'stages', goal: 6, reward: { cores: 2, shards: 15 } },
];
const safe = (n, max = 1e9) => Number.isFinite(n) ? Math.max(0, Math.min(max, Math.floor(n))) : 0;
export const talentLevel = (meta, id) => ['health', 'power'].includes(id) ? meta[id] || 0 : meta.talents?.[id] || 0;
export function rankInfo(xp = 0) {
  let level = 1, current = safe(xp), next = 70;
  while (current >= next && level < 50) { current -= next; level++; next = 70 + (level - 1) * 30; }
  return { level, current, next };
}
export function normalizeMeta(value = {}) {
  const v = value && typeof value === 'object' ? value : {}, meta = {};
  for (const id of ['shards', 'scrap', 'cores', 'bestRound', 'bestKills', 'runs', 'legacyXp']) meta[id] = safe(v[id]);
  meta.health = safe(v.health, 10); meta.power = safe(v.power, 5); meta.unlockedStage = Math.max(1, safe(v.unlockedStage, 100000));
  meta.bestStage = Math.max(safe(v.bestStage), meta.unlockedStage - 1);
  meta.difficultyClears = ['easy','medium','hard'].filter((id,i,all) => all.slice(0,i+1).every(k => Array.isArray(v.difficultyClears) && v.difficultyClears.includes(k)));
  meta.difficulty = ['easy', ...meta.difficultyClears.map(id => ({easy:'medium',medium:'hard',hard:'hard'})[id])].includes(v.difficulty) ? v.difficulty : 'easy';
  meta.talents = Object.fromEntries(TALENTS.filter(t => !['health', 'power'].includes(t.id)).map(t => [t.id, safe(v.talents?.[t.id], t.max)]));
  meta.gear = [...new Set(['pulse', 'traveler', 'compass', ...(Array.isArray(v.gear) ? v.gear.filter(id => GEAR.some(g => g.id === id)) : [])])];
  meta.loadout = Object.fromEntries(Object.keys(SLOTS).map(slot => [slot, GEAR.find(g => g.id === v.loadout?.[slot] && g.slot === slot && meta.gear.includes(g.id))?.id || GEAR.find(g => g.slot === slot).id]));
  meta.outfits = [...new Set(['ember', ...(Array.isArray(v.outfits) ? v.outfits.filter(id => OUTFITS.some(o => o.id === id)) : [])])];
  meta.outfit = meta.outfits.includes(v.outfit) ? v.outfit : 'ember';
  meta.contracts = Array.isArray(v.contracts) ? [...new Set(v.contracts.filter(id => CONTRACTS.some(c => c.id === id)))] : [];
  meta.totals = { kills: safe(v.totals?.kills), crates: safe(v.totals?.crates), guardians: v.totals ? safe(v.totals.guardians) : meta.unlockedStage - 1 };
  return meta;
}
export const canAfford = (meta, cost) => Object.entries(cost).every(([key, amount]) => (meta[key] || 0) >= amount);
function pay(meta, cost) { if (!canAfford(meta, cost)) return false; for (const [key, amount] of Object.entries(cost)) meta[key] -= amount; return true; }
export function talentStatus(meta, talent) {
  const level = talentLevel(meta, talent.id), cost = talent.cost(level);
  const required = talent.requires && TALENTS.find(t => t.id === talent.requires[0]);
  const reason = level >= talent.max ? 'DOMINADO' : rankInfo(meta.legacyXp).level < talent.rank ? `REQUER RANQUE ${talent.rank}` : required && talentLevel(meta, required.id) < talent.requires[1] ? `REQUER ${required.name.toUpperCase()} ${talent.requires[1]}` : !canAfford(meta, cost) ? 'FALTAM RECURSOS' : '';
  return { level, cost, reason, available: !reason };
}
export function buyTalent(meta, id) {
  const t = TALENTS.find(t => t.id === id); if (!t) return false;
  const s = talentStatus(meta, t); if (!s.available || !pay(meta, s.cost)) return false;
  if (['health', 'power'].includes(id)) meta[id]++; else meta.talents[id]++;
  return true;
}
export function resetTalents(meta) {
  let count = 0;
  for (const t of TALENTS) {
    const level = talentLevel(meta, t.id); count += level;
    for (let n = 0; n < level; n++) for (const [key, amount] of Object.entries(t.cost(n))) meta[key] += amount;
    if (['health', 'power'].includes(t.id)) meta[t.id] = 0; else meta.talents[t.id] = 0;
  }
  return count > 0;
}
export function useGear(meta, id) {
  const g = GEAR.find(g => g.id === id); if (!g) return false;
  if (!meta.gear.includes(id)) {
    if (rankInfo(meta.legacyXp).level < g.rank || !pay(meta, g.cost)) return false;
    meta.gear.push(id);
  }
  meta.loadout[g.slot] = id; return true;
}
export function useOutfit(meta, id) {
  const o = OUTFITS.find(o => o.id === id); if (!o) return false;
  if (!meta.outfits.includes(id)) { if (!pay(meta, o.cost)) return false; meta.outfits.push(id); }
  meta.outfit = id; return true;
}
export const contractProgress = (meta, c) => c.stat === 'stages' ? Math.max(0, meta.bestStage || 0, meta.unlockedStage - 1) : meta.totals[c.stat];
export function claimContract(meta, id) {
  const c = CONTRACTS.find(c => c.id === id);
  if (!c || meta.contracts.includes(id) || contractProgress(meta, c) < c.goal) return false;
  meta.contracts.push(id); for (const [key, amount] of Object.entries(c.reward)) meta[key] += amount; return true;
}
export function startingStats(meta) {
  const level = id => talentLevel(meta, id), equipped = Object.values(meta.loadout || {});
  const p = { maxHp: 100 + level('health') * 10, damage: 2 + level('power'), range: 2 + level('reach'), capacity: 2 + level('stock'), step: .19 * .96 ** level('stride'), fuse: 2.1, magnet: 1.25 + level('magnet'), dashMax: 3.5 * .92 ** level('dash'), vampire: level('siphon'), armor: level('armor') * .03, fire: 'normal', ward: 0, pierce: 0, salvageBonus: 0, outfit: meta.outfit || 'ember', equipment: { ...meta.loadout } };
  if (equipped.includes('azure-core')) { p.damage++; p.fire = 'azure'; p.fuse += .3; }
  if (equipped.includes('twin-core')) { p.capacity++; p.range++; }
  if (equipped.includes('wind-boots')) { p.step *= .9; p.dashMax *= .85; }
  if (equipped.includes('bastion-boots')) { p.maxHp += 15; p.armor += .08; }
  if (equipped.includes('salvager')) { p.magnet++; p.salvageBonus = .25; }
  if (equipped.includes('guardian-charm')) { p.ward = 1; p.vampire++; }
  return { ...p, hp: p.maxHp };
}
// Called only by Game.claimResult, whose existing guard prevents duplicate credit.
export function settleLegacy(game) {
  const m = game.meta, raw = game.materials || { scrap: 0, cores: 0 };
  const materials = { scrap: raw.scrap + Math.floor(raw.scrap * (game.player.salvageBonus || 0)), cores: raw.cores };
  m.scrap += materials.scrap; m.cores += materials.cores;
  const xp = game.kills * 2 + game.cratesBroken + Math.floor(game.elapsed / 12) + (game.result.victory ? 30 : 0);
  const before = rankInfo(m.legacyXp).level; m.legacyXp += xp;
  m.totals.kills += game.kills; m.totals.crates += game.cratesBroken; m.totals.guardians += game.result.victory ? 1 : 0;
  game.result.legacy = { materials, xp, rank: rankInfo(m.legacyXp).level, rankedUp: rankInfo(m.legacyXp).level > before };
}
