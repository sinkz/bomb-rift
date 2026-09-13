import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, seededRandom } from '../src/game.js';
import { SELOS, seloPorId, selosDoRamo, acionarSelo } from '../src/sigils.js';
import { normalizeMeta } from '../src/legacy.js';

// A terceira ativa.
//
// Antes dela o jogo tinha vinte e cinco melhorias -- dezesseis habilidades de
// fase e nove talentos permanentes -- e NENHUMA era uma acao. Bomba e esquiva
// eram as unicas coisas que as maos do jogador faziam.
//
// Cada teste aqui existe para provar que o selo FAZ o que a descricao dele diz.
// Um teste que passasse porque o selo nunca aconteceu nao provaria nada.

const arena = (semente = 3) => {
  const g = new Game({ random: seededRandom(semente), meta: { unlockedStage: 18 } });
  g.start(1);
  g.enemies = []; g.pickups = []; g.spawnClock = Infinity; g.hazardClock = Infinity;
  for (let z = 1; z < g.height - 1; z++) for (let x = 1; x < g.width - 1; x++) g.grid[z][x] = 0;
  g.bombs = [];
  g.player.invincible = 0;
  g.player.x = 6; g.player.z = 6;
  g.drainEvents();
  return g;
};
const bicho = (id, x, z, hp = 40) => ({ id, x, z, hp, maxHp: hp, type: 'slime', cooldown: 100, hitFlash: 0, frozen: 0 });
const equipar = (g, id) => { g.sigil = id; g.sigilCooldown = 0; return g; };

test('dois selos por ramo, e os ramos sao os que a arvore ja tinha', () => {
  // Se um selo nascesse fora dos tres ramos existentes, ele viraria uma quarta
  // arvore paralela -- o oposto do pedido, que era dar verbo aos ramos de hoje.
  for (const ramo of ['demolition', 'survival', 'mobility']) {
    assert.equal(selosDoRamo(ramo).length, 2, `o ramo ${ramo} nao tem exatamente dois selos`);
  }
  assert.equal(SELOS.length, 6);
  assert.equal(new Set(SELOS.map(s => s.id)).size, 6, 'ha selos com id repetido');
  for (const selo of SELOS) {
    assert(selo.recarga > 0, `${selo.id} sem recarga`);
    assert(selo.sinergia, `${selo.id} sem sinergia declarada -- e ela que justifica a escolha forcada`);
    assert(Object.keys(selo.custo || {}).length, `${selo.id} sai de graca`);
  }
});

test('so um selo entra na expedicao, e so o que foi comprado', () => {
  const semNada = normalizeMeta({});
  assert.deepEqual(semNada.sigils, []);
  assert.equal(semNada.sigil, null, 'a conta nova ja comeca com um selo equipado');

  // Equipar algo que voce nao comprou nao pode valer.
  const trapaca = normalizeMeta({ sigils: ['fenda'], sigil: 'estouro' });
  assert.equal(trapaca.sigil, null, 'equipou um selo que nao esta na colecao');

  const honesto = normalizeMeta({ sigils: ['fenda', 'inventado'], sigil: 'fenda' });
  assert.deepEqual(honesto.sigils, ['fenda'], 'um id inventado sobreviveu a normalizacao');
  assert.equal(honesto.sigil, 'fenda');
});

test('Estouro detona todas as bombas em campo de uma vez', () => {
  const g = equipar(arena(), 'estouro');
  g.player.capacity = 3;
  for (const [x, z] of [[6, 6], [8, 6], [6, 8]]) { g.player.x = x; g.player.z = z; g.plantBomb(); }
  g.player.x = 6; g.player.z = 6;
  assert.equal(g.bombs.length, 3);
  const alvo = bicho(1, 8, 7);
  g.enemies = [alvo];

  assert(g.useSigil(), 'o Estouro nao acionou');
  assert.equal(g.bombs.length, 0, 'sobrou bomba em campo depois do Estouro');
  assert(alvo.hp < 40, 'o Estouro nao feriu quem estava no alcance');
});

test('Ferrao espera, e estoura quando um inimigo encosta', () => {
  const g = equipar(arena(), 'ferrao');
  assert(g.useSigil(), 'o Ferrao nao acionou');
  const [bomba] = g.bombs;
  assert(bomba?.sting, 'a bomba nasceu sem o gatilho de contato');

  // Com a arena vazia ela NAO estoura: o pavio dela e o inimigo, nao o relogio.
  g.player.x = 1; g.player.z = 1;
  g.tick(1);
  assert.equal(g.bombs.length, 1, 'o Ferrao estourou sozinho, sem ninguem por perto');

  g.enemies = [bicho(1, bomba.x + 1, bomba.z)];
  g.tick(1 / 60);
  assert.equal(g.bombs.length, 0, 'o Ferrao nao estourou com o inimigo encostado');
  assert(g.enemies[0] === undefined || g.enemies[0].hp < 40, 'o Ferrao estourou sem ferir');
});

test('Ancora devolve o escudo e abre uma casa de respiro', () => {
  const g = equipar(arena(), 'ancora');
  g.player.ward = 0;
  const colado = bicho(1, 7, 6);
  g.enemies = [colado];

  assert(g.useSigil(), 'a Ancora nao acionou');
  assert.equal(g.player.ward, 1, 'a Ancora nao devolveu o escudo');
  assert.equal(colado.x, 8, 'a horda nao foi empurrada');

  // Com o escudo em pe ela nao faz nada, e por isso nao gasta a recarga.
  g.sigilCooldown = 0;
  assert(!g.useSigil(), 'a Ancora acionou com o escudo ja em pe');
  assert.equal(g.sigilCooldown, 0, 'gastou recarga sem ter feito nada');
});

test('Sangria cobra vida, e devolve mais quando ha alvo', () => {
  const comAlvo = equipar(arena(), 'sangria');
  comAlvo.player.hp = 100; comAlvo.player.maxHp = 100;
  comAlvo.enemies = [bicho(1, 7, 6, 8), bicho(2, 6, 7, 8)];
  assert(comAlvo.useSigil(), 'a Sangria nao acionou');
  assert(comAlvo.player.hp > 85, `a Sangria com dois alvos saiu no prejuizo: ${comAlvo.player.hp}`);

  // Sem alvo ela e prejuizo puro -- e essa e a aposta, nao um defeito.
  const vazio = equipar(arena(), 'sangria');
  vazio.player.hp = 100; vazio.player.maxHp = 100;
  vazio.enemies = [];
  assert(vazio.useSigil());
  assert.equal(vazio.player.hp, 85, 'a Sangria sem alvo nao cobrou o preco');

  // E nunca pode ser a causa da sua morte.
  const fraco = equipar(arena(), 'sangria');
  fraco.player.hp = 18;
  assert(!fraco.useSigil(), 'a Sangria acionou com vida baixa demais');
  assert.equal(fraco.player.hp, 18);
});

test('Fenda troca de lugar com a bomba mais distante, sem empilhar bombas', () => {
  const g = equipar(arena(), 'fenda');
  g.player.capacity = 2;
  g.player.x = 10; g.player.z = 6; g.plantBomb();
  g.player.x = 6; g.player.z = 6;

  assert(g.useSigil(), 'a Fenda nao acionou');
  assert.deepEqual([g.player.x, g.player.z], [10, 6], 'o jogador nao foi para a bomba');
  assert.deepEqual([g.bombs[0].x, g.bombs[0].z], [6, 6], 'a bomba nao veio para o lugar do jogador');
  assert(g.player.invincible > 0, 'a Fenda chegou sem nenhuma janela de reacao');

  // Em cima de outra bomba a troca empilharia duas na mesma casa.
  const g2 = equipar(arena(), 'fenda');
  g2.player.capacity = 3;
  g2.player.x = 10; g2.player.z = 6; g2.plantBomb();
  g2.player.x = 6; g2.player.z = 6; g2.plantBomb();
  assert(!g2.useSigil(), 'a Fenda trocou estando em cima de outra bomba');
  assert.equal(new Set(g2.bombs.map(b => `${b.x},${b.z}`)).size, g2.bombs.length, 'duas bombas na mesma casa');
});

test('Brasa fria apaga o perigo do chao e congela quem estava nele', () => {
  const g = equipar(arena(), 'brasa-fria');
  const p = g.player;
  for (const [dx, dz] of [[0, 0], [1, 0], [0, 2], [4, 0]]) g.hazardField.add(p.x + dx, p.z + dz, 'lava');
  const dentro = bicho(1, p.x + 1, p.z);
  const fora = bicho(2, p.x + 5, p.z);
  g.enemies = [dentro, fora];

  assert(g.useSigil(), 'a Brasa fria nao acionou');
  assert(!g.hazardField.has(p.x, p.z), 'a brasa na sua propria casa sobreviveu');
  assert(!g.hazardField.has(p.x, p.z + 2), 'a brasa na borda do raio sobreviveu');
  assert(g.hazardField.has(p.x + 4, p.z), 'a Brasa fria apagou alem do raio de 2');
  assert(dentro.frozen > 0, 'quem estava no raio nao congelou');
  assert.equal(fora.frozen, 0, 'congelou quem estava fora do raio');

  // Sem brasa e sem bicho por perto, nada acontece e a recarga fica intacta.
  const seco = equipar(arena(), 'brasa-fria');
  assert(!seco.useSigil(), 'a Brasa fria acionou no vazio');
  assert.equal(seco.sigilCooldown, 0);
});

test('a recarga bloqueia o reuso e corre com a fase, nao com o relogio de parede', () => {
  const g = equipar(arena(), 'estouro');
  g.player.capacity = 3;
  g.plantBomb();
  assert(g.useSigil());
  const selo = seloPorId('estouro');
  assert.equal(g.sigilCooldown, selo.recarga);

  g.plantBomb();
  assert(!g.useSigil(), 'o selo acionou durante a recarga');

  // Congelado num modal, o selo nao recarrega -- mesma regra da esquiva.
  g.openUpgrade();
  const parado = g.sigilCooldown;
  g.tick(5);
  assert.equal(g.sigilCooldown, parado, 'a recarga andou com o jogo parado');

  g.chooseSkill(g.offers[0].id);
  g.tick(selo.recarga);
  assert.equal(g.sigilCooldown, 0, 'a recarga nao zerou depois do tempo dela');
  assert(g.sigilReady, 'o selo nao ficou pronto');
});

test('sem selo equipado o jogo continua com duas ativas, e nada quebra', () => {
  const g = arena();
  assert.equal(g.sigil, null);
  assert(!g.sigilReady);
  assert(!g.useSigil(), 'acionou um selo que nao existe');
  assert.equal(acionarSelo(g), null);
  // O tique tem de seguir normal, sem selo e sem recarga.
  g.tick(1);
  assert.equal(g.sigilCooldown, 0);
});

test('o selo se anuncia, para o HUD e o som poderem reagir', () => {
  const g = equipar(arena(), 'fenda');
  g.player.capacity = 2;
  g.player.x = 10; g.player.z = 6; g.plantBomb();
  g.player.x = 6; g.player.z = 6;
  g.drainEvents();

  assert(g.useSigil());
  const [aviso] = g.drainEvents().filter(e => e.type === 'sigil');
  assert(aviso, 'o selo aconteceu sem avisar ninguem');
  assert.equal(aviso.id, 'fenda');
  assert.equal(aviso.recarga, seloPorId('fenda').recarga);
  assert(aviso.color, 'o aviso do selo veio sem cor');
});

test('a armadilha do Ferrao espera parada, mas devolve a vaga', async () => {
  // "Ela espera" tem de ser verdade: com o pavio normal de ~2s ela estouraria
  // sozinha antes de qualquer inimigo chegar, e a descricao seria mentira.
  // Eterna tambem nao serve -- com capacidade 2, uma armadilha no canto errado
  // levaria metade do arsenal pelo resto da fase.
  const { ESPERA_DO_FERRAO } = await import('../src/sigils.js');
  const g = equipar(arena(), 'ferrao');
  g.player.capacity = 3;
  assert(g.useSigil());
  const [armadilha] = g.bombs;
  assert.equal(armadilha.fuse, ESPERA_DO_FERRAO, 'a armadilha nasceu com pavio de bomba comum');

  g.player.x = 1; g.player.z = 1; g.enemies = [];
  g.tick(ESPERA_DO_FERRAO - 1);
  assert.equal(g.bombs.length, 1, 'a armadilha nao esperou o tempo prometido');
  g.tick(1.2);
  assert.equal(g.bombs.length, 0, 'a armadilha ficou de pe para sempre e comeu uma vaga');
});
