import test from 'node:test';
import assert from 'node:assert/strict';
import { HazardDirector, directorFor, CICLO, ASSINATURA, REGIOES_POR_ATO } from '../src/hazard-cycle.js';
import { HazardField, temRefugio } from '../src/hazards.js';
import { WORLDS } from '../src/campaign.js';

const arena = (width = 17, height = 15) => ({
  width, height,
  tile: (x, z) => (x < 1 || z < 1 || x >= width - 1 || z >= height - 1) ? 1 : 0,
  blocked: new Set(),
  random: (() => { let s = 7; return () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648; })(),
  player: { x: 3, z: 3 },
  ato: 1,
});

// Roda o diretor por N segundos em passos de 1/60 e junta tudo que aconteceu.
const correr = (dir, ctx, segundos) => {
  const eventos = [];
  for (let i = 0; i < segundos * 60; i++) eventos.push(...dir.update(1 / 60, ctx));
  return eventos;
};

test('todo mundo tem assinatura, e toda assinatura e uma forma conhecida', () => {
  for (const mundo of WORLDS) {
    assert(ASSINATURA[mundo.id], `mundo ${mundo.id} sem assinatura`);
    assert(['mancha', 'borda', 'veia'].includes(ASSINATURA[mundo.id]));
    assert(directorFor(mundo, new HazardField()), `mundo ${mundo.id} sem diretor`);
  }
});

test('nada fere antes do aviso -- a emenda ao I2', () => {
  const ctx = arena();
  const dir = directorFor(WORLDS[0], new HazardField());
  const eventos = correr(dir, ctx, 3);

  const primeiroAviso = eventos.findIndex(e => e.tipo === 'aviso');
  const primeiroDano = eventos.findIndex(e => e.tipo === 'bate');
  assert(primeiroAviso >= 0, 'nenhuma regiao foi anunciada');
  assert(primeiroDano === -1 || primeiroAviso < primeiroDano, 'bateu antes de avisar');

  // E o aviso dura o que promete: nenhuma casa fere durante a janela.
  const dir2 = directorFor(WORLDS[0], new HazardField());
  const ctx2 = arena();
  correr(dir2, ctx2, CICLO.aviso - .1);
  assert.equal(dir2.acesas.length, 0, 'havia casa acesa ainda dentro do aviso');
});

test('a regiao percorre o ciclo inteiro, na ordem, e devolve o chao', () => {
  const ctx = arena();
  const dir = directorFor(WORLDS[0], new HazardField());
  const vistos = correr(dir, ctx, CICLO.aviso + CICLO.acesa + CICLO.esfriando + .2)
    .map(e => e.tipo).filter(t => t !== 'bate');

  assert.equal(vistos[0], 'aviso');
  assert(vistos.includes('acendeu'), 'nunca acendeu');
  assert(vistos.includes('esfriou'), 'nunca esfriou');
  assert(vistos.indexOf('acendeu') < vistos.indexOf('esfriou'));
  // Esfriar ja devolve o chao: o campo fica limpo antes de a marca sumir.
  assert.equal(dir.field.size, 0, 'o chao nao foi devolvido ao esfriar');
});

test('o numero de regioes acesas segue o ato do guardiao, e nunca passa dele', () => {
  // Medido ao longo de uma janela, nao num instante: as regioes sao defasadas
  // de proposito, entao ha momentos com menos de alvo no ar.
  for (const [ato, esperado] of [[1, 1], [2, 2], [3, 3]]) {
    const ctx = { ...arena(), ato };
    const dir = directorFor(WORLDS[1], new HazardField());
    let pico = 0;
    for (let i = 0; i < 30 * 60; i++) {
      dir.update(1 / 60, ctx);
      const vivas = dir.regioes.filter(r => r.estado === 'aviso' || r.estado === 'acesa').length;
      pico = Math.max(pico, vivas);
      assert(vivas <= esperado, `ato ${ato} passou do teto: ${vivas} > ${esperado}`);
    }
    assert.equal(pico, esperado, `ato ${ato} nunca chegou a ${esperado} regiao(oes), so a ${pico}`);
  }
});

test('a pressao e continua: nunca ha tregua longa sem nada no ar', () => {
  // O defeito que a defasagem conserta: regioes irmas nascendo no mesmo quadro
  // apagam no mesmo quadro, e a arena fica limpa por segundos.
  const ctx = { ...arena(), ato: 3 };
  const dir = directorFor(WORLDS[1], new HazardField());
  let vazioSeguido = 0, piorTregua = 0;
  for (let i = 0; i < 40 * 60; i++) {
    dir.update(1 / 60, ctx);
    const arde = dir.acesas.length > 0;
    vazioSeguido = arde ? 0 : vazioSeguido + 1 / 60;
    piorTregua = Math.max(piorTregua, vazioSeguido);
  }
  assert(piorTregua < 3, `arena ficou ${piorTregua.toFixed(1)}s sem nenhum perigo aceso`);
});

test('nunca acende sob os pes do jogador nem nas quatro vizinhas', () => {
  for (const mundo of WORLDS) {
    const ctx = { ...arena(), ato: 3 };
    const dir = directorFor(mundo, new HazardField());
    const eventos = correr(dir, ctx, 30);
    const p = ctx.player;
    const proibidas = new Set([[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dz]) => `${p.x + dx},${p.z + dz}`));
    for (const e of eventos) {
      for (const c of e.cells) {
        assert(!proibidas.has(`${c.x},${c.z}`), `${mundo.id}: ${e.tipo} caiu em cima do jogador`);
      }
    }
  }
});

test('sempre sobra refugio, e o degrau de socorro nunca precisa disparar', () => {
  // 30s com tres regioes e o pior caso que o jogo produz. Se o orcamento
  // estiver certo, o encolhimento de emergencia fica em zero.
  for (const mundo of WORLDS) {
    const ctx = { ...arena(), ato: 3 };
    const dir = directorFor(mundo, new HazardField());
    for (let i = 0; i < 30 * 60; i++) {
      dir.update(1 / 60, ctx);
      assert(temRefugio(ctx, dir.field, ctx.player), `${mundo.id}: jogador sem refugio a pe`);
    }
    assert.equal(dir.socorros, 0, `${mundo.id}: o socorro disparou ${dir.socorros}x -- orcamento errado`);
  }
});

test('o perigo nunca passa do orcamento de chao', () => {
  const ctx = { ...arena(), ato: 3 };
  const dir = directorFor(WORLDS[2], new HazardField());
  const livres = (ctx.width - 2) * (ctx.height - 2);
  let pico = 0;
  for (let i = 0; i < 40 * 60; i++) { dir.update(1 / 60, ctx); pico = Math.max(pico, dir.field.size); }
  assert(pico > 0, 'nunca acendeu nada');
  assert(pico / livres <= .22, `pico de ${(pico / livres * 100).toFixed(0)}% do chao e demais`);
});

test('limpar apaga regioes e campo de uma vez', () => {
  const ctx = { ...arena(), ato: 3 };
  const dir = directorFor(WORLDS[0], new HazardField());
  correr(dir, ctx, 4);
  dir.limpar();
  assert.equal(dir.regioes.length, 0);
  assert.equal(dir.field.size, 0);
});

test('mundo sem perigo autorado devolve diretor nulo em vez de quebrar', () => {
  assert.equal(directorFor({ id: 'inexistente' }, new HazardField()), null);
  const mudo = new HazardDirector({ kind: null });
  assert.equal(mudo.ativo, false);
  assert.deepEqual(mudo.update(1, arena()), []);
});
