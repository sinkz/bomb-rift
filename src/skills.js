import { despertaEm } from './oath.js';

// Run-only skills. The fifth selection awakens a mastery; healing is consumable.
// Quem jurou a uma delas desperta na QUARTA -- ver src/oath.js.
export const MASTERY_LEVEL = 5;
export const SKILLS = [
  { id: 'power', name: 'Pólvora instável', icon: 'Flame', branch: 'DESTRUIÇÃO', desc: '+1 de dano em todas as explosões.', color: '#ff985c', max: MASTERY_LEVEL, mastery: 'Sol azul', awakening: 'Explosões azuis e mais +2 de dano.' },
  { id: 'range', name: 'Rastro de fogo', icon: 'Expand', branch: 'DESTRUIÇÃO', desc: '+1 bloco de alcance para suas bombas.', color: '#ff985c', max: 5, mastery: 'Lança de cerco', awakening: 'A explosão atravessa a primeira caixa em cada direção.' },
  { id: 'capacity', name: 'Bolsos sem fundo', icon: 'Bomb', branch: 'ARSENAL', desc: '+1 bomba simultânea. Mais caos, mais possibilidades.', color: '#b5a0ff', max: 5, mastery: 'Grande final', awakening: 'A bomba que ocupa a última vaga ganha +4 de dano.' },
  { id: 'speed', name: 'Passos fantasma', icon: 'Wind', branch: 'MOBILIDADE', desc: 'Mova-se 10% mais rápido pela masmorra.', color: '#72dcc5', max: 5, mastery: 'Intangível', awakening: 'A proteção de cada esquiva passa a durar 1 segundo.' },
  { id: 'health', name: 'Coração de pedra', icon: 'Heart', branch: 'VITALIDADE', desc: '+25 de vida máxima e recupera 35 de vida.', color: '#fb7993', max: MASTERY_LEVEL, mastery: 'Fortaleza viva', awakening: 'Recupera toda a vida e ganha 20% de armadura adicional.' },
  { id: 'magnet', name: 'Chamado da fenda', icon: 'Magnet', branch: 'COLETA', desc: 'Atrai cristais a uma distância maior.', color: '#72dcc5', max: 5, mastery: 'Órbita vital', awakening: '+3 de raio de coleta. Cada cristal coletado cura 1 de vida.' },
  { id: 'fuse', name: 'Pavio curto', icon: 'Timer', branch: 'ARSENAL', desc: 'Bombas explodem 12% mais rápido.', color: '#b5a0ff', max: 5, mastery: 'Primeira faísca', awakening: 'Plantar uma bomba com todas as vagas livres concede +3 de dano a ela.' },
  { id: 'dash', name: 'Salto dimensional', icon: 'Zap', branch: 'MOBILIDADE', desc: 'Reduz em 18% a recarga da esquiva.', color: '#72dcc5', max: 5, mastery: 'Dança da fenda', awakening: 'Cada abate devolve 0,6s da recarga da esquiva.' },
  { id: 'heal', name: 'Segundo fôlego', icon: 'HeartPulse', branch: 'VITALIDADE', desc: 'Recupera 50 de vida imediatamente.', color: '#fb7993', max: Infinity },
  { id: 'vampire', name: 'Pacto carmesim', icon: 'Droplets', branch: 'VITALIDADE', desc: 'Derrotar um monstro recupera +2 de vida.', color: '#fb7993', max: 5, mastery: 'Sangue imortal', awakening: 'Abater com a vida cheia restaura um escudo. Não acumula cargas.' },
  { id: 'chain', name: 'Arco voltaico', icon: 'Zap', art: 'relic-overdrive', branch: 'TEMPESTADE', desc: 'Ao acertar uma explosão, raios saltam para até 2 inimigos próximos. +1 dano elétrico por nível.', color: '#f5d37f', max: 5, mastery: 'Tempestade viva', awakening: 'O raio salta para até 5 inimigos e causa 5 de dano por alvo.' },
  { id: 'frost', name: 'Cristal de inverno', icon: 'Snowflake', art: 'relic-frost', branch: 'CONTROLE', desc: 'Explosões desaceleram inimigos. Cada escolha prolonga o efeito.', color: '#8bdfff', max: 5, mastery: 'Zero absoluto', awakening: 'Congela inimigos por 2s; atingir um alvo congelado causa +2 de dano. Chefes resistem.' },
  { id: 'shrapnel', name: 'Rosa de estilhaços', icon: 'Expand', art: 'relic-pierce', branch: 'DESTRUIÇÃO', desc: 'Adiciona raios diagonais às bombas. Alterna melhorias de alcance diagonal e dano.', color: '#f9b68d', max: 5, mastery: 'Supernova', awakening: 'As quatro diagonais alcançam 4 blocos. Todas as bombas ganham +1 de dano.' },
  { id: 'ward', name: 'Égide de cristal', icon: 'Shield', art: 'relic-shell', branch: 'VITALIDADE', desc: 'Restaura um escudo periodicamente. Cada escolha reduz o intervalo em 2s.', color: '#b3e5d4', max: 5, mastery: 'Santuário portátil', awakening: 'Um novo escudo a cada 6s. Ao bloquear, cura 10 de vida.' },
  { id: 'alchemy', name: 'Alquimia da fenda', icon: 'Gem', art: 'relic-magnet', branch: 'COLETA', desc: '+12% de experiência por cristal. Evolua mais vezes nesta fase.', color: '#d2a2ff', max: 5, mastery: 'Pedra filosofal', awakening: 'Forjar habilidades custa 25% menos cristais.' },
  { id: 'afterglow', name: 'Rastro de cometa', icon: 'Wind', art: 'gear-wind-boots', branch: 'MOBILIDADE', desc: 'Sua esquiva causa dano instantâneo aos inimigos atravessados. +1 dano por nível.', color: '#6cf0d8', max: 5, mastery: 'Queda de estrela', awakening: 'A esquiva causa 8 de dano e explode em cruz ao chegar, sem ferir você.' },
];

export const skillById = id => SKILLS.find(s => s.id === id);
export function masteryProgress(game, id) {
  const skill = skillById(id), level = game.skillLevels[id] || 0;
  if (!skill?.mastery) return '<small class="mastery-consumable">CURA IMEDIATA</small>';
  // O alvo e de quem joga, nao do catalogo: a jurada fecha em quatro. Mostrar
  // cinco pips para ela seria prometer um degrau que nao existe mais.
  const alvo = despertaEm(game, id);
  const jurada = game.oath === id && !game.oathBroken;
  const awakened = level >= alvo, next = level === alvo - 1;
  const ordinal = alvo === 4 ? 'QUARTA' : 'QUINTA';
  return `<span class="mastery-progress ${awakened ? 'awakened' : next ? 'awakening-next' : ''}${jurada ? ' sworn' : ''}"><span class="mastery-pips" aria-hidden="true">${Array.from({length:alvo}, (_, i) => `<i class="${i < level ? 'filled' : i === level ? 'next' : ''}"></i>`).join('')}</span><b>${awakened ? 'DESPERTA' : `${Math.min(alvo, level + 1)}/${alvo}`} · ${skill.mastery}${jurada && !awakened ? ' · JURADA' : ''}</b><small>${next ? 'NESTA ESCOLHA: ' : awakened ? '' : `NA ${ordinal} ESCOLHA: `}${skill.awakening}</small></span>`;
}
