import * as THREE from 'three';
import { SPRITE } from './particles.js';
import { HAZARD_RULES } from './hazards.js';
import { CICLO } from './hazard-cycle.js';

// O desenho da brasa errante. Entra na cena por scene.use(), entao o scene.js
// nao precisa conhece-lo -- quem monta a cena decide o que entra.
//
// A regra que o modulo inteiro serve: o jogador tem de saber DE RELANCE em qual
// das tres fases cada casa esta. Particula sozinha nao faz isso -- a primeira
// versao deste arquivo so soltava fagulha e o chao perigoso ficava invisivel.
// Por isso a peca principal e uma MARCA PERSISTENTE no chao; a fagulha e
// tempero por cima.
//
//   aviso      contorno fino que pulsa, quase transparente -- da para atravessar
//   acesa      preenchida e brilhante, pulsando no ritmo da regra -- fere
//   esfriando  a marca desbota ate sumir -- ja nao fere

const CAPACIDADE = 96;
const chave = (x, z) => `${x},${z}`;

export function criarHazardFX(particleSources) {
  let malha = null, halo = null, dummy = null, cenaAtual = null, textura = null, kindAtual = null;
  let relogioQuadro = 0, quadro = 0, flip = null;
  // casa -> { kind, fase, idade, cor }
  const marcas = new Map();

  const regra = kind => HAZARD_RULES[kind] || HAZARD_RULES.lava;

  function garantirMalha(cena) {
    if (malha && cenaAtual === cena) return malha;
    // Uma draw call para o chao perigoso inteiro, como o campo de particulas.
    const geo = new THREE.BoxGeometry(1, 1, 1);
    // Mistura NORMAL, nao aditiva. A primeira versao somava luz sobre um chao
    // ja iluminado e qualquer matiz saturava para branco -- o perigo virava
    // mancha palida sem cara de perigo. Com normal a cor sobrevive, e o brilho
    // fica por conta da fagulha e do anel, que sao aditivos.
    // A marca usa o MESMO sprite assado no Blender que as particulas daquele
    // perigo. Como cada mundo tem um tipo so, da para apontar a textura para a
    // celula certa do atlas uma vez e pronto -- sem shader por instancia.
    if (particleSources?.atlas && !textura) {
      textura = new THREE.TextureLoader().load(particleSources.atlas);
      textura.colorSpace = THREE.SRGBColorSpace;
      textura.generateMipmaps = false;
      textura.minFilter = THREE.LinearFilter;
      textura.repeat.set(1 / 4, 1 / 2);
    }
    const mat = new THREE.MeshBasicMaterial({
      transparent: true, opacity: .78, depthWrite: false, toneMapped: false,
      map: textura || null,
    });
    malha = new THREE.InstancedMesh(geo, mat, CAPACIDADE);
    malha.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    malha.frustumCulled = false;
    malha.renderOrder = 3;
    malha.count = 0;
    // O friso. O jogo ja ensinou no telegrafo de ataque que casa com contorno
    // aceso machuca -- a brasa fala a mesma lingua, com preenchimento solido
    // em vez de vazado para dizer "e agora, nao daqui a pouco". E e o que a
    // separa das caixas de madeira, que tem cor parecida e nenhum friso.
    // O halo usa o FLIPBOOK -- 16 quadros de fumaca evoluindo, assados no
    // Blender junto com os sprites. Um sprite parado dizia "o chao esta aceso";
    // o flipbook diz "o chao esta vivo". Todas as casas compartilham o material,
    // o que so funciona porque cada mundo tem um perigo so.
    if (particleSources?.flipbook && !flip) {
      flip = new THREE.TextureLoader().load(particleSources.flipbook);
      flip.colorSpace = THREE.SRGBColorSpace;
      flip.generateMipmaps = false;
      flip.minFilter = THREE.LinearFilter;
      flip.repeat.set(1 / 4, 1 / 4);
    }
    halo = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({
      transparent: true, opacity: .5, depthWrite: false,
      blending: THREE.AdditiveBlending, toneMapped: false, map: flip || null,
    }), CAPACIDADE);
    halo.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    halo.frustumCulled = false;
    halo.renderOrder = 2;
    halo.count = 0;
    cena.scene.add(halo);
    // Fora de cena.fx de proposito: buildArena limpa aquele grupo inteiro, e a
    // remodelagem do duelo acontece com a luta em andamento.
    cena.scene.add(malha);
    dummy = new THREE.Object3D();
    cenaAtual = cena;
    return malha;
  }

  return {
    handle(cena, evento) {
      if (!evento.cells) return;
      const cor = new THREE.Color(regra(evento.kind).color);
      // Aponta a textura para a celula do atlas deste perigo. O atlas e 4x2 e a
      // ordem esta em SPRITE, no particles.js -- se mudar la, muda aqui.
      if (textura && evento.kind && evento.kind !== kindAtual) {
        kindAtual = evento.kind;
        const indice = SPRITE[regra(evento.kind).sprite] ?? SPRITE.ember;
        textura.offset.set((indice % 4) / 4, 1 / 2 - Math.floor(indice / 4) / 2);
      }

      if (evento.type === 'hazardAviso') {
        for (const c of evento.cells) marcas.set(chave(c.x, c.z), { x: c.x, z: c.z, kind: evento.kind, fase: 'aviso', idade: 0, cor });
        if (evento.cells[0]) cena.pulse(evento.cells[0].x, evento.cells[0].z, regra(evento.kind).color, 1.6, CICLO.aviso, 0, true);
      }

      if (evento.type === 'hazardAcendeu') {
        for (const c of evento.cells) {
          const marca = marcas.get(chave(c.x, c.z));
          if (marca) { marca.fase = 'acesa'; marca.idade = 0; }
          cena.burst(c.x, c.z, regra(evento.kind).color, cena.reducedMotion ? 2 : 6, 1.8,
            { geo: 'round', size: 1.1, gravity: -1.4, lift: .5, y: .1, spread: .5 });
        }
        const meio = evento.cells[Math.floor(evento.cells.length / 2)];
        if (meio) {
          cena.pulse(meio.x, meio.z, regra(evento.kind).color, 2.6, .7);
          cena.impactLight(meio.x, meio.z, regra(evento.kind).color, 26, 8, 1.1);
        }
        cena.shake = cena.reducedMotion ? 0 : Math.max(cena.shake, .1);
      }

      if (evento.type === 'hazardEsfriou') {
        // Devolver o chao merece sinal proprio, senao o jogador continua
        // desviando de uma casa que ja nao machuca.
        for (const c of evento.cells) {
          const marca = marcas.get(chave(c.x, c.z));
          if (marca) { marca.fase = 'esfriando'; marca.idade = 0; }
          cena.burst(c.x, c.z, 0xb9a6c8, cena.reducedMotion ? 1 : 3, .9,
            { geo: 'sphere', size: 1.1, gravity: -1.8, lift: .4, y: .12, spread: .5 });
        }
      }

      if (evento.type === 'hazardApagou') for (const c of evento.cells) marcas.delete(chave(c.x, c.z));
      // A arena inteira se refaz: as marcas antigas nao valem mais nada.
      if (evento.type === 'arena') marcas.clear();
    },

    frame(cena, dt) {
      const m = garantirMalha(cena);
      if (flip && !cena.reducedMotion) {
        relogioQuadro -= dt;
        if (relogioQuadro <= 0) {
          relogioQuadro = .085;
          quadro = (quadro + 1) % 16;
          flip.offset.set((quadro % 4) / 4, 3 / 4 - Math.floor(quadro / 4) / 4);
        }
      }
      let n = 0;

      for (const marca of marcas.values()) {
        marca.idade += dt;
        if (marca.fase === 'esfriando' && marca.idade >= CICLO.esfriando) { marcas.delete(chave(marca.x, marca.z)); continue; }
        if (n >= CAPACIDADE) break;

        const [wx, wz] = cena.at(marca.x, marca.z);
        let lado, altura, brilho;
        if (marca.fase === 'aviso') {
          // Cresce do nada ate a casa cheia durante a janela: o tamanho conta
          // quanto falta, do mesmo jeito que o telegrafo de golpe conta.
          const k = Math.min(1, marca.idade / CICLO.aviso);
          lado = .2 + .68 * k ** .7;
          altura = .035;
          brilho = .35 + .3 * k;
        } else if (marca.fase === 'acesa') {
          const ritmo = cena.reducedMotion ? 1 : .82 + .18 * Math.sin(cena.time * (6.283 / regra(marca.kind).tick));
          lado = .84;
          altura = .05;
          brilho = ritmo;
        } else {
          const k = Math.min(1, marca.idade / CICLO.esfriando);
          lado = .9 - .25 * k;
          altura = .04;
          brilho = .5 * (1 - k);
        }

        dummy.position.set(wx, altura / 2 + .02, wz);
        dummy.scale.set(lado, altura, lado);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        m.setMatrixAt(n, dummy.matrix);
        m.setColorAt(n, marca.cor.clone().multiplyScalar(brilho));

        // O halo e um pouco maior que o preenchimento: a sobra e o friso.
        dummy.scale.set(lado + .14, altura * .6, lado + .14);
        dummy.position.y = altura * .3 + .015;
        dummy.updateMatrix();
        halo.setMatrixAt(n, dummy.matrix);
        halo.setColorAt(n, marca.cor.clone().multiplyScalar(brilho * .9));
        n++;
      }

      m.count = n;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      halo.count = n;
      halo.instanceMatrix.needsUpdate = true;
      if (halo.instanceColor) halo.instanceColor.needsUpdate = true;

      // Sopro continuo enquanto arde: uma casa por vez, em rodizio. O campo
      // inteiro soprando junto viraria mancha, e o teto de particulas existe
      // para a luta, nao para o chao.
      if (cena.reducedMotion || !cena.quality) return;
      this.relogio = (this.relogio || 0) - dt;
      if (this.relogio > 0) return;
      this.relogio = .22;
      const acesas = [...marcas.values()].filter(x => x.fase === 'acesa');
      const casa = acesas[Math.floor(cena.time / .22) % (acesas.length || 1)];
      if (!casa) return;
      cena.burst(casa.x, casa.z, regra(casa.kind).color, 2, .8,
        { geo: 'round', size: .9, gravity: -2.4, lift: .35, y: .08, spread: .4 });
    },
  };
}
