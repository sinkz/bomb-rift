// Os selos: a terceira habilidade ativa.
//
// Pedido do dono: "hoje temos soltar bomba e o blink, poderia ter mais uma que
// eu seleciono da arvore e que faca sentido na arvore... tem ativas em cada
// build, mais de uma, mas so posso colocar uma, dai vem sinergia".
//
// O buraco que o pedido revela e maior do que ele. Contando o catalogo inteiro:
// dezesseis habilidades de fase e nove talentos permanentes, vinte e cinco
// melhorias -- e NENHUMA delas e uma acao. Todas sao numeros que mudam sozinhos.
// Bomba e esquiva sao as unicas coisas que as suas maos fazem, do primeiro
// minuto ao ultimo. Investir na arvore mudava o quanto voce aguenta, nunca o
// que voce faz.
//
// Dois por ramo, um equipado. A escolha forcada e o ponto: e ela que faz o ramo
// virar identidade em vez de lista de compras, e e ela que decide quais
// habilidades de fase voce vai cacar nos level-ups.
//
// Nenhum selo inventa mecanica. Cada um reusa um primitivo que ja existe e ja e
// testado -- explode(), applyFlame(), player.ward, hazardField.remove() -- para
// que a ativa nova nao nasca sem rede.

/** Quanto tempo antes de poder usar de novo, por selo. */
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

/** Quanto a armadilha do Ferrao fica de pe antes de estourar sozinha. */
export const ESPERA_DO_FERRAO = 8;
const distancia = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.z - b.z);

export const SELOS = [
  {
    id: 'estouro',
    ramo: 'demolition',
    nome: 'Estouro',
    art: 'sigil-estouro',
    cor: '#f68b3d',
    desc: 'Detona agora todas as suas bombas em campo, sem esperar o pavio.',
    sinergia: 'Arsenal de bolso + Bolsos sem fundo — quanto mais bombas, maior o estouro.',
    recarga: 12,
    rank: 1,
    requer: ['power', 1],
    custo: { shards: 14, cores: 1 },
    // A jogada de quem plantou tres e viu o guardiao entrar no meio delas. O
    // pavio existe para te dar tempo de sair; o selo compra o direito de abrir
    // mao desse tempo quando a janela vale mais que a seguranca.
    usar(game) {
      if (!game.bombs.length) return false;
      for (const bomba of [...game.bombs]) game.explode(bomba);
      return true;
    },
  },
  {
    id: 'ferrao',
    ramo: 'demolition',
    nome: 'Ferrão',
    art: 'sigil-ferrao',
    cor: '#ffb066',
    desc: 'Planta uma armadilha: ela espera até 8s parada e estoura quando um inimigo encosta.',
    sinergia: 'Chama ancestral + Pólvora instável — todo o dano concentrado num alvo só.',
    recarga: 10,
    rank: 2,
    requer: ['power', 2],
    custo: { shards: 18, scrap: 12, cores: 1 },
    // Nao muda o plantBomb: planta pelo caminho normal e MARCA a bomba recem
    // nascida. O gatilho por contato mora numa linha do tique das bombas.
    //
    // O pavio longo e deliberado. Uma armadilha verdadeiramente eterna ocuparia
    // uma das suas vagas de bomba para sempre quando ninguem pisasse nela -- com
    // capacidade 2, plantar uma no canto errado tiraria metade do seu arsenal
    // pelo resto da fase. Oito segundos leem como "ela espera" e devolvem a vaga.
    usar(game) {
      if (!game.plantBomb()) return false;
      const bomba = game.bombs[game.bombs.length - 1];
      bomba.sting = true;
      bomba.fuse = bomba.maxFuse = ESPERA_DO_FERRAO;
      bomba.damage += 4;
      return true;
    },
  },
  {
    id: 'ancora',
    ramo: 'survival',
    nome: 'Âncora',
    art: 'sigil-ancora',
    cor: '#7ecf9e',
    desc: 'Crava um domo na sua casa: bloqueia o próximo golpe e empurra a horda para trás.',
    sinergia: 'Pele de basalto + Égide de cristal — dois escudos, dois erros perdoados.',
    recarga: 18,
    rank: 1,
    requer: ['health', 2],
    custo: { shards: 12, scrap: 10 },
    // Compra um segundo, nao uma vida: o escudo some no primeiro golpe e o
    // empurrao abre exatamente uma casa de respiro.
    usar(game) {
      const p = game.player;
      if (p.ward > 0) return false;
      p.ward = 1;
      for (const bicho of game.enemies) {
        if (distancia(bicho, p) > 1 || bicho.type === 'boss') continue;
        const dx = Math.sign(bicho.x - p.x), dz = Math.sign(bicho.z - p.z);
        if (game.walkable(bicho.x + dx, bicho.z + dz, bicho) && !game.occupied(bicho.x + dx, bicho.z + dz, bicho)) {
          bicho.x += dx; bicho.z += dz;
        }
      }
      return true;
    },
  },
  {
    id: 'sangria',
    ramo: 'survival',
    nome: 'Sangria',
    art: 'sigil-sangria',
    cor: '#e05c6e',
    desc: 'Paga 15 de vida por um estouro em cruz que devolve 5 por inimigo atingido.',
    sinergia: 'Pacto de retorno + Pacto carmesim — vida vira munição e volta multiplicada.',
    recarga: 14,
    rank: 3,
    requer: ['siphon', 1],
    custo: { shards: 20, scrap: 14, cores: 1 },
    // O unico selo que pode te machucar. Sem alvo por perto ele e prejuizo puro,
    // entao ele nao e botao de panico: e aposta.
    usar(game) {
      const p = game.player;
      if (p.hp <= 20) return false;
      p.hp -= 15;
      const cells = [{ x: p.x, z: p.z }];
      for (const [dx, dz] of DIRS) {
        for (let i = 1; i <= 3; i++) {
          const x = p.x + dx * i, z = p.z + dz * i;
          if (game.tile(x, z) === 1) break;
          cells.push({ x, z });
        }
      }
      const flame = { cells, damage: 10, hit: new Set(), friendly: true, secondary: true };
      game.applyFlame(flame);
      if (flame.hit.size) game.restoreHealth(5 * flame.hit.size);
      return true;
    },
  },
  {
    id: 'fenda',
    ramo: 'mobility',
    nome: 'Fenda',
    art: 'sigil-fenda',
    cor: '#a97ce0',
    desc: 'Troca de lugar com a sua bomba mais distante.',
    sinergia: 'Fio do horizonte + Rastro de cometa — reposicionar vira ataque.',
    recarga: 10,
    rank: 1,
    requer: ['stride', 1],
    custo: { shards: 14, scrap: 8 },
    // A esquiva FOGE; a fenda te poe onde voce planejou estar. Sao verbos
    // diferentes, e por isso as duas podem conviver no mesmo teclado.
    usar(game) {
      const p = game.player;
      const longe = game.bombs.slice().sort((a, b) => distancia(b, p) - distancia(a, p))[0];
      if (!longe || distancia(longe, p) < 2) return false;
      // Voce pode estar em cima de uma bomba -- e comum, acabou de plantar. Sem
      // esta guarda a troca empilharia duas bombas na mesma casa, e plantBomb
      // passa a vida inteira garantindo que isso nao acontece.
      if (game.bombs.some(bomba => bomba !== longe && bomba.x === p.x && bomba.z === p.z)) return false;
      const destino = { x: longe.x, z: longe.z };
      longe.x = p.x; longe.z = p.z;
      p.x = destino.x; p.z = destino.z;
      // Meio segundo de tregua: chegar dentro de uma horda sem nenhuma janela de
      // reacao transformaria a ferramenta em armadilha.
      p.invincible = Math.max(p.invincible, .5);
      p.moveCooldown = 0;
      game.collect();
      return true;
    },
  },
  {
    id: 'brasa-fria',
    ramo: 'mobility',
    nome: 'Brasa fria',
    art: 'sigil-brasa-fria',
    cor: '#5baccf',
    desc: 'Apaga o perigo do chão num raio de 2 casas e congela quem estiver lá.',
    sinergia: 'Passos do andarilho + Cristal de inverno — a resposta direta aos duelos.',
    recarga: 20,
    rank: 2,
    requer: ['stride', 2],
    custo: { shards: 16, scrap: 12 },
    // Este selo estava previsto. Quando o perigo persistente fechou, o plano
    // registrou remove(x,z) exposto "para uma skill que apaga". O gancho existia
    // e nunca tinha sido usado.
    usar(game) {
      const p = game.player;
      const apagadas = [];
      for (let dz = -2; dz <= 2; dz++) {
        for (let dx = -2; dx <= 2; dx++) {
          if (Math.abs(dx) + Math.abs(dz) > 2) continue;
          const x = p.x + dx, z = p.z + dz;
          if (game.hazardField?.remove(x, z)) apagadas.push({ x, z });
        }
      }
      const gelados = game.enemies.filter(e => distancia(e, p) <= 2 && e.type !== 'boss');
      for (const bicho of gelados) bicho.frozen = Math.max(bicho.frozen || 0, 2);
      // Sem brasa e sem bicho por perto nao houve efeito -- nao gasta a recarga.
      if (!apagadas.length && !gelados.length) return false;
      game.apagadasPeloSelo = apagadas;
      return true;
    },
  },
];

export const seloPorId = id => SELOS.find(s => s.id === id) || null;
export const selosDoRamo = ramo => SELOS.filter(s => s.ramo === ramo);

/**
 * O selo esta pronto?
 *
 * A recarga corre so enquanto a fase corre -- ela e congelada junto com tudo o
 * mais nos modais, como a recarga da esquiva ja era.
 */
export function seloPronto(game) {
  return !!game.sigil && game.active && (game.sigilCooldown || 0) <= 0;
}

/**
 * Aciona o selo equipado.
 *
 * Devolve o selo quando ele de fato aconteceu, e null quando nao havia o que
 * fazer. Um selo que nao produziu efeito NAO consome a recarga: gastar vinte
 * segundos porque voce apertou o botao com a arena vazia seria punir o reflexo,
 * nao o erro.
 */
export function acionarSelo(game) {
  if (!seloPronto(game)) return null;
  const selo = seloPorId(game.sigil);
  if (!selo?.usar(game)) return null;
  game.sigilCooldown = selo.recarga;
  return selo;
}
