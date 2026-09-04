// Campaign data is shared by the simulation, atlas, bestiary and soundtrack guide.
export const WORLDS = [
  { id: 'ruins', name: 'Vale dos Ecos', subtitle: 'ONDE A PRIMEIRA FAÍSCA NASCE', color: '#bfa2ff', floor: 0x48414f, wall: 0x444355, crystal: 0x9e74ff, tag: 'AS PEDRAS SE LEMBRAM DE VOCÊ', boss: 'MÓRTHOS', title: 'O sino sem alma', quote: 'Ouvi seu coração. Vou fazê-lo parar.', mechanic: 'Pilares antigos e corredores seguros. Aprenda a atrair a horda.', enemies: ['slime', 'slime', 'ember'], bossAttack: 'Impactos marcados no chão e uma cruz de ruína.', loot: ['azure', 'shell', 'magnet'], music: 'ecos' },
  { id: 'forge', name: 'Caldeira Rubra', subtitle: 'O MUNDO QUE NUNCA ESFRIA', color: '#ff985b', floor: 0x513b35, wall: 0x56372e, crystal: 0xff6c25, tag: 'NÃO PISE ONDE A TERRA RESPIRA', boss: 'VULKAR', title: 'O coração da fornalha', quote: 'Sua chama é pequena. Alimente a minha.', mechanic: 'Gêiseres de lava se acendem antes de explodir. Use as pistas do chão.', enemies: ['ember', 'beetle', 'slime'], bossAttack: 'Rastros de erupção varrem linhas inteiras da arena.', loot: ['clock', 'echo', 'shell'], music: 'caldeira' },
  { id: 'abyss', name: 'Maré Espectral', subtitle: 'NEM A LUZ VOLTA INTEIRA', color: '#6ee7dc', floor: 0x28464c, wall: 0x304657, crystal: 0x47e4e5, tag: 'ALGO OBSERVA DO OUTRO LADO', boss: 'NYXARA', title: 'A rainha do vazio', quote: 'Todas as suas versões falharam aqui.', mechanic: 'Marés arcanas cruzam o piso. Espectros atacam à distância.', enemies: ['wisp', 'beetle', 'ember'], bossAttack: 'Selos ao seu redor, miragens e invocações do abismo.', loot: ['frost', 'echo', 'phoenix'], music: 'mare' },
];
const STAGES = [
  ['O primeiro eco', 15, 13, 'classic', 'Inimigos distraídos. Encontre o ritmo do pavio.', false],
  ['Pátio esquecido', 15, 13, 'courtyard', 'Uma praça aberta e o primeiro sentinela aos 60s.', true],
  ['Campanário partido', 17, 13, 'crossroads', 'O guardião desperta mais forte. Conquiste o vale.', true],
  ['Boca da fornalha', 17, 13, 'courtyard', 'Lava anunciada no chão. Observe antes de correr.', false],
  ['Engrenagens em brasa', 17, 15, 'lanes', 'Besouros blindados e um sentinela de ferro.', true],
  ['Trono de escória', 19, 15, 'crossroads', 'Corredores em chamas. Vulkar espera no coração da caldeira.', true],
  ['Costa dos sussurros', 17, 15, 'lanes', 'Espectros miram de longe. Nunca fique parado.', false],
  ['Jardim submerso', 19, 15, 'courtyard', 'Marés arcanas e o arauto da rainha aos 60s.', true],
  ['O último horizonte', 19, 17, 'crossroads', 'A maior arena. Derrote Nyxara e abra a próxima ascensão.', true],
];
export function stageFor(number = 1) {
  number = Math.max(1, Math.floor(number));
  const index = (number - 1) % 9, worldIndex = Math.floor(index / 3), [name, width, height, layout, description, miniboss] = STAGES[index];
  return { number, index, local: index % 3 + 1, worldIndex, world: WORLDS[worldIndex], cycle: Math.floor((number - 1) / 9), name, width, height, layout, description, miniboss,
    reward: 8 + index * 2 + Math.floor((number - 1) / 9) * 6, musicKey: `${WORLDS[worldIndex].music}-${index % 3 + 1}` };
}
export const RELICS = [
  { id: 'azure', name: 'Fogo azul', icon: 'Flame', art: 'power', color: '#59caff', rarity: 'RARA', desc: '+1 dano. Suas chamas ficam azuis e duram 1,1s.' },
  { id: 'clock', name: 'Bomba-relógio', icon: 'Timer', art: 'fuse', color: '#f5c477', rarity: 'RARA', desc: 'Pavio 1s mais longo, +2 dano e +1 alcance. Mais tempo para armar uma cilada.' },
  { id: 'echo', name: 'Eco do caos', icon: 'Expand', art: 'range', color: '#c39bff', rarity: 'ÉPICA', desc: 'Cada bomba repete a explosão após 0,85s com metade do dano. A repetição também machuca você.' },
  { id: 'frost', name: 'Geada do vazio', icon: 'Wind', art: 'speed', color: '#8bf3e7', rarity: 'RARA', desc: 'Explosões reduzem a velocidade dos inimigos por 2,5s. Chefes resistem parcialmente.' },
  { id: 'shell', name: 'Carapaça solar', icon: 'Shield', art: 'health', color: '#ffd784', rarity: 'INCOMUM', desc: '+20 de vida máxima e cura 20. Dano recebido reduzido em 20%.' },
  { id: 'magnet', name: 'Órbita de cobre', icon: 'Magnet', art: 'magnet', color: '#90e5a3', rarity: 'INCOMUM', desc: '+2 de raio de coleta e +1 bomba simultânea.' },
  { id: 'phoenix', name: 'Última faísca', icon: 'HeartPulse', art: 'heal', color: '#ff8dac', rarity: 'ÉPICA', desc: 'Ao sofrer dano fatal, renasça uma vez com 50% da vida e 3s de proteção.' },
];
export const relicById = id => RELICS.find(relic => relic.id === id);
export const ENEMY_NAMES = { slime: 'Limo errante', ember: 'Investidor de brasa', beetle: 'Besouro de ferro', wisp: 'Espectro da maré', sentinel: 'Sentinela da fenda' };
