import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game } from '../src/game.js';
import { SKILLS, MASTERY_LEVEL } from '../src/skills.js';
import { ASSINATURAS, criarMasteryFX } from '../src/mastery-fx.js';

// Relatado pelo dono depois de jogar: "nao sinto que a maestria muda muito,
// parece que continua vindo as habilidades depois que atinjo o maximo, nao tem
// efeitos novos... algo que eu fale ual".
//
// A primeira metade da frase era um defeito estrutural: 'power' ia ate o nivel 8
// e 'health' ate 6, mas o despertar dispara no 5. Voce recebia a mensagem de
// climax e a MESMA carta voltava na oferta seguinte valendo +1 comum.
//
// A segunda metade era de leitura: as quinze maestrias funcionam -- isto e
// medido abaixo -- mas catorze so mexiam em numeros invisiveis, e a aura aos pes
// do jogador era dourada FIXA para todas.
//
// Os testes deste arquivo existem para que nenhuma maestria futura possa nascer
// sem teto, sem efeito ou sem cara.

const comMaestria = SKILLS.filter(s => s.mastery);
const fonte = ['game.js', 'scene.js'].map(f => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8')).join('\n');

/** Sobe uma habilidade ate quatro e faz a quinta escolha pelo caminho real. */
function despertar(id) {
  const g = new Game({ seed: 5, meta: { unlockedStage: 18 } });
  g.start(1);
  g.skillLevels[id] = MASTERY_LEVEL - 1;
  g.phase = 'playing';
  g.pendingLevels = 1;
  g.openUpgrade();
  g.offers = [SKILLS.find(s => s.id === id)];
  g.drainEvents();
  const antes = { ...g.player };
  g.chooseSkill(id);
  return { g, antes, depois: g.player, eventos: g.drainEvents() };
}

test('o despertar e o teto: nenhuma habilidade com maestria continua sendo oferecida depois dele', () => {
  // Este e o defeito que o dono descreveu com as palavras dele. Um `max` acima
  // de MASTERY_LEVEL transforma o climax em mais uma carta da pilha.
  for (const skill of comMaestria) {
    assert.equal(skill.max, MASTERY_LEVEL,
      `${skill.id} desperta em ${MASTERY_LEVEL} mas vai ate ${skill.max} -- ela reaparece na oferta depois do despertar`);
  }
});

test('a quinta escolha desperta, uma vez so, e a habilidade sai da oferta', () => {
  for (const skill of comMaestria) {
    const { g, eventos } = despertar(skill.id);
    assert(g.masteries.includes(skill.id), `${skill.id} nao despertou na quinta escolha`);
    assert.equal(eventos.filter(e => e.type === 'mastery').length, 1, `${skill.id} despertou mais de uma vez`);
    // rollOffers filtra por `< max`, entao o teto acima ja garante isto -- mas a
    // garantia fica explicita aqui, que e onde ela importa para quem joga.
    g.rollOffers();
    assert(!g.offers.some(o => o.id === skill.id), `${skill.id} voltou a ser oferecida depois de despertar`);
  }
});

test('nenhuma maestria e muda: toda uma muda o estado do jogador ou e lida em tempo de jogo', () => {
  // Eu mesmo acusei cinco maestrias de inertes procurando so por
  // `masteries.includes(id)`. Estava errado: metade delas aplica o efeito UMA
  // VEZ no proprio despertar, como mudanca de atributo. Este teste cobre os dois
  // caminhos para a proxima pessoa nao repetir o erro -- nem o contrario dele.
  const mudos = [];
  for (const skill of comMaestria) {
    const { antes, depois } = despertar(skill.id);
    const mudouEstado = Object.keys(depois).some(k => antes[k] !== depois[k]);
    const lidoEmJogo = fonte.includes(`masteries.includes('${skill.id}')`)
      || new RegExp(`skillLevels\\.${skill.id}[^;]*`).test(fonte) && fonte.includes('>= 5');
    if (!mudouEstado && !lidoEmJogo) mudos.push(skill.id);
  }
  assert.deepEqual(mudos, [], `maestrias que prometem e nao entregam: ${mudos.join(', ')}`);
});

test('toda maestria tem assinatura visual propria', () => {
  // O anel dourado era o mesmo para as quinze: despertar o Zero absoluto (gelo)
  // e a Supernova (fogo) deixava voce visualmente identico.
  for (const skill of comMaestria) {
    const assinatura = ASSINATURAS[skill.id];
    assert(assinatura, `${skill.id} (${skill.mastery}) nao tem assinatura visual`);
    assert.equal(typeof assinatura.cor, 'number', `${skill.id} tem assinatura sem cor`);
  }
});

test('as assinaturas nao se repetem entre ramos diferentes', () => {
  // Duas maestrias da mesma familia podem compartilhar cor de proposito
  // (magnet e speed sao ambas do ramo verde). Duas de familias diferentes
  // compartilhando cor seria o problema antigo de volta, em escala menor.
  const porCor = new Map();
  for (const skill of comMaestria) {
    const cor = ASSINATURAS[skill.id].cor;
    const ramos = porCor.get(cor) || new Set();
    ramos.add(skill.branch);
    porCor.set(cor, ramos);
  }
  for (const [cor, ramos] of porCor) {
    assert(ramos.size === 1, `a cor ${cor.toString(16)} serve a ramos diferentes: ${[...ramos].join(', ')}`);
  }
});

/** Uma cena de mentira: registra o que foi desenhado, sem Three.js. */
function cenaFalsa(game) {
  const desenhos = [];
  return {
    game, time: 0, reducedMotion: false, quality: true,
    scene: { add() {}, remove() {} },
    playerMesh: { position: { x: 0, z: 0 } },
    burst(...a) { desenhos.push(['burst', ...a]); },
    pulse(...a) { desenhos.push(['pulse', ...a]); },
    impactLight(...a) { desenhos.push(['impactLight', ...a]); },
    later(_, fn) { fn(); },
    desenhos,
  };
}

test('o modulo desenha a assinatura no evento que a maestria promete', () => {
  // A prova que interessa nao e "existe uma tabela" -- e "o efeito acontece
  // quando o jogador faz a coisa". Para cada maestria com decoracao de evento,
  // emitir aquele evento SEM a maestria nao pode desenhar nada, e emitir COM a
  // maestria tem de desenhar.
  const exemplos = {
    explosion: { type: 'explosion', x: 5, z: 5, cells: [] },
    bomb: { type: 'bomb', x: 5, z: 5 },
    dash: { type: 'dash', x: 7, z: 5, fromX: 5, fromZ: 5 },
    kill: { type: 'kill', x: 5, z: 5 },
    pickup: { type: 'pickup', x: 6, z: 5 },
    blocked: { type: 'blocked', x: 5, z: 5 },
    comet: { type: 'comet', x: 5, z: 5, cells: [] },
    hurt: { type: 'hurt', x: 5, z: 5 },
  };

  for (const skill of comMaestria) {
    const ao = ASSINATURAS[skill.id].ao;
    if (!ao) continue;
    for (const tipo of Object.keys(ao)) {
      const evento = exemplos[tipo];
      assert(evento, `a assinatura de ${skill.id} decora '${tipo}', que nao esta na amostra do teste`);

      const g = new Game({ seed: 9, meta: { unlockedStage: 18 } });
      g.start(1);
      // Condicoes que algumas assinaturas exigem para valer a pena desenhar.
      g.player.hp = g.player.maxHp;
      g.bombs = [{ id: 1, x: 5, z: 5 }];
      g.player.capacity = 1;

      const fx = criarMasteryFX();
      const cena = cenaFalsa(g);

      fx.handle(cena, { type: 'arena' });
      fx.handle(cena, evento);
      assert.equal(cena.desenhos.length, 0,
        `${skill.id} desenhou em '${tipo}' sem ter despertado`);

      fx.handle(cena, { type: 'mastery', id: skill.id, color: skill.color, x: 5, z: 5 });
      cena.desenhos.length = 0;
      fx.handle(cena, evento);
      assert(cena.desenhos.length > 0,
        `${skill.id} despertou mas nao desenhou nada em '${tipo}'`);
    }
  }
});

test('a aura reinicia junto com a build, que dura so uma fase', () => {
  // reset() zera skillLevels e masteries a cada fase. Uma aura que sobrevivesse
  // mostraria um poder que voce nao tem mais.
  const g = new Game({ seed: 4, meta: { unlockedStage: 18 } });
  g.start(1);
  const fx = criarMasteryFX();
  const cena = cenaFalsa(g);

  fx.handle(cena, { type: 'mastery', id: 'frost', color: '#8bdfff', x: 3, z: 3 });
  cena.desenhos.length = 0;
  fx.frame(cena, 1 / 60);
  const comMaestriaDesenhou = cena.desenhos.length;

  fx.handle(cena, { type: 'arena' });
  cena.desenhos.length = 0;
  fx.frame(cena, 1 / 60);

  assert(comMaestriaDesenhou > 0, 'a maestria nao desenhou nada em quadro');
  assert.equal(cena.desenhos.length, 0, 'a aura sobreviveu a troca de fase');
});
