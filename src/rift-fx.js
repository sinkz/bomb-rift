import * as THREE from 'three';
import { CERIMONIA } from './finale.js';

// A fenda que engole o guardiao.
//
// Relatado jogando: "ele cai mas nao tem impacto, nao tem cena". O clipe Death
// rodava e o corpo sumia -- tecnicamente correto e dramaticamente nada. O jogo
// se chama BOMB RIFT e a fenda nunca tinha aparecido em cena; e ela quem devia
// levar o corpo.
//
// Entra por scene.use(), como os outros modulos de efeito.

const ORDEM_DE_RENDER = 4;

export function criarRiftFX() {
  let disco = null, anel = null, cenaAtual = null;
  let vida = 0, duracao = 0, centro = null, cor = null;

  function garantir(cena) {
    if (disco && cenaAtual === cena) return;
    // O buraco: um disco escuro que engole a luz em vez de somar a ela. E por
    // isso que ele NAO e aditivo como o resto dos efeitos do jogo.
    disco = new THREE.Mesh(
      new THREE.CircleGeometry(1, 48),
      new THREE.MeshBasicMaterial({ color: 0x07050d, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }),
    );
    disco.rotation.x = -Math.PI / 2;
    disco.renderOrder = ORDEM_DE_RENDER;
    disco.visible = false;

    // A boca: o anel de luz na borda do buraco, esse sim aditivo.
    anel = new THREE.Mesh(
      new THREE.RingGeometry(.86, 1, 48),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
    );
    anel.rotation.x = -Math.PI / 2;
    anel.renderOrder = ORDEM_DE_RENDER + 1;
    anel.visible = false;

    cena.scene.add(disco, anel);
    cenaAtual = cena;
  }

  return {
    handle(cena, evento) {
      if (evento.type === 'arena') { if (disco) { disco.visible = false; anel.visible = false; } vida = 0; return; }
      if (evento.type !== 'bossDefeated' && evento.type !== 'championDefeated') return;
      if (evento.x === undefined) return;
      garantir(cena);

      const cerimonia = evento.type === 'bossDefeated' ? CERIMONIA.slain : CERIMONIA.champion;
      duracao = cerimonia.espera;
      vida = duracao;
      cor = new THREE.Color(cena.game.biome?.color || 0xbfa2ff);
      const [wx, wz] = cena.at(evento.x, evento.z);
      centro = { x: wx, z: wz, gx: evento.x, gz: evento.z };

      disco.position.set(wx, .03, wz);
      anel.position.set(wx, .04, wz);
      anel.material.color.copy(cor);
      disco.visible = true;
      anel.visible = true;

      if (cena.reducedMotion) return;
      // Motas caindo PARA DENTRO. E o oposto de toda explosao do jogo, e e o
      // que diz "sugado" em vez de "estourado" sem precisar de texto.
      const levas = 7;
      for (let i = 0; i < levas; i++) {
        cena.later(.25 + i * .22, () => {
          for (let k = 0; k < 5; k++) {
            const a = Math.random() * Math.PI * 2, r = 1.6 + Math.random() * 1.8;
            cena.burst(evento.x + Math.cos(a) * r, evento.z + Math.sin(a) * r, cor, 1, .3,
              { geo: 'box', size: .8, gravity: -1.1, lift: .35, y: .35, spread: .2 });
          }
        });
      }
      // O fechamento: quando a boca se fecha, ela devolve um sopro de luz.
      cena.later(duracao * .82, () => {
        cena.pulse(evento.x, evento.z, cor, 4.6, .8);
        cena.burst(evento.x, evento.z, cor, cena.quality ? 22 : 10, 2.2, { geo: 'crystal', size: 1.2, spread: .5 });
        cena.impactLight(evento.x, evento.z, cor, 40, 12, 1.4);
      });
    },

    frame(cena, dt) {
      if (vida <= 0 || !disco?.visible) return;
      vida = Math.max(0, vida - dt);
      const k = 1 - vida / duracao;             // 0 -> 1 ao longo da cerimonia
      // Abre rapido, segura, e fecha no fim: a boca tem de estar larga enquanto
      // o corpo cai, e fechada quando a tela de vitoria sobe.
      const abertura = k < .18 ? k / .18 : k > .82 ? (1 - k) / .18 : 1;
      const raio = 2.6 * abertura;

      disco.scale.setScalar(Math.max(.001, raio));
      disco.material.opacity = .92 * abertura;
      anel.scale.setScalar(Math.max(.001, raio * (1 + .04 * Math.sin(cena.time * 7))));
      anel.material.opacity = .85 * abertura;
      anel.rotation.z += dt * .9;

      // O corpo afunda e encolhe para dentro da boca enquanto ela esta aberta.
      const corpo = cena.retiredBoss;
      if (corpo && centro) {
        const mergulho = Math.min(1, Math.max(0, (k - .22) / .55));
        corpo.position.y = -1.5 * mergulho ** 1.6;
        const encolhe = 1 - .55 * mergulho;
        corpo.scale.setScalar(encolhe);
        corpo.rotation.y += dt * (.8 + mergulho * 3.4);
      }

      if (vida <= 0) { disco.visible = false; anel.visible = false; }
    },
  };
}
