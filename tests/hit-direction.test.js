import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, seededRandom } from '../src/game.js';

// Relatado jogando: "levei dano mas nao fica claro DE ONDE". O evento 'hurt' so
// dizia onde VOCE estava -- a unica informacao que o jogador ja tinha.
const arena = () => {
  const g = new Game({ random: seededRandom(3), meta: { unlockedStage: 18 } });
  g.start(1);
  g.enemies = []; g.pickups = []; g.spawnClock = Infinity; g.hazardClock = Infinity;
  for (let z = 1; z < g.height - 1; z++) for (let x = 1; x < g.width - 1; x++) g.grid[z][x] = 0;
  g.player.invincible = 0;
  g.drainEvents();
  return g;
};
const machucados = g => g.drainEvents().filter(e => e.type === 'hurt');

test('o dano do chao aponta para a propria casa, e se identifica como chao', () => {
  const g = arena();
  g.hazardField.add(g.player.x, g.player.z, 'lava');
  g.queimarJogador(1);
  const [dano] = machucados(g);
  assert(dano, 'o chao nao feriu');
  assert(dano.de, 'o dano veio sem origem');
  assert.equal(dano.de.tipo, 'chao');
  assert.deepEqual([dano.de.x, dano.de.z], [g.player.x, g.player.z]);
});

test('o encostrao da horda aponta para o bicho, com o tipo dele', () => {
  const g = arena();
  const bicho = g.spawnEnemy('slime');
  bicho.x = g.player.x; bicho.z = g.player.z;
  g.drainEvents();
  g.tick(1 / 30);
  const dano = machucados(g).find(d => d.de?.tipo === 'slime');
  assert(dano, 'o encostrao nao identificou o bicho');
  assert.deepEqual([dano.de.x, dano.de.z], [bicho.x, bicho.z]);
});

test('a explosao aponta para a casa marcada mais perto de voce', () => {
  const g = arena();
  const p = g.player;
  // Chama com a casa do jogador e outra longe: a origem tem de ser a de perto.
  g.applyFlame({ id: 1, cells: [{ x: p.x, z: p.z }, { x: p.x + 5, z: p.z }], damage: 20, hit: new Set(), enemy: true });
  const [dano] = machucados(g);
  assert(dano?.de, 'a explosao veio sem origem');
  assert.deepEqual([dano.de.x, dano.de.z], [p.x, p.z]);
  assert.equal(dano.de.tipo, 'golpe');
});
