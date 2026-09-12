import * as THREE from 'three';
import { SPRITE } from './particles.js';

// O projetil do arremesso.
//
// A mecanica entrou em 2026-09-11 e ficou meio muda: o guardiao fazia o gesto
// (o evento 'warning' ja dispara o Windup do modelo) e a marca aparecia no
// chao, mas NADA viajava de um ao outro. Quem jogasse via a marca nascer
// sozinha e leria como defeito, nao como golpe.
//
// O projetil chega na marca exatamente quando ela estoura -- por isso ele
// recebe a duracao do telegrafo em vez de ter velocidade propria.

const ATLAS = [4, 2];

export function criarThrowFX(fontes) {
  let malha = null, cenaAtual = null;
  let voo = null;

  function garantir(cena) {
    if (malha && cenaAtual === cena) return true;
    if (!fontes?.atlas) return false;
    const textura = new THREE.TextureLoader().load(fontes.atlas);
    textura.colorSpace = THREE.SRGBColorSpace;
    textura.generateMipmaps = false;
    textura.minFilter = THREE.LinearFilter;
    textura.repeat.set(1 / ATLAS[0], 1 / ATLAS[1]);
    // Celula do 'bolt' no atlas assado -- cabeca quente e cauda afinando.
    const i = SPRITE.bolt ?? 7;
    textura.offset.set((i % ATLAS[0]) / ATLAS[0], 1 / ATLAS[1] - Math.floor(i / ATLAS[0]) / ATLAS[1]);

    malha = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
      map: textura, transparent: true, opacity: 0, depthWrite: false,
      blending: THREE.AdditiveBlending, toneMapped: false,
    }));
    malha.rotation.x = -Math.PI / 2;
    malha.renderOrder = 6;
    malha.visible = false;
    cena.scene.add(malha);
    cenaAtual = cena;
    return true;
  }

  return {
    handle(cena, evento) {
      if (evento.type === 'arena') { voo = null; if (malha) malha.visible = false; return; }
      if (evento.type !== 'bossThrow' || !evento.target) return;
      if (!garantir(cena)) return;

      const [ox, oz] = cena.at(evento.x, evento.z);
      const [dx, dz] = cena.at(evento.target.x, evento.target.z);
      voo = {
        ox, oz, dx, dz,
        // Guarda tambem em coordenadas de GRADE: o burst fala grade, a malha
        // fala mundo, e interpolar no espaco errado poe o rastro fora da rota.
        gox: evento.x, goz: evento.z, gdx: evento.target.x, gdz: evento.target.z,
        // Mesma duracao do telegrafo: ele POUSA quando a marca estoura.
        duracao: evento.duration || 1.15,
        idade: 0,
        cor: new THREE.Color(evento.color || 0xffab6b),
        rastro: 0,
        celula: evento.target,
      };
      malha.material.color.copy(voo.cor);
      malha.visible = true;

      if (!cena.reducedMotion) {
        cena.burst(evento.x, evento.z, voo.cor, 8, 2.2, { geo: 'crystal', size: 1, spread: .4 });
        cena.impactLight(evento.x, evento.z, voo.cor, 22, 6, .8);
      }
    },

    frame(cena, dt) {
      if (!voo || !malha?.visible) return;
      voo.idade += dt;
      const k = Math.min(1, voo.idade / voo.duracao);

      const x = voo.ox + (voo.dx - voo.ox) * k;
      const z = voo.oz + (voo.dz - voo.oz) * k;
      // Arco: sobe e desce. Sem isso ele desliza no chao e parece uma mancha,
      // nao uma coisa arremessada.
      const altura = .35 + Math.sin(k * Math.PI) * 1.25;
      malha.position.set(x, altura, z);
      malha.scale.setScalar(.95 + Math.sin(k * Math.PI) * .25);
      // A cauda aponta para tras: o plano gira para o sentido da viagem.
      malha.rotation.z = -Math.atan2(voo.dx - voo.ox, voo.dz - voo.oz) + Math.PI;
      malha.material.opacity = k < .12 ? k / .12 : 1;

      if (!cena.reducedMotion) {
        voo.rastro -= dt;
        if (voo.rastro <= 0) {
          voo.rastro = .07;
          const gx = voo.gox + (voo.gdx - voo.gox) * k;
          const gz = voo.goz + (voo.gdz - voo.goz) * k;
          cena.burst(gx, gz, voo.cor, 2, .6, { geo: 'round', size: .8, gravity: 1.4, lift: .2, y: altura, spread: .25 });
        }
      }

      if (k >= 1) {
        malha.visible = false;
        if (!cena.reducedMotion) {
          cena.burst(voo.celula.x, voo.celula.z, voo.cor, 14, 2.6, { geo: 'crystal', size: 1.1, spread: .4 });
          cena.pulse(voo.celula.x, voo.celula.z, voo.cor, 2.2, .5);
        }
        voo = null;
      }
    },
  };
}
