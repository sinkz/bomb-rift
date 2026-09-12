import { CERIMONIA } from './finale.js';

// Modulo de efeitos da queda do guardiao. Entra na cena por scene.use(), entao
// o scene.js nao precisa saber que ele existe -- quem monta a cena decide.
//
// Ele ACRESCENTA batidas ao que ja havia: o estouro de 80 particulas e os tres
// aneis continuam onde estavam, no handleGuardianEntry. O que faltava era o
// depois -- a coluna de brasa enquanto ele cai, e o desfazer no fim.

/** Quanto o corpo fica em cena antes de se desfazer, por desfecho. */
const QUEDA = {
  bossDefeated: { brasa: 22, coluna: 1.5, desfazer: 2.2, holofote: CERIMONIA.slain.espera },
  championDefeated: { brasa: 12, coluna: .9, desfazer: 1.3, holofote: CERIMONIA.champion.espera },
};

export function criarFinaleFX() {
  return {
    handle(cena, evento) {
      const receita = QUEDA[evento.type];
      if (!receita) return;

      const biome = cena.game.biome;
      const cor = biome?.color || 0xffd695;
      const { x, z } = evento;
      if (x === undefined || z === undefined) return;

      // A arena escurece e o holofote fica nele: o mesmo recurso da entrada,
      // agora ao contrario. Sem isso a queda acontece no meio do barulho.
      cena.bossEntry = { age: 0, duration: receita.holofote + .4, depth: .75 };

      if (cena.reducedMotion) return;

      // Coluna de brasa subindo enquanto o corpo cai. Escalonada, senao vira
      // um estouro so e some antes de o clipe Death chegar na metade.
      const levas = Math.round(receita.coluna / .18);
      for (let i = 0; i < levas; i++) {
        cena.later(i * .18, () => {
          cena.burst(x, z, cor, Math.max(2, Math.round(receita.brasa / levas)), 1.4,
            { geo: 'round', size: 1.2, gravity: -2.6, lift: .7, y: .5, spread: .8 });
        });
      }

      // O desfazer: ele vira poeira na cor do mundo, e o chao devolve um anel.
      cena.later(receita.desfazer, () => {
        cena.burst(x, z, cor, cena.quality ? 34 : 14, 2.6, { geo: 'sphere', size: 2.1, gravity: -1.4, lift: .5, y: .7, spread: 1.2 });
        cena.burst(x, z, 0xffffff, 16, 2, { size: 1.4, gravity: 3, spread: .6 });
        cena.pulse(x, z, cor, 5.5, 1.1);
        cena.impactLight(x, z, cor, 34, 12, 1.6);
      });
    },
  };
}
