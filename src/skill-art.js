import { pixelArt } from './pixel-art.js';
import { localeTag } from './i18n.js';

export function skillArt(id) {
  return pixelArt(id.includes('-') ? id : `skill-${id}`, 'skill-art') || pixelArt('skill-capacity', 'skill-art');
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
  const [before, after, unit] = stats[id];
  return `<span class="skill-stat-change"><span>${before}</span><span class="stat-arrow">→</span><strong>${after}</strong><small>${unit}</small></span>`;
}
