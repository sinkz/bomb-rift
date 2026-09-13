import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, seededRandom } from '../src/game.js';
import { ESCOLHA_DO_JURAMENTO, NIVEL_JURADO, NIVEL_LIVRE, despertaEm, tetoDe, momentoDeJurar } from '../src/oath.js';
import { SKILLS } from '../src/skills.js';

// A prova que interessa nao e "existe um juramento" -- e que ele MUDA o
// resultado de quem se compromete sem virar brinde para quem nao se compromete.
//
// Medido com semente fixa, 60 partidas por celula:
//
//   atalho so para quem honra            honra 83%   nao honra  7%   <- o desenho
//   atalho por ter jurado, mesmo traindo honra 83%   nao honra 27%   <- brinde
//
// A segunda linha e a razao de o atalho exigir fidelidade perfeita: o juramento
// e feito automaticamente na segunda escolha, entao concede-lo so por existir
// quadruplica os despertares de quem nunca se comprometeu -- e nao devolve nada
// a quem se compromete.
//
// Nota de metodo, aprendida errando aqui: o construtor do Game aceita 'random',
// NAO 'seed'. Passar { seed } e silenciosamente ignorado e a partida roda em
// Math.random -- as primeiras medicoes deste trabalho foram feitas assim e nao
// eram reproduziveis. Toda bancada daqui em diante usa seededRandom.

/** Um piloto que persegue cristais -- o unico jeito honesto de gerar level-ups. */
function expedicao(semente, honra) {
  const g = new Game({ random: seededRandom(semente), meta: { unlockedStage: 18 } });
  g.start(1);
  // Invencivel de proposito: a pergunta e sobre a economia de escolhas, e morrer
  // no meio mediria a competencia do bot em vez da regra.
  g.player.invincible = 1e9;
  for (let i = 0; i < 150 * 60 && g.phase !== 'dead'; i++) {
    if (g.phase === 'upgrade') {
      const jurada = honra && g.oath && g.offers.find(o => o.id === g.oath);
      const escolha = jurada || g.offers[honra ? 0 : Math.floor(g.random() * g.offers.length)];
      g.chooseSkill(escolha.id);
      continue;
    }
    if (!g.active) break;
    const p = g.player;
    const alvo = g.pickups.slice()
      .sort((a, b) => (Math.abs(a.x - p.x) + Math.abs(a.z - p.z)) - (Math.abs(b.x - p.x) + Math.abs(b.z - p.z)))[0];
    if (alvo) {
      const dx = Math.sign(alvo.x - p.x), dz = Math.sign(alvo.z - p.z);
      if (dx && g.walkable(p.x + dx, p.z, p)) g.move(dx, 0);
      else if (dz && g.walkable(p.x, p.z + dz, p)) g.move(0, dz);
      else g.move(dx || 1, 0);
    } else {
      const d = [[1, 0], [0, 1], [-1, 0], [0, -1]][(i >> 4) % 4];
      g.move(d[0], d[1]);
    }
    if (i % 14 === 0) g.plantBomb();
    g.tick(1 / 60);
  }
  return g;
}

test('honrar o juramento desperta a maestria; nao honrar quase nunca desperta', () => {
  const N = 24;
  let fiel = 0, infiel = 0;
  for (let s = 1; s <= N; s++) if (expedicao(s * 17, true).masteries.length) fiel++;
  for (let s = 1; s <= N; s++) if (expedicao(s * 17, false).masteries.length) infiel++;

  // Os limites sao o CONTRATO, nao o valor medido: 83% e 7% na bancada de 60
  // partidas, e a folga ate estas bordas existe para o teste nao virar refem de
  // um punhado de sementes. O alvo nunca foi "todo mundo desperta" -- e "quem se
  // compromete e recompensado, quem nao se compromete continua de fora".
  assert(fiel >= N * .6, `piloto fiel despertou so ${fiel}/${N} -- o compromisso nao esta pagando`);
  assert(infiel <= N * .3, `piloto infiel despertou ${infiel}/${N} -- o despertar virou brinde`);
  assert(fiel >= infiel * 2.5, `separacao fraca: fiel ${fiel} contra infiel ${infiel}`);
});

test('o juramento e feito na segunda escolha, e so por habilidade com despertar', () => {
  const g = new Game({ random: seededRandom(3), meta: { unlockedStage: 18 } });
  g.start(1);
  assert.equal(g.oath, null, 'a fase comecou com juramento');

  const jurar = id => {
    assert(g.openUpgrade());
    g.offers = [SKILLS.find(s => s.id === id)];
    g.chooseSkill(id);
  };

  jurar('power');
  assert.equal(g.oath, null, 'jurou ja na primeira escolha');
  assert(momentoDeJurar(g), 'a segunda escolha nao se anunciou como o juramento');
  jurar('frost');
  assert.equal(g.oath, 'frost', `o juramento nao foi feito na escolha ${ESCOLHA_DO_JURAMENTO}`);
  assert(!momentoDeJurar(g), 'o momento do juramento continuou aberto depois de jurar');
});

test('um consumivel nao pode ser jurado, e a fase segue sem juramento', () => {
  // 'heal' nao tem despertar: jurar a ele seria um compromisso sem premio.
  const g = new Game({ random: seededRandom(8), meta: { unlockedStage: 18 } });
  g.start(1);
  g.player.hp = 10;
  for (const id of ['power', 'heal']) {
    assert(g.openUpgrade());
    g.offers = [SKILLS.find(s => s.id === id)];
    g.chooseSkill(id);
  }
  assert.equal(g.oath, null, 'um consumivel virou juramento');
  assert.equal(despertaEm(g, 'power'), NIVEL_LIVRE);
});

test('o teto acompanha o limiar nos dois casos', () => {
  // Se o teto ficasse fixo em cinco, a jurada despertaria no quarto e VOLTARIA
  // a ser oferecida -- que e exatamente a queixa que originou este trabalho.
  const g = new Game({ random: seededRandom(11), meta: { unlockedStage: 18 } });
  g.start(1);
  const frost = SKILLS.find(s => s.id === 'frost');

  assert.equal(tetoDe(g, frost), NIVEL_LIVRE);
  g.oath = 'frost';
  assert.equal(tetoDe(g, frost), NIVEL_JURADO);
  assert.equal(despertaEm(g, 'frost'), NIVEL_JURADO);
  g.oathBroken = true;
  assert.equal(tetoDe(g, frost), NIVEL_LIVRE, 'trair o juramento nao devolveu o teto cheio');

  // Consumivel nao tem despertar, entao o teto continua sendo o do catalogo.
  const heal = SKILLS.find(s => s.id === 'heal');
  assert.equal(tetoDe(g, heal), heal.max);
});

test('cumprir o juramento nao conta como trair', () => {
  // Depois do despertar a jurada sai do catalogo, entao toda escolha seguinte e
  // "outra coisa". Marcar isso como traicao deixaria o estado mentindo para a
  // interface, que usa a mesma bandeira para escrever JURADA no cartao.
  const g = new Game({ random: seededRandom(5), meta: { unlockedStage: 18 } });
  g.start(1);
  const escolher = id => { assert(g.openUpgrade()); g.offers = [SKILLS.find(s => s.id === id)]; g.chooseSkill(id); };

  for (let i = 0; i < 4; i++) escolher('frost');
  assert.equal(g.oath, 'frost');
  assert.deepEqual(g.masteries, ['frost'], 'nao despertou na quarta honrando');
  assert(!g.oathBroken);

  escolher('power');
  assert(!g.oathBroken, 'escolher outra coisa DEPOIS de cumprir contou como traicao');
});
