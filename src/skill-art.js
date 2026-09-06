import { pixelArt } from './pixel-art.js';
import { localeTag } from './i18n.js';
import { skillById } from './skills.js';

export function skillArt(id) {
  return pixelArt(skillById(id)?.art || (id.includes('-') ? id : `skill-${id}`), 'skill-art') || pixelArt('skill-capacity', 'skill-art');
}

export function skillPreview(game, id) {
  const p = game.player;
  const decimal = n => n.toLocaleString(localeTag(), { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const stats = {
    power: [p.damage, p.damage + 1, 'DANO'], range: [p.range, p.range + 1, 'BLOCOS'], capacity: [p.capacity, p.capacity + 1, 'BOMBAS'],
    speed: [decimal(1 / p.step), decimal(1 / (p.step * .9)), 'BLOCOS / S'], health: [p.maxHp, p.maxHp + 25, 'VIDA MÁXIMA'],
    magnet: [Math.floor(p.magnet), Math.floor(p.magnet) + 1, 'RAIO DE COLETA'], fuse: [decimal(p.fuse), decimal(p.fuse * .88), 'SEGUNDOS'],
    dash: [decimal(p.dashMax), decimal(p.dashMax * .82), 'RECARGA'], heal: [p.hp, Math.min(p.maxHp, p.hp + 50), 'VIDA'], vampire: [p.vampire, p.vampire + 2, 'CURA POR ABATE'],
  };
  const level = game.skillLevels[id] || 0;
  Object.assign(stats, {
    chain: [level, level+1, 'DANO ELÉTRICO'],
    frost: [decimal(level ? 1+level*.3 : 0), decimal(1+(level+1)*.3), 'LENTIDÃO / S'],
    shrapnel: [level >= 5 ? 4 : Math.ceil(level/2), level === 4 ? 4 : Math.ceil((level+1)/2), 'ALCANCE DIAGONAL'],
    ward: [level ? 20-level*2 : '—', level === 4 ? 6 : 20-(level+1)*2, 'RECARGA / S'],
    alchemy: [level*12+'%', (level+1)*12+'%', 'BÔNUS DE XP'],
    afterglow: [level, level === 4 ? 8 : level+1, 'DANO DA ESQUIVA'],
  });
  if (id === 'shrapnel' && [1,3].includes(level)) stats.shrapnel=[p.damage,p.damage+1,'DANO'];
  if (level === 4 && id === 'power') stats.power[1] += 2;
  if (level === 4 && id === 'magnet') stats.magnet[1] += 3;
  const [before, after, unit] = stats[id] || [level,level+1,'NÍVEL'];
  return `<span class="skill-stat-change"><span>${before}</span><span class="stat-arrow">→</span><strong>${after}</strong><small>${unit}</small></span>`;
}
