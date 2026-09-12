// Campaign data is shared by the simulation, atlas, bestiary and soundtrack guide.
export const WORLDS = [
  { id: 'ruins', name: 'Vale dos Ecos', subtitle: 'ONDE A PRIMEIRA FAÍSCA NASCE', color: '#bfa2ff', floor: 0x48414f, wall: 0x444355, crystal: 0x9e74ff, tag: 'AS PEDRAS SE LEMBRAM DE VOCÊ', boss: 'MÓRTHOS', fleeLine: 'Seu pavio ainda é curto demais.', grudgeLine: 'Você me fez correr. Isso não se repete.', deathLine: 'O sino parou no meio da badalada.', title: 'O sino sem alma', quote: 'Ouvi seu coração. Vou fazê-lo parar.', mechanic: 'Pilares antigos e corredores seguros. Aprenda a atrair a horda.', enemies: ['slime', 'slime', 'ember'], bossAttack: 'Impactos marcados no chão e uma cruz de ruína.', loot: ['azure', 'shell', 'magnet'], music: 'ecos' },
  { id: 'forge', name: 'Caldeira Rubra', subtitle: 'O MUNDO QUE NUNCA ESFRIA', color: '#ff985b', floor: 0x513b35, wall: 0x56372e, crystal: 0xff6c25, tag: 'NÃO PISE ONDE A TERRA RESPIRA', boss: 'VULKAR', fleeLine: 'Volte quando tiver mais que fagulhas.', grudgeLine: 'A fornalha lembra de quem a apagou.', deathLine: 'A fornalha engoliu a própria brasa.', title: 'O coração da fornalha', quote: 'Sua chama é pequena. Alimente a minha.', mechanic: 'Gêiseres de lava se acendem antes de explodir. Use as pistas do chão.', enemies: ['ember', 'beetle', 'slime'], bossAttack: 'Rastros de erupção varrem linhas inteiras da arena.', loot: ['clock', 'echo', 'shell'], music: 'caldeira' },
  { id: 'abyss', name: 'Maré Espectral', subtitle: 'NEM A LUZ VOLTA INTEIRA', color: '#6ee7dc', floor: 0x28464c, wall: 0x304657, crystal: 0x47e4e5, tag: 'ALGO OBSERVA DO OUTRO LADO', boss: 'NYXARA', fleeLine: 'Ainda não. O vazio escolhe a hora.', grudgeLine: 'Eu voltei primeiro. Você chegou tarde.', deathLine: 'O vazio se fechou sobre ela, sem eco.', title: 'A rainha do vazio', quote: 'Todas as suas versões falharam aqui.', mechanic: 'Marés arcanas cruzam o piso. Espectros atacam à distância.', enemies: ['wisp', 'beetle', 'ember'], bossAttack: 'Selos ao seu redor, miragens e invocações do abismo.', loot: ['frost', 'echo', 'phoenix'], music: 'mare' },
  { id: 'garden', guardian: 'briarok', name: 'Jardim Voraz', subtitle: 'A FLORESTA DEVORA O SILÊNCIO', color: '#a2e58d', floor: 0x3c5041, wall: 0x344b40, crystal: 0x9be477, tag: 'AS RAÍZES OUVEM SEUS PASSOS', boss: 'BRIAROK', fleeLine: 'As raízes ainda não terminaram de crescer.', grudgeLine: 'Enterrei você uma vez. Agora floresce.', deathLine: 'As raízes soltaram o que prendiam.', title: 'A flor devoradora', quote: 'Enterrei o silêncio. Agora ele floresce.', mechanic: 'Sementes explodem com aviso. Esporeiros miram à distância; oráculos curam a horda.', enemies: ['spore', 'slime', 'oracle', 'mimic'], bossAttack: 'Coroas de sementes deixam o centro seguro; depois, raízes marcam uma cruz.', loot: ['pierce', 'mercy', 'magnet'], music: 'jardim' },
  { id: 'storm', guardian: 'fulgra', name: 'Cidadela do Trovão', subtitle: 'UM CÉU FEITO DE ENGRENAGENS', color: '#efd17a', floor: 0x484955, wall: 0x3d4253, crystal: 0xf5d474, tag: 'O RELÂMPAGO SEMPRE AVISA', boss: 'FULGRA', fleeLine: 'O trovão não gasta seu melhor raio à toa.', grudgeLine: 'Guardei esse relâmpago para você.', deathLine: 'O motor parou. O céu ficou quieto.', title: 'O motor da tempestade', quote: 'Até o céu se curva à minha fornalha.', mechanic: 'Raios percorrem colunas. Tecelãs prendem os pés: use a esquiva para se libertar.', enemies: ['weaver', 'ember', 'beetle', 'mimic'], bossAttack: 'Relâmpagos alternam colunas; uma cruz elétrica encerra o ciclo.', loot: ['overdrive', 'clock', 'echo'], music: 'trovao' },
  { id: 'frost', guardian: 'nivor', name: 'Coroa Glacial', subtitle: 'O ÚLTIMO INVERNO CAMINHA', color: '#9edefa', floor: 0x3b4f64, wall: 0x405269, crystal: 0x9ce9ff, tag: 'SOB O GELO, A FENDA RESPIRA', boss: 'NIVOR', fleeLine: 'O inverno tem paciência. Eu também.', grudgeLine: 'O gelo guardou seu último suspiro.', deathLine: 'O gelo rachou de dentro para fora.', title: 'A fortaleza viva', quote: 'Seu último suspiro ficará guardado no gelo.', mechanic: 'Selos congelantes atrasam seus passos, sem dano contínuo. Interrompa a cura dos oráculos.', enemies: ['oracle', 'weaver', 'wisp', 'spore'], bossAttack: 'Lanças marcam diagonais. A coroa de gelo fecha os caminhos ao redor.', loot: ['frost', 'mercy', 'pierce'], music: 'aurora' },
];
export const STAGES_PER_WORLD = 3;
// Cada mundo tem tres formas: cacada (so campeao), perseguicao (o guardiao foge)
// e duelo (luta real, com a arena se transformando). Derivado da posicao, nunca
// informado: o servidor recalcula a partir do numero da fase e nao confia no cliente.
export const STAGE_KINDS = ['hunt', 'chase', 'duel'];
// A entrada cinematica do guardiao e opt-in por mundo. So o primeiro tem, de
// proposito: queremos avaliar o ritmo numa luta antes de espalhar para os seis.
// Os tempos sao em segundos desde o inicio da transicao.
export const BOSS_ENTRANCES = {
  // Aprovada jogando, e depois replicada para os seis. O orcamento e o mesmo em
  // todos -- 2,9s de coreografia -- porque o ritmo foi medido e aprovado nele.
  // O que muda e a VOZ de cada mundo, nao a duracao.
  //
  // 'arrive' cria o guardiao ainda dentro da transicao: ele chega, roda a
  // animacao de entrada e o letreiro sobe com ele, e so entao o jogo destrava.
  ruins: {
    duration: 2.9,
    beats: [
      { at: 0, kind: 'rumble' },
      { at: .6, kind: 'fissure' },
      { at: 1.15, kind: 'summon', count: 3 },
      { at: 1.8, kind: 'slam', arrive: true },
    ],
  },
  // A fornalha respira antes de abrir: o chao treme, racha, e o que sai da
  // racha e a escolta. Sem invocacao propria -- a Caldeira cospe, nao chama.
  forge: {
    duration: 2.9,
    beats: [
      { at: 0, kind: 'rumble' },
      { at: .5, kind: 'fissure' },
      { at: 1.05, kind: 'fissure' },
      { at: 1.5, kind: 'summon', count: 2 },
      { at: 1.9, kind: 'slam', arrive: true },
    ],
  },
  // O vazio nao chega: ele se abre. Quase sem tremor, muita invocacao -- o que
  // assusta na Mare e o numero, nao o barulho.
  abyss: {
    duration: 2.9,
    beats: [
      { at: 0, kind: 'rumble' },
      { at: .75, kind: 'summon', count: 2 },
      { at: 1.3, kind: 'summon', count: 2 },
      { at: 1.85, kind: 'slam', arrive: true },
    ],
  },
  // As raizes vem primeiro e o corpo depois: duas ondas de fenda antes de
  // qualquer coisa pisar na arena.
  garden: {
    duration: 2.9,
    beats: [
      { at: 0, kind: 'fissure' },
      { at: .55, kind: 'fissure' },
      { at: 1.1, kind: 'rumble' },
      { at: 1.45, kind: 'summon', count: 3 },
      { at: 1.85, kind: 'slam', arrive: true },
    ],
  },
  // O trovao avisa antes de cair. Fenda seca, pausa, e o impacto.
  storm: {
    duration: 2.9,
    beats: [
      { at: 0, kind: 'fissure' },
      { at: .7, kind: 'rumble' },
      { at: 1.2, kind: 'summon', count: 2 },
      { at: 1.95, kind: 'slam', arrive: true },
    ],
  },
  // O inverno demora. Tremor longo, uma fenda so, e a chegada mais tardia de
  // todas -- a Coroa tem paciencia.
  frost: {
    duration: 2.9,
    beats: [
      { at: 0, kind: 'rumble' },
      { at: .9, kind: 'rumble' },
      { at: 1.4, kind: 'fissure' },
      { at: 1.7, kind: 'summon', count: 2 },
      { at: 2.05, kind: 'slam', arrive: true },
    ],
  },
};
export const entranceFor = biome => BOSS_ENTRANCES[biome?.id] || null;
export const CAMPAIGN_LENGTH = WORLDS.length * STAGES_PER_WORLD;
const STAGES = [
  ['O primeiro eco', 15, 13, 'classic', 'Inimigos distraídos. Um campeão fecha a caçada.'],
  ['Pátio esquecido', 15, 13, 'courtyard', 'Praça aberta. O guardião aparece — e não fica.'],
  // 17x15 e nao 17x13: medido em 2026-09-11, o primeiro duelo era o UNICO da
  // campanha que quase nao crescia sobre a cacada do proprio mundo -- +26 casas
  // contra +60 a +102 nos outros cinco. Nao era a arena que era pequena, era o
  // salto que nao acontecia. E e o primeiro duelo que o jogador conhece.
  ['Campanário partido', 17, 15, 'crossroads', 'A arena se parte quando ele chega. Sem fuga agora.'],
  ['Boca da fornalha', 17, 13, 'courtyard', 'Lava anunciada no chão. Observe antes de correr.'],
  ['Engrenagens em brasa', 17, 15, 'lanes', 'Besouros blindados e um sentinela de ferro.'],
  ['Trono de escória', 19, 15, 'crossroads', 'Corredores em chamas. Vulkar espera no coração da caldeira.'],
  ['Costa dos sussurros', 17, 15, 'lanes', 'Espectros miram de longe. Nunca fique parado.'],
  ['Jardim submerso', 19, 15, 'courtyard', 'Marés arcanas e o arauto da rainha aos 60s.'],
  ['O último horizonte', 19, 17, 'crossroads', 'Derrote Nyxara e atravesse a fenda rumo ao Jardim Voraz.'],
  ['Estufa dos sussurros', 17, 15, 'gardens', 'Alamedas abertas. Atraia os esporeiros para fora das raízes.'],
  ['Pomar de ossos', 19, 15, 'courtyard', 'Oráculos curam aliados. Elimine o suporte antes de enfrentar a horda.'],
  ['Árvore do primeiro sino', 19, 17, 'gardens', 'Mórthos renasceu. O centro das coroas de sementes é seu abrigo.'],
  ['Pontes de cobre', 17, 15, 'bridges', 'Observe as colunas marcadas e atravesse entre os relâmpagos.'],
  ['Relógio da tempestade', 19, 17, 'lanes', 'Tecelãs e mímicos. Guarde a esquiva para escapar das armadilhas.'],
  ['Trono do céu partido', 21, 17, 'bridges', 'Vulkar absorveu o trovão. Planeje duas rotas de fuga.'],
  ['Lago das memórias', 19, 17, 'courtyard', 'O gelo desacelera, mas a esquiva quebra o selo. Mantenha uma carga pronta.'],
  ['Biblioteca congelada', 19, 19, 'gardens', 'Priorize os oráculos antes que a horda recupere a vida.'],
  ['A última aurora', 21, 19, 'crossroads', 'A forma glacial de Nyxara guarda o início da próxima ascensão.'],
];
export function stageFor(number = 1) {
  number = Math.max(1, Math.floor(number));
  const index = (number - 1) % CAMPAIGN_LENGTH, worldIndex = Math.floor(index / STAGES_PER_WORLD), [name, width, height, layout, description] = STAGES[index];
  const local = index % STAGES_PER_WORLD + 1, kind = STAGE_KINDS[local - 1];
  return { number, index, local, worldIndex, world: WORLDS[worldIndex], cycle: Math.floor((number - 1) / CAMPAIGN_LENGTH), name, width: width + 2, height: height + 2, layout, description,
    kind, miniboss: kind === 'hunt',
    reward: 8 + index * 2 + Math.floor((number - 1) / CAMPAIGN_LENGTH) * 6, musicKey: `${WORLDS[worldIndex].music}-${local}` };
}
export const RELICS = [
  { id: 'pierce', name: 'Espinho de cerco', icon: 'Expand', art: 'range', color: '#bbe991', rarity: 'ÉPICA', desc: 'A explosão atravessa a primeira caixa em cada direção. Abra corredores e acerte inimigos atrás dela.' },
  { id: 'overdrive', name: 'Última carga', icon: 'Zap', art: 'capacity', color: '#f5d37f', rarity: 'ÉPICA', desc: 'A bomba que ocupa sua última vaga recebe +2 de dano. Planeje a ordem de colocação.' },
  { id: 'mercy', name: 'Pétala guardiã', icon: 'Shield', art: 'health', color: '#b7e8de', rarity: 'RARA', desc: 'Bloqueia um golpe. Cada coração coletado restaura essa proteção, sem acumular cargas.' },
  { id: 'azure', name: 'Fogo azul', icon: 'Flame', art: 'power', color: '#59caff', rarity: 'RARA', desc: '+1 dano e explosões azuis. O rastro luminoso é inofensivo depois do impacto.' },
  { id: 'clock', name: 'Bomba-relógio', icon: 'Timer', art: 'fuse', color: '#f5c477', rarity: 'RARA', desc: 'Pavio 1s mais longo, +2 dano e +1 alcance. Mais tempo para armar uma cilada.' },
  { id: 'echo', name: 'Eco do caos', icon: 'Expand', art: 'range', color: '#c39bff', rarity: 'ÉPICA', desc: 'Cada bomba repete a explosão após 0,85s com metade do dano. A repetição também machuca você.' },
  { id: 'frost', name: 'Geada do vazio', icon: 'Wind', art: 'speed', color: '#8bf3e7', rarity: 'RARA', desc: 'Explosões reduzem a velocidade dos inimigos por 2,5s. Chefes resistem parcialmente.' },
  { id: 'shell', name: 'Carapaça solar', icon: 'Shield', art: 'health', color: '#ffd784', rarity: 'INCOMUM', desc: '+20 de vida máxima e cura 20. Dano recebido reduzido em 20%.' },
  { id: 'magnet', name: 'Órbita de cobre', icon: 'Magnet', art: 'magnet', color: '#90e5a3', rarity: 'INCOMUM', desc: '+2 de raio de coleta e +1 bomba simultânea.' },
  { id: 'phoenix', name: 'Última faísca', icon: 'HeartPulse', art: 'heal', color: '#ff8dac', rarity: 'ÉPICA', desc: 'Ao sofrer dano fatal, renasça uma vez com 50% da vida e 3s de proteção.' },
];
export const relicById = id => RELICS.find(relic => relic.id === id);
export const ENEMY_NAMES = { slime: 'Limo errante', ember: 'Investidor de brasa', beetle: 'Besouro de ferro', wisp: 'Espectro da maré', sentinel: 'Sentinela da fenda', spore: 'Esporeiro', weaver: 'Tecelã elétrica', oracle: 'Oráculo de cristal', mimic: 'Baú faminto' };
export const ENEMY_TACTICS = {
  slime: { art: 'magnet', color: '#b99ce5', role: 'PERSEGUIDOR', tip: 'Deixe a bomba no corredor e atraia o limo. Os primeiros ainda não aprenderam a fugir.' },
  ember: { art: 'dash', color: '#ffab73', role: 'INVESTIDA', tip: 'Espere a preparação e saia para o lado. A direção da investida fica travada.' },
  beetle: { art: 'health', color: '#b6c6df', role: 'BLINDADO', tip: 'Use bombas em cadeia. Seu passo lento favorece cercos.' },
  wisp: { art: 'fuse', color: '#8ae9df', role: 'CONJURADOR', tip: 'A marca mostra onde o ataque vai cair. Saia dela antes do impacto.' },
  sentinel: { art: 'power', color: '#f2be80', role: 'MINICHEFE', tip: 'Aparece aos 60s nas fases indicadas. Derrotá-lo rende relíquia, núcleo e essências.' },
  spore: { art: 'vampire', color: '#b3df84', role: 'BOMBARDEIRO', tip: 'Suas sementes explodem em cruz após 1,8s. Aproxime-se pelas diagonais.' },
  weaver: { art: 'speed', color: '#ecd17c', role: 'CONTROLE', tip: 'A teia marcada desacelera por 2s, sem ferir. A esquiva remove a lentidão.' },
  oracle: { art: 'heal', color: '#a3ddfa', role: 'SUPORTE', tip: 'Recupera 2 de vida dos aliados próximos após canalizar. Derrote-o para interromper a cura.' },
  mimic: { art: 'capacity', color: '#ecab7e', role: 'EMBOSCADA', tip: 'Um baú com olhos não é tesouro. Ele desperta quando você chega a três casas: recue e prepare uma bomba.' },
};
