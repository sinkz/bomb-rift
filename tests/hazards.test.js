import test from 'node:test';
import assert from 'node:assert/strict';
import { HazardField, HAZARD_RULES, HAZARD_BY_BIOME, hazardKindFor, planHazards, temRefugio } from '../src/hazards.js';
import { WORLDS } from '../src/campaign.js';

// Arena de teste: chao livre no miolo, parede na borda. Sem Game, sem cena --
// e o ponto do modulo ser puro.
const arena = (width = 15, height = 13, paredes = []) => {
  const bloqueadas = new Set(paredes.map(([x, z]) => `${x},${z}`));
  return {
    width, height,
    tile: (x, z) => (x < 1 || z < 1 || x >= width - 1 || z >= height - 1 || bloqueadas.has(`${x},${z}`)) ? 1 : 0,
    blocked: new Set(),
    random: () => 0.5,
  };
};

test('todo mundo tem um perigo, e todo perigo tem regra', () => {
  for (const mundo of WORLDS) {
    const kind = hazardKindFor(mundo);
    assert(kind, `mundo ${mundo.id} sem perigo declarado`);
    assert(HAZARD_RULES[kind], `perigo ${kind} sem regra`);
  }
  for (const kind of Object.values(HAZARD_BY_BIOME)) assert(HAZARD_RULES[kind]);
});

test('o campo guarda, responde e esquece casas', () => {
  const campo = new HazardField();
  assert.equal(campo.size, 0);
  assert.equal(campo.vazio, true);

  assert(campo.add(4, 5, 'lava'));
  assert.equal(campo.has(4, 5), true);
  assert.equal(campo.has(5, 4), false, 'x e z nao podem se confundir');
  assert.equal(campo.get(4, 5).kind, 'lava');
  assert.equal(campo.get(4, 5).regra.damage, HAZARD_RULES.lava.damage);

  assert.equal(campo.add(1, 1, 'nao-existe'), null, 'tipo desconhecido nao pode virar casa');
  assert.equal(campo.size, 1);

  campo.remove(4, 5);
  assert.equal(campo.has(4, 5), false);
  campo.add(2, 2, 'gelo');
  campo.clear();
  assert.equal(campo.size, 0);
});

test('o campo conta o tempo de cada casa e avisa quando ela bate', () => {
  const campo = new HazardField();
  campo.add(3, 3, 'lava');   // tick .55
  campo.add(7, 7, 'gelo');   // tick .9

  assert.deepEqual(campo.tick(0.3), [], 'ninguem bate antes da hora');
  const primeira = campo.tick(0.3);
  assert.deepEqual(primeira.map(c => c.kind), ['lava'], 'lava bate primeiro, tem tick menor');
  const segunda = campo.tick(0.35);
  assert.deepEqual(segunda.map(c => c.kind), ['gelo']);
  // O relogio da casa reinicia, senao ela bateria todo quadro depois da primeira vez.
  assert.equal(campo.get(3, 3).idade < HAZARD_RULES.lava.tick, true);
});

test('o gelo prende em vez de ferir, e e o unico assim', () => {
  assert.equal(HAZARD_RULES.gelo.damage, 0);
  assert.equal(HAZARD_RULES.gelo.effect, 'snare');
  for (const [kind, regra] of Object.entries(HAZARD_RULES)) {
    if (kind === 'gelo') continue;
    assert(regra.damage > 0, `${kind} deveria ferir`);
    assert.equal(regra.effect, null, `${kind} nao deveria prender`);
  }
});

test('o planejador respeita orcamento, bordas e casas proibidas', () => {
  const ctx = arena();
  const proibidas = [[5, 5], [6, 5], [5, 6]];
  ctx.blocked = new Set(proibidas.map(([x, z]) => `${x},${z}`));

  for (const forma of ['mancha', 'borda', 'veia']) {
    const plano = planHazards(ctx, { forma, orcamento: 0.2 });
    assert(plano.length > 0, `forma ${forma} nao planejou nada`);

    const livres = (ctx.width - 2) * (ctx.height - 2);
    assert(plano.length <= Math.floor(livres * 0.2), `forma ${forma} estourou o orcamento`);

    for (const c of plano) {
      assert.equal(ctx.tile(c.x, c.z), 0, `${forma} pos perigo em parede`);
      assert(!ctx.blocked.has(`${c.x},${c.z}`), `${forma} pos perigo em casa proibida`);
    }
  }
});

test('o planejador e puro: mesma entrada, mesma saida', () => {
  const a = planHazards(arena(), { forma: 'mancha' });
  const b = planHazards(arena(), { forma: 'mancha' });
  assert.deepEqual(a, b);
});

test('temRefugio enxerga a casa limpa a pe, e acusa quando nao ha nenhuma', () => {
  const ctx = arena(9, 9);
  const campo = new HazardField();
  const jogador = { x: 4, z: 4 };

  assert.equal(temRefugio(ctx, campo, jogador), true, 'campo vazio e todo refugio');

  // Afoga tudo que o jogador alcanca em quatro passos.
  for (let z = 1; z < 8; z++) for (let x = 1; x < 8; x++) campo.add(x, z, 'lava');
  assert.equal(temRefugio(ctx, campo, jogador), false, 'arena afogada nao tem refugio');

  // Uma unica casa limpa a tres passos ja basta.
  campo.remove(4, 1);
  assert.equal(temRefugio(ctx, campo, jogador), true);

  // Mas nao se ela estiver longe demais para o orcamento de passos.
  campo.add(4, 1, 'lava');
  campo.remove(1, 1);
  assert.equal(temRefugio(ctx, campo, jogador, 2), false, 'refugio fora do alcance nao conta');
  assert.equal(temRefugio(ctx, campo, jogador, 6), true, 'com mais passos, alcanca');
});

test('perigo nunca e terreno: o planejador so devolve casas de chao', () => {
  // Se perigo virasse tile, walkable() leria lava como parede e o flood fill
  // dos testes de campanha comecaria a reprovar arenas validas.
  const paredes = [[3, 3], [4, 3], [5, 3]];
  const ctx = arena(15, 13, paredes);
  for (const forma of ['mancha', 'borda', 'veia']) {
    for (const c of planHazards(ctx, { forma, orcamento: 0.4 })) {
      assert.equal(ctx.tile(c.x, c.z), 0);
    }
  }
});
