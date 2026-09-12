import test from 'node:test';
import assert from 'node:assert/strict';
import { criarRiftFX } from '../src/rift-fx.js';

// Cena de mentira: o modulo so precisa de um punhado de metodos, e e por isso
// que da para testar efeito de cena sem WebGL nenhum.
const cenaFalsa = () => {
  const feito = [];
  return {
    feito,
    time: 0, reducedMotion: false, quality: true, retiredBoss: null,
    scene: { add: (...o) => feito.push({ o: 'add', quantos: o.length }) },
    game: { biome: { color: '#bfa2ff' } },
    at: (x, z) => [x, z],
    later: (d, fn) => { feito.push({ o: 'later', d }); fn(); },
    burst: () => feito.push({ o: 'burst' }),
    pulse: () => feito.push({ o: 'pulse' }),
    impactLight: () => feito.push({ o: 'luz' }),
  };
};

// Relatado jogando: "o buraco negro apareceu pros mini bosses tambem, so devem
// mostrar pros chefes finais". A fenda e um gesto raro -- gasta-la no campeao
// tira o peso dela na unica hora que importa.
test('a fenda abre para o guardiao e nunca para o campeao', () => {
  for (const [tipo, deveAbrir] of [['bossDefeated', true], ['championDefeated', false], ['miniDefeated', false]]) {
    const cena = cenaFalsa();
    const fx = criarRiftFX({});
    fx.handle(cena, { type: tipo, x: 5, z: 5, id: 1 });
    const abriu = cena.feito.some(f => f.o === 'add');
    assert.equal(abriu, deveAbrir, `${tipo} ${deveAbrir ? 'devia' : 'nao devia'} abrir a fenda`);
  }
});

test('sem posicao a fenda nao abre, em vez de abrir no canto do mundo', () => {
  const cena = cenaFalsa();
  criarRiftFX({}).handle(cena, { type: 'bossDefeated', id: 1 });
  assert.deepEqual(cena.feito, []);
});

test('o frame nao faz nada enquanto nenhuma fenda esta aberta', () => {
  const cena = cenaFalsa();
  const fx = criarRiftFX({});
  fx.frame(cena, 1 / 60);
  assert.deepEqual(cena.feito, [], 'mexeu na cena sem fenda aberta');
});
