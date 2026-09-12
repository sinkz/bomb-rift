import * as THREE from 'three';

// A marca do jogador no chao.
//
// Relatado por um teste de olhos frescos: "nao da de achar o personagem -- e so
// um cubinho entre os cubinhos, voce adivinha pelo contexto". Confirmado
// olhando as capturas: o que localizava o heroi era a barra de vida flutuante e
// o numero de dano, nao o personagem. Sem dano na tela, voce cacava o proprio
// avatar.
//
// A marca e deliberadamente NEUTRA -- quase branca, igual nos seis mundos. Cor
// de bioma diria "voce pertence a este lugar"; o que ela precisa dizer e "voce
// e o unico assim".

const COR = 0xfff0d4;

export function criarPlayerMark(fontes) {
  let anel = null, halo = null, cenaAtual = null;

  function garantir(cena) {
    if (anel && cenaAtual === cena) return true;
    if (!fontes?.ring) return false;
    const textura = new THREE.TextureLoader().load(fontes.ring);
    textura.colorSpace = THREE.SRGBColorSpace;
    textura.generateMipmaps = false;
    textura.minFilter = THREE.LinearFilter;

    const plano = new THREE.PlaneGeometry(1, 1);
    const fazer = (opacidade, ordem) => {
      const m = new THREE.Mesh(plano, new THREE.MeshBasicMaterial({
        color: COR, map: textura, transparent: true, opacity: opacidade,
        depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
      }));
      m.rotation.x = -Math.PI / 2;
      m.renderOrder = ordem;
      return m;
    };
    // Dois aneis: o de dentro marca a casa, o de fora respira. Um so ficava
    // ou discreto demais para achar, ou grosso demais e virava outro efeito.
    anel = fazer(.85, 5);
    halo = fazer(.28, 4);
    // Fora de cena.fx: aquele grupo e limpo a cada buildArena, e a marca tem de
    // sobreviver a remodelagem da arena no meio do duelo.
    cena.scene.add(anel, halo);
    cenaAtual = cena;
    return true;
  }

  return {
    frame(cena, dt) {
      if (!garantir(cena)) return;
      const jogador = cena.playerMesh;
      const vivo = jogador && cena.game?.phase !== 'menu';
      anel.visible = halo.visible = !!vivo;
      if (!vivo) return;

      anel.position.set(jogador.position.x, .045, jogador.position.z);
      halo.position.set(jogador.position.x, .035, jogador.position.z);

      // Respiracao lenta. Em prefers-reduced-motion a marca fica parada, mas
      // continua la -- ela e informacao, nao enfeite.
      const pulso = cena.reducedMotion ? 1 : 1 + .06 * Math.sin(cena.time * 2.4);
      anel.scale.setScalar(1.42 * pulso);
      halo.scale.setScalar(2.15 * pulso);

      // Protegido: a marca engrossa e clareia, dizendo o status sem roubar o
      // lugar do nome na plaqueta.
      const protegido = (cena.game?.player?.invincible || 0) > .1;
      anel.material.opacity = protegido ? .95 : .8;
      halo.material.opacity = protegido ? .5 : .26;
    },
  };
}
