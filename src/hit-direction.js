import * as THREE from 'three';

// De onde veio a pancada.
//
// Relatado jogando: "levei dano mas nao fica claro DE ONDE. Qual inimigo me
// atingiu? Pisquei e perdi?". O jogo mostrava o numero de dano na sua casa --
// que e a unica informacao que o jogador ja tinha.
//
// Duas leituras, uma para cada distancia:
//   perto  um arco no chao, do seu lado, apontando para a origem
//   longe  um risco ligando a origem ate voce, para dano de outra ponta da arena
//
// Cor por tipo, porque "quem" importa tanto quanto "onde": o chao tem a cor do
// perigo, o guardiao a do mundo, a horda a cor de sangue, a sua propria bomba
// um ambar -- reconhecer que a culpa foi sua tambem e informacao.

const CORES = {
  chao: 0xff9430,
  boss: null,     // preenchida com a cor do mundo em tempo de uso
  golpe: null,
  bomba: 0xffae55,
  padrao: 0xff4359,
};

export function criarHitDirection() {
  let arco = null, risco = null, cenaAtual = null;
  let vida = 0, duracao = .55;

  function garantir(cena) {
    if (arco && cenaAtual === cena) return;
    // Um setor de anel: grosso do lado de onde veio, invisivel do outro. E a
    // forma mais direta de dizer "daquele lado" sem escrever nada.
    arco = new THREE.Mesh(
      new THREE.RingGeometry(.62, .95, 24, 1, -Math.PI / 5, (Math.PI * 2) / 5),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide }),
    );
    arco.rotation.x = -Math.PI / 2;
    arco.renderOrder = 6;
    arco.visible = false;

    risco = new THREE.Mesh(
      new THREE.PlaneGeometry(1, .09),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide }),
    );
    risco.rotation.x = -Math.PI / 2;
    risco.renderOrder = 6;
    risco.visible = false;

    cena.scene.add(arco, risco);
    cenaAtual = cena;
  }

  return {
    handle(cena, evento) {
      if (evento.type !== 'hurt' || !evento.de) return;
      garantir(cena);

      const [ax, az] = cena.at(evento.x, evento.z);
      const [ox, oz] = cena.at(evento.de.x, evento.de.z);
      const dx = ox - ax, dz = oz - az;
      const distancia = Math.hypot(dx, dz);
      // Dano na propria casa (chao em brasa) nao tem direcao: mostra o anel
      // inteiro em vez de apontar para lugar nenhum.
      const anguloParaOrigem = distancia < .2 ? null : Math.atan2(dx, dz);

      const cor = new THREE.Color(
        CORES[evento.de.tipo] ?? (['boss', 'golpe'].includes(evento.de.tipo)
          ? (cena.game.biome?.color || CORES.padrao) : CORES.padrao));

      arco.material.color.copy(cor);
      risco.material.color.copy(cor);
      arco.position.set(ax, .06, az);
      arco.rotation.z = anguloParaOrigem === null ? 0 : -anguloParaOrigem;
      arco.scale.setScalar(anguloParaOrigem === null ? 1.5 : 1.25);
      arco.visible = true;

      // O risco so vale a pena quando a origem esta longe o bastante para voce
      // nao a ter visto -- de perto ele vira sujeira em cima do arco.
      const longe = distancia > 2.2;
      if (longe) {
        risco.position.set((ax + ox) / 2, .05, (az + oz) / 2);
        risco.rotation.z = -Math.atan2(dx, dz) + Math.PI / 2;
        risco.scale.set(distancia, 1, 1);
      }
      risco.visible = longe;

      vida = duracao;
    },

    frame(cena, dt) {
      if (vida <= 0) return;
      vida = Math.max(0, vida - dt);
      const k = vida / duracao;
      // Acende forte e some rapido: e um aviso, nao um enfeite que fica.
      const alpha = k ** 1.6;
      arco.material.opacity = .9 * alpha;
      risco.material.opacity = .55 * alpha;
      if (vida <= 0) { arco.visible = false; risco.visible = false; }
    },
  };
}
