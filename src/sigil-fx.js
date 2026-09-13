// O desenho dos selos.
//
// Separado de src/sigils.js de proposito, pela mesma divisao que ja vale no
// resto do projeto: o sigils.js decide O QUE acontece com o jogo e nao conhece
// Three.js; este decide como aquilo se parece e nao conhece a regra.
//
// Uma ativa precisa de retorno imediato mais do que qualquer passiva. A bomba
// tem pavio e estouro, a esquiva tem o borrao -- um terceiro botao sem resposta
// visual seria indistinguivel de um botao quebrado.

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

/** Uma batida por selo. Recebe a cena e o evento; nada mais. */
const BATIDAS = {
  // As bombas ja estouram sozinhas. O que falta e dizer que foi VOCE: a onda
  // parte de voce, nao das bombas.
  estouro(cena, e) {
    for (const [i, tamanho] of [2.2, 3.6, 5].entries()) {
      cena.pulse(e.x, e.z, e.color, tamanho, .5, i * .06);
    }
    cena.impactLight(e.x, e.z, e.color, 30, 9, 1.3);
    cena.hit(.05);
  },

  // A bomba fica esperando. Sem marca ela e indistinguivel de uma bomba comum
  // com pavio longo -- e o jogador precisa saber que aquela casa e uma armadilha.
  ferrao(cena, e) {
    cena.pulse(e.x, e.z, e.color, 1.6, .7);
    cena.burst(e.x, e.z, e.color, 12, 1.4, { geo: 'crystal', size: 1, gravity: -1.2, lift: .5, y: .4, spread: .3 });
  },

  // O domo. Sobe, fecha, e as quatro direcoes recebem o empurrao.
  ancora(cena, e) {
    cena.pulse(e.x, e.z, e.color, 3.2, .6, 0, true);
    cena.burst(e.x, e.z, e.color, 20, 1.6, { geo: 'sphere', size: 1.6, gravity: -2, lift: .8, y: .5, spread: .4 });
    for (const [dx, dz] of DIRS) {
      cena.burst(e.x + dx, e.z + dz, e.color, 4, 2.4, { geo: 'round', size: .9, gravity: 2, lift: .3, y: .35 });
    }
  },

  // A unica que cobra. O carmesim sai de voce e corre pela cruz -- o preco e o
  // alcance na mesma leitura.
  sangria(cena, e) {
    cena.burst(e.x, e.z, e.color, 18, 2.2, { geo: 'round', size: 1.3, gravity: -1.6, lift: .9, y: .6, spread: .3 });
    for (const [dx, dz] of DIRS) {
      for (let i = 1; i <= 3; i++) {
        cena.burst(e.x + dx * i, e.z + dz * i, e.color, 3, .8,
          { geo: 'crystal', size: 1, gravity: .8, lift: .3, y: .45, spread: .25 });
      }
    }
    cena.impactLight(e.x, e.z, e.color, 26, 7, 1.1);
  },

  // Duas pontas, uma so fenda. O evento chega com voce ja no destino, entao o
  // que sobra e marcar de onde voce saiu -- e o rastro tem de nascer nas duas.
  fenda(cena, e) {
    cena.pulse(e.x, e.z, e.color, 2.6, .45, 0, true);
    cena.burst(e.x, e.z, e.color, 22, 2.8, { geo: 'crystal', size: 1.2, lift: 1, spread: .4 });
    cena.impactLight(e.x, e.z, e.color, 28, 8, 1.2);
  },

  // O inverso do perigo: em vez de acender o chao, apaga. Uma flor de gelo em
  // cada casa que deixou de queimar, para a leitura ser casa a casa.
  'brasa-fria'(cena, e) {
    cena.pulse(e.x, e.z, e.color, 4.4, .8, 0, true);
    cena.burst(e.x, e.z, e.color, 16, 1.2, { geo: 'box', size: 1.2, gravity: .4, lift: .3, y: .3, spread: .5 });
    for (const celula of e.cells || []) {
      cena.burst(celula.x, celula.z, 0xdff4ff, 5, .7, { geo: 'box', size: 1, gravity: .3, lift: .2, y: .12, spread: .4 });
    }
  },
};

export function criarSigilFX() {
  let pisca = 0;
  return {
    // A armadilha do Ferrao fica parada no chao e, sem marca, e indistinguivel
    // de uma bomba comum com pavio longo -- o jogador acha que esqueceu uma
    // bomba ali. Pior: ela ocupa uma vaga, entao ele precisa saber que a vaga
    // esta ocupada por uma escolha, nao por descuido.
    frame(cena, dt) {
      const armadilhas = (cena.game?.bombs || []).filter(b => b.sting);
      if (!armadilhas.length || cena.reducedMotion) return;
      pisca -= dt;
      if (pisca > 0) return;
      pisca = .32;
      for (const b of armadilhas) {
        cena.burst(b.x, b.z, 0xffb066, 2, .45, { geo: 'crystal', size: .85, gravity: -1.4, lift: .35, y: .55, spread: .45 });
      }
    },

    handle(cena, evento) {
      if (evento.type !== 'sigil') return;
      const batida = BATIDAS[evento.id];
      if (!batida) return;
      // Em prefers-reduced-motion o selo ainda precisa CONFIRMAR que aconteceu,
      // senao o botao parece quebrado. Sobra o anel, sai o resto.
      if (cena.reducedMotion) { cena.pulse(evento.x, evento.z, evento.color, 2.4, .4); return; }
      batida(cena, evento);
    },
  };
}
