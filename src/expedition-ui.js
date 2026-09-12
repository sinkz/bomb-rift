import { DIFFICULTIES, difficultyKeys, difficultyUnlocked } from '../shared/expedition.js';
import { pixelIcon } from './pixel-art.js';

export function lifeShop(game) {
  if (!game.expedition || game.expedition.ended) return '';
  const capped = game.lives >= 3, soldOut = game.expedition.purchases >= 3;
  return `<section class="life-shop"><div>${pixelIcon('HeartPulse')}<b>${game.lives} <span>${game.lives === 1 ? 'VIDA' : 'VIDAS'}</span></b><small>Uma vida extra mantém você nesta fase. Sem vidas, a tentativa volta à fase 1.</small></div><button class="secondary-button" data-action="buy-life" ${capped || soldOut || game.crystals < game.lifeCost ? 'disabled' : ''}>${capped ? 'VIDAS NO MÁXIMO' : soldOut ? 'ESTOQUE ESGOTADO' : `${pixelIcon('Plus')} VIDA EXTRA · ${game.lifeCost} ${pixelIcon('Gem')}`}</button><small>Máximo de 3 vidas e 3 compras por tentativa. Cada mundo concluído concede uma vida.</small></section>`;
}
export function difficultyPicker(game) {
  const active = game.expedition && !game.expedition.ended;
  // Com a tentativa em andamento a dificuldade fica travada: mostrar tres cartas
  // inertes so gasta tela, entao o seletor colapsa para uma linha.
  return `<section class="difficulty-picker${active ? ' locked' : ''}" aria-label="Dificuldade"><div><b>${active ? 'DIFICULDADE' : 'ESCOLHA O DESAFIO'}</b><small>Conclua as 18 fases no Easy para liberar Medium; conclua Medium para liberar Hard.</small></div><div class="difficulty-options">${difficultyKeys.map((id,i) => `<button data-difficulty="${id}" aria-pressed="${game.difficulty === id}" ${active || !difficultyUnlocked(game.meta,id) ? 'disabled' : ''}><b>${!difficultyUnlocked(game.meta,id) ? pixelIcon('LockKeyhole') : ''}${DIFFICULTIES[id].label}</b><small>× ${(DIFFICULTIES[id].score/100).toFixed(2)} PTS</small><span>${['Desafio original','+55% vida · +40% dano','+130% vida · +85% dano'][i]}</span></button>`).join('')}</div><p>${active ? 'Tentativa em andamento. A dificuldade fica fixa até o encerramento.' : 'Cada tentativa começa na fase 1. Seus upgrades permanentes ficam.'}</p><small>A tentativa fica nesta aba. Recarregar inicia uma nova tentativa.</small></section>`;
}
