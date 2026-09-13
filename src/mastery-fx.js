import * as THREE from 'three';

// A assinatura visual das maestrias.
//
// Relatado pelo dono depois de jogar: "nao sinto que a maestria muda muito...
// nao tem efeitos novos e tais, como em outros roguelikes que ficam com efeitos
// visuais diferentes, algo que eu fale ual".
//
// Medindo, a queixa se mostrou precisa. As quinze maestrias FUNCIONAM -- eu
// despertei as quinze pelo caminho real e conferi o estado do jogador antes e
// depois. O que nao existia era a leitura: catorze delas mudam apenas numeros
// invisiveis (+1 bomba, -5% de passo, -12% de pavio). So a 'power' tinha
// assinatura propria, porque ela ja acendia o fogo azul que a reliquia 'azure'
// tambem acende. E a aura que aparecia aos pes do jogador era dourada FIXA para
// todas -- despertar o Zero absoluto (gelo) e a Supernova (fogo) deixava voce
// visualmente identico.
//
// Este modulo resolve o problema em duas camadas:
//
//   universal  a aura ganha um cristal na cor da maestria. Vale para as quinze
//              de graca, e para qualquer maestria futura sem escrever nada.
//   heroica    cada maestria decora um evento que ela ja provocava, para que o
//              poder apareca onde ele acontece, e nao so aos seus pes.
//
// A camada heroica e DADO, nao motor: o sistema de particulas reescrito ja
// tinge qualquer efeito por cor e ja tem oito sprites assados. Uma maestria
// nova entra acrescentando uma linha na tabela abaixo.

/**
 * Uma entrada por maestria.
 *
 *   cor    a cor do cristal na aura, e o padrao dos efeitos heroicos
 *   ao     decoracoes por tipo de evento -- (cena, evento) => void
 *   quadro efeito continuo -- (cena, dt, estado) => void
 *
 * A ausencia de `ao`/`quadro` e legitima: a maestria ainda ganha a aura.
 */
export const ASSINATURAS = {
  // Ja acendia o fogo azul. O que faltava era o CLARAO: sem ele, o azul
  // aparecia nas chamas mas o impacto continuava com a luz laranja de sempre.
  power: {
    cor: 0x59caff,
    ao: {
      explosion(cena, evento) {
        cena.impactLight(evento.x, evento.z, 0x59caff, 34, 8, 1.4);
        cena.pulse(evento.x, evento.z, 0x8fe4ff, 2.6, .42);
      },
    },
  },

  // "A explosao atravessa a primeira caixa." A perfuracao ja acontecia; ela era
  // invisivel porque a chama nasce igual atras e na frente da caixa. A lanca
  // marca o eixo inteiro de uma vez, entao o alcance extra se le.
  range: {
    cor: 0xffb066,
    ao: {
      explosion(cena, evento) {
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          for (let i = 1; i <= 4; i++) {
            cena.burst(evento.x + dx * i, evento.z + dz * i, 0xffcf8f, 2, .5,
              { geo: 'cone', size: .8, gravity: .6, lift: .25, y: .5, spread: .2 });
          }
        }
      },
    },
  },

  // "A bomba que ocupa a ultima vaga ganha +4 de dano." O bonus so vale numa
  // bomba especifica -- entao ela precisa ser reconhecivel NO MOMENTO em que
  // voce a planta, senao a regra vira sorte.
  capacity: {
    cor: 0xb5a0ff,
    ao: {
      bomb(cena, evento) {
        const jogo = cena.game;
        if (jogo.bombs.length < jogo.player.capacity) return;
        cena.pulse(evento.x, evento.z, 0xd4c4ff, 1.9, .5);
        cena.burst(evento.x, evento.z, 0xb5a0ff, 10, 1.6, { geo: 'crystal', size: 1, lift: .8, spread: .3 });
      },
    },
  },

  // "A protecao de cada esquiva dura 1 segundo." Um segundo de invencibilidade
  // que ninguem ve nao muda decisao nenhuma -- o rastro de silhuetas diz
  // "voce ainda esta intangivel" durante o tempo exato em que voce esta.
  speed: {
    cor: 0x72dcc5,
    quadro(cena, dt, estado) {
      const p = cena.game?.player;
      if (!p || p.invincible <= 0) return;
      estado.t = (estado.t || 0) - dt;
      if (estado.t > 0) return;
      estado.t = .07;
      cena.burst(p.x, p.z, 0x72dcc5, 2, .35, { geo: 'sphere', size: 1.3, gravity: -.4, lift: .15, y: .55, spread: .35 });
    },
  },

  // "20% de armadura adicional." Armadura e o efeito mais invisivel do jogo:
  // ela nao te cura, so faz o numero vermelho ser menor. As placas orbitando
  // dao corpo a ela, e o clarao no bloqueio mostra quando ela trabalhou.
  health: {
    cor: 0xfb7993,
    ao: {
      hurt(cena, evento) {
        cena.pulse(evento.x, evento.z, 0xfb7993, 1.5, .3);
      },
    },
  },

  // "Cada cristal coletado cura 1 de vida." A cura de 1 nao aparece na barra --
  // some no arredondamento visual. O fio de luz subindo do cristal ate voce faz
  // a conta ficar visivel mesmo quando o numero nao muda.
  magnet: {
    // Verde-vital, nao o verde-agua da 'speed'. Elas sao de ramos diferentes e
    // um teste guarda isso: cor repetida entre ramos e o defeito antigo de volta.
    cor: 0xa8e86a,
    ao: {
      pickup(cena, evento) {
        const p = cena.game.player;
        for (let i = 0; i <= 4; i++) {
          const k = i / 4;
          cena.burst(evento.x + (p.x - evento.x) * k, evento.z + (p.z - evento.z) * k,
            0xc6f59b, 1, .3, { geo: 'round', size: .7, gravity: -1.2, lift: .2, y: .4 });
        }
      },
    },
  },

  // "Plantar com todas as vagas livres concede +3 de dano." Mesmo problema da
  // 'capacity', na ponta oposta: o bonus depende de uma condicao que voce tem
  // de reconhecer ANTES de plantar a proxima.
  fuse: {
    cor: 0xffe9b0,
    ao: {
      bomb(cena, evento) {
        if (cena.game.bombs.length !== 1) return;
        cena.burst(evento.x, evento.z, 0xfff3d0, 12, 2.4, { geo: 'crystal', size: .9, lift: 1, spread: .25 });
        cena.impactLight(evento.x, evento.z, 0xffe9b0, 18, 5, .9);
      },
    },
  },

  // "Cada abate devolve 0,6s da recarga." O corte roxo no caminho da esquiva e
  // a unica maestria que voce ve porque VOCE a acionou, e nao o jogo.
  dash: {
    cor: 0xa97ce0,
    ao: {
      dash(cena, evento) {
        const passos = Math.max(Math.abs(evento.x - evento.fromX), Math.abs(evento.z - evento.fromZ));
        for (let i = 0; i <= passos; i++) {
          const k = passos ? i / passos : 0;
          cena.burst(evento.fromX + (evento.x - evento.fromX) * k, evento.fromZ + (evento.z - evento.fromZ) * k,
            0xa97ce0, 3, .8, { geo: 'crystal', size: 1.1, gravity: .5, lift: .3, y: .45, spread: .2 });
        }
        cena.pulse(evento.x, evento.z, 0xc9a6ff, 1.7, .34);
      },
    },
  },

  // "Abater com a vida cheia restaura um escudo." A condicao e facil de perder
  // de vista no meio da horda; as gotas subindo dizem que ela foi satisfeita.
  vampire: {
    cor: 0xe05c6e,
    ao: {
      kill(cena, evento) {
        const p = cena.game.player;
        if (p.hp < p.maxHp) return;
        cena.burst(evento.x, evento.z, 0xe05c6e, 8, 1.2, { geo: 'round', size: 1, gravity: -3.2, lift: .9, y: .5, spread: .4 });
      },
    },
  },

  // "O raio salta para ate 5 inimigos." Cinco saltos sao rapidos demais para
  // contar no meio da explosao. Os arcos permanentes entre inimigos proximos
  // deixam voce VER a corrente que vai acontecer antes de acertar o primeiro.
  chain: {
    cor: 0xf5d37f,
    quadro(cena, dt, estado) {
      estado.t = (estado.t || 0) - dt;
      if (estado.t > 0) return;
      estado.t = .22;
      const vivos = cena.game?.enemies || [];
      for (let i = 0; i < vivos.length; i++) {
        const a = vivos[i];
        for (let j = i + 1; j < vivos.length; j++) {
          const b = vivos[j];
          if (Math.abs(a.x - b.x) + Math.abs(a.z - b.z) > 3) continue;
          for (let k = 1; k < 4; k++) {
            const t = k / 4;
            cena.burst(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, 0xf5d37f, 1, .2,
              { geo: 'crystal', size: .55, gravity: 0, lift: 0, y: .55 });
          }
        }
      }
    },
  },

  // "Congela inimigos por 2s." O congelamento ja aparece no inimigo. O que nao
  // aparecia era VOCE: a trinca no chao diz que quem anda ali e o inverno.
  frost: {
    cor: 0x8bdfff,
    quadro(cena, dt, estado) {
      const p = cena.game?.player;
      if (!p) return;
      if (estado.x === p.x && estado.z === p.z) return;
      estado.x = p.x; estado.z = p.z;
      cena.burst(p.x, p.z, 0x8bdfff, 3, .4, { geo: 'box', size: .9, gravity: .3, lift: .1, y: .1, spread: .5 });
    },
  },

  // "As quatro diagonais alcancam 4 blocos." A cruz e a diagonal nascem com a
  // mesma chama, entao a explosao lia como cruz mesmo tendo oito bracos. As
  // pontas marcam as quatro diagonais explicitamente.
  shrapnel: {
    cor: 0xf9b68d,
    ao: {
      explosion(cena, evento) {
        for (const [dx, dz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
          for (let i = 1; i <= 4; i++) {
            cena.burst(evento.x + dx * i, evento.z + dz * i, 0xffd0ae, 2, .6,
              { geo: 'crystal', size: .9, gravity: 1.2, lift: .4, y: .4, spread: .2 });
          }
        }
      },
    },
  },

  // "Um novo escudo a cada 6s. Ao bloquear, cura 10 de vida." O escudo ja tinha
  // anel proprio; o que faltava era o momento do bloqueio -- a cupula.
  ward: {
    cor: 0xb3e5d4,
    ao: {
      blocked(cena, evento) {
        for (const [i, tamanho] of [1.4, 2.4, 3.4].entries()) {
          cena.pulse(evento.x, evento.z, 0xb3e5d4, tamanho, .55, i * .07);
        }
        cena.burst(evento.x, evento.z, 0xdcfaf0, 16, 2.2, { geo: 'sphere', size: 1.4, gravity: -1, lift: .5, y: .6, spread: .5 });
      },
    },
  },

  // "Forjar custa 25% menos cristais." E economia pura: acontece no modal, nunca
  // na arena. A poeira na coleta e o lembrete de que o cristal vale mais agora.
  alchemy: {
    cor: 0xd2a2ff,
    ao: {
      pickup(cena, evento) {
        cena.burst(evento.x, evento.z, 0xd2a2ff, 5, 1, { geo: 'crystal', size: .8, gravity: 2.4, lift: .6, y: .4, spread: .3 });
      },
    },
  },

  // "A esquiva causa 8 de dano e explode em cruz ao chegar." A cruz ja e
  // aplicada em applyFlame, mas com dano amigo -- ela nao desenha chama. O
  // cometa e a unica forma de ver o golpe que voce acabou de dar.
  afterglow: {
    cor: 0x6cf0d8,
    ao: {
      comet(cena, evento) {
        cena.pulse(evento.x, evento.z, 0x6cf0d8, 2.4, .45);
        cena.burst(evento.x, evento.z, 0xa8fff0, 14, 2.6, { geo: 'crystal', size: 1.1, lift: .8, spread: .4 });
      },
    },
  },
};

/** Um cristal orbitando por maestria, na cor dela. */
const RAIO = .56;

export function criarMasteryFX() {
  let aura = null, cenaAtual = null;
  let despertas = [];
  const estados = new Map();

  function garantir(cena) {
    if (aura && cenaAtual === cena) return;
    aura = new THREE.Group();
    // Fora de cena.dynamic e de cena.fx: os dois sao limpos ao remontar a
    // arena, e a assinatura tem de sobreviver a remodelagem do duelo.
    cena.scene.add(aura);
    cenaAtual = cena;
  }

  /** Reconstroi os orbes. Chamado so quando a lista de maestrias muda. */
  function montar(cena) {
    garantir(cena);
    for (const filho of aura.children) {
      filho.geometry.dispose();
      filho.material.dispose();
    }
    aura.clear();
    if (!despertas.length) return;

    const geometria = new THREE.OctahedronGeometry(.075);
    const anel = new THREE.Mesh(
      new THREE.TorusGeometry(RAIO, .018, 6, 30),
      new THREE.MeshBasicMaterial({
        color: ASSINATURAS[despertas[despertas.length - 1]]?.cor ?? 0xffffff,
        transparent: true, opacity: .55, depthWrite: false,
        blending: THREE.AdditiveBlending, toneMapped: false,
      }),
    );
    anel.rotation.x = Math.PI / 2;
    anel.position.y = .05;
    aura.add(anel);

    despertas.forEach((id, i) => {
      const angulo = (i / despertas.length) * Math.PI * 2;
      const orbe = new THREE.Mesh(geometria.clone(), new THREE.MeshBasicMaterial({
        color: ASSINATURAS[id]?.cor ?? 0xffffff,
        transparent: true, opacity: .95, depthWrite: false,
        blending: THREE.AdditiveBlending, toneMapped: false,
      }));
      orbe.position.set(Math.sin(angulo) * RAIO, .11, Math.cos(angulo) * RAIO);
      aura.add(orbe);
    });
    geometria.dispose();
  }

  return {
    handle(cena, evento) {
      // Cada fase reinicia skillLevels e masteries -- a aura tem de reiniciar
      // junto, senao ela sobrevive a uma build que ja acabou.
      if (evento.type === 'arena' || evento.type === 'start') {
        despertas = [];
        estados.clear();
        montar(cena);
        return;
      }

      if (evento.type === 'mastery') {
        if (!despertas.includes(evento.id)) despertas.push(evento.id);
        montar(cena);
        const cor = ASSINATURAS[evento.id]?.cor ?? evento.color;
        // Segunda batida, 0,25s depois da que a cena ja dispara. A primeira sai
        // na cor da HABILIDADE; esta sai na cor do DESPERTAR. Ler as duas em
        // sequencia e ler uma transformacao -- antes, tres maestrias do mesmo
        // ramo estouravam identicas porque so existia a cor do ramo.
        if (!cena.reducedMotion) cena.later(.25, () => {
          cena.burst(evento.x, evento.z, cor, 30, 3.4, { geo: 'crystal', size: 1.3, lift: 1.1, spread: .5 });
          cena.impactLight(evento.x, evento.z, cor, 34, 9, 1.5);
          cena.pulse(evento.x, evento.z, cor, 4.2, .9);
        });
        return;
      }

      if (cena.reducedMotion || !despertas.length) return;
      for (const id of despertas) {
        ASSINATURAS[id]?.ao?.[evento.type]?.(cena, evento);
      }
    },

    frame(cena, dt) {
      garantir(cena);
      const visivel = !!despertas.length && cena.playerMesh && cena.game?.phase !== 'menu';
      aura.visible = visivel;
      if (!visivel) return;

      aura.position.set(cena.playerMesh.position.x, 0, cena.playerMesh.position.z);
      if (!cena.reducedMotion) aura.rotation.y = cena.time * .8;

      if (cena.reducedMotion) return;
      for (const id of despertas) {
        const quadro = ASSINATURAS[id]?.quadro;
        if (!quadro) continue;
        if (!estados.has(id)) estados.set(id, {});
        quadro(cena, dt, estados.get(id));
      }
    },
  };
}
