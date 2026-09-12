// Perigo persistente: campo de dano sobre o chao, nao terreno.
//
// A decisao que molda o modulo inteiro: perigo NAO e um tipo de casa novo. Um
// `tile === 3` seria lido como parede por walkable(), blastCells(), open() e
// pelo flood fill dos testes -- lava viraria muro. Entao ele vive numa lista
// propria, indexada por casa, e o chao continua sendo chao.
//
// Consequencia direta: como perigo nao bloqueia passagem, ele nunca desconecta
// a arena. O que ele pode fazer e pior e mais sutil -- encurralar o jogador num
// canto sem casa limpa. E por isso que o planejador trabalha com orcamento.

/**
 * Regras por tipo. Cada uma e uma estrategia: o que o chao faz com quem pisa.
 * `effect: 'snare'` reusa o caminho que applyFlame ja conhece e nao emite dano.
 */
// A regra das cores, achada capturando os seis mundos em 2026-09-11: o que
// separa "perigo" de "cenario" nao e o matiz, e a SATURACAO. As cores primeiras
// eram tons palidos da familia do proprio bioma -- gelo azul-claro sobre chao
// azul, vazio teal sobre chao teal -- e liam como ladrilho decorativo. A lava,
// unica saturada desde o inicio, era a unica que lia como ameaca.
//
// Entao todas passam de 70% de saturacao, mantendo o matiz do mundo: o tema
// fica intacto e a leitura muda. Ha um teste que trava esse piso.
export const HAZARD_RULES = {
  lava:   { damage: 16, effect: null,    tick: 0.55, color: 0xff7d35, sprite: 'ember', nome: 'lava' },
  gelo:   { damage: 0,  effect: 'snare', tick: 0.9,  color: 0x3ecfff, sprite: 'crack', nome: 'gelo' },
  vazio:  { damage: 12, effect: null,    tick: 0.7,  color: 0x22e6cb, sprite: 'glow',  nome: 'vazio' },
  espinho:{ damage: 10, effect: null,    tick: 0.8,  color: 0x7bf246, sprite: 'spark', nome: 'espinhos' },
  trilho: { damage: 14, effect: null,    tick: 0.5,  color: 0xffc71c, sprite: 'spark', nome: 'trilho' },
  ruina:  { damage: 11, effect: null,    tick: 0.75, color: 0xff9430, sprite: 'smoke', nome: 'desmoronamento' },
};

/** Qual perigo cada mundo respira. Fica aqui, e nao em WORLDS, para o conceito
 *  inteiro de perigo morar num arquivo so. */
export const HAZARD_BY_BIOME = {
  ruins: 'ruina', forge: 'lava', abyss: 'vazio',
  garden: 'espinho', storm: 'trilho', frost: 'gelo',
};

export const hazardKindFor = biome => HAZARD_BY_BIOME[biome?.id] || null;

const chave = (x, z) => `${x},${z}`;

/**
 * O campo em si. Nao conhece Game, nao conhece Three.js: recebe casas, guarda
 * casas, responde sobre casas. E o que permite testar perigo sem simular nada.
 */
export class HazardField {
  constructor(rules = HAZARD_RULES) {
    this.rules = rules;
    this.celulas = new Map();
  }

  get size() { return this.celulas.size; }
  get vazio() { return this.celulas.size === 0; }

  has(x, z) { return this.celulas.has(chave(x, z)); }
  get(x, z) { return this.celulas.get(chave(x, z)) || null; }

  /** Devolve a casa criada, ou null se o tipo nao existe. Nunca lanca: um tipo
   *  desconhecido e bug de dados, e derrubar a partida por isso seria pior. */
  add(x, z, kind) {
    const regra = this.rules[kind];
    if (!regra) return null;
    const celula = { x, z, kind, regra, idade: 0 };
    this.celulas.set(chave(x, z), celula);
    return celula;
  }

  remove(x, z) { return this.celulas.delete(chave(x, z)); }
  clear() { this.celulas.clear(); }

  /** Iteravel de casas, para o mapa de perigo e para quem desenha. */
  list() { return [...this.celulas.values()]; }
  keys() { return [...this.celulas.keys()]; }

  /** Envelhece o campo. Quem aplica dano e o chamador -- o campo so conta o
   *  tempo e diz quais casas estao no momento de bater. */
  tick(dt) {
    const prontas = [];
    for (const celula of this.celulas.values()) {
      celula.idade += dt;
      if (celula.idade >= celula.regra.tick) { celula.idade = 0; prontas.push(celula); }
    }
    return prontas;
  }
}

/**
 * Planejador. Recebe um contexto minimo -- nada de Game -- e devolve as casas
 * que viram perigo. Puro: mesma entrada, mesma saida.
 *
 * @param {object} ctx
 * @param {number} ctx.width  @param {number} ctx.height
 * @param {(x:number,z:number)=>number} ctx.tile   0 = chao livre
 * @param {Set<string>} ctx.blocked  casas proibidas, no formato "x,z"
 * @param {()=>number} ctx.random
 * @param {'borda'|'veia'|'mancha'} forma
 * @param {number} orcamento  fracao maxima do chao livre que pode virar perigo
 */
export function planHazards(ctx, { forma = 'mancha', orcamento = 0.18, semente = 3 } = {}) {
  const { width, height, tile, blocked, random } = ctx;
  const livres = [];
  for (let z = 1; z < height - 1; z++) {
    for (let x = 1; x < width - 1; x++) {
      if (tile(x, z) !== 0) continue;
      if (blocked.has(chave(x, z))) continue;
      livres.push({ x, z });
    }
  }
  if (!livres.length) return [];

  const teto = Math.max(1, Math.floor(livres.length * orcamento));
  const cx = (width - 1) / 2, cz = (height - 1) / 2;

  let candidatas;
  if (forma === 'borda') {
    // Anel: aperta o espaco util sem cortar o meio, onde a luta acontece.
    const raio = Math.min(cx, cz) - 1.5;
    candidatas = livres.filter(c => Math.max(Math.abs(c.x - cx), Math.abs(c.z - cz)) >= raio);
  } else if (forma === 'veia') {
    // Faixas: corredores perigosos que atravessam a arena.
    candidatas = livres.filter(c => (c.z + Math.floor(c.x / 3)) % 4 === 0);
  } else {
    // Manchas semeadas: pocas espalhadas, cada uma crescendo do seu centro.
    const centros = [];
    for (let i = 0; i < semente; i++) centros.push(livres[Math.floor(random() * livres.length)]);
    candidatas = livres.filter(c => centros.some(s => Math.abs(c.x - s.x) + Math.abs(c.z - s.z) <= 2));
  }

  if (candidatas.length > teto) {
    // Corta pelas mais distantes do centro: o meio da arena continua jogavel.
    candidatas = candidatas
      .slice()
      .sort((a, b) => (Math.abs(b.x - cx) + Math.abs(b.z - cz)) - (Math.abs(a.x - cx) + Math.abs(a.z - cz)))
      .slice(0, teto);
  }
  return candidatas;
}

/**
 * A promessa que o perigo persistente nao pode quebrar: a partir de onde o
 * jogador esta, sempre existe uma casa limpa alcancavel a pe.
 *
 * Nao e enfeite de teste -- e a checagem que o jogo roda antes de aplicar um
 * plano. Se falhar, o chamador remove casas ate passar.
 */
export function temRefugio(ctx, campo, de, passos = 4) {
  const { width, height, tile } = ctx;
  const vistos = new Set([chave(de.x, de.z)]);
  let borda = [de];
  for (let passo = 0; passo <= passos; passo++) {
    const proxima = [];
    for (const c of borda) {
      if (!campo.has(c.x, c.z)) return true;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const x = c.x + dx, z = c.z + dz;
        if (x < 1 || z < 1 || x >= width - 1 || z >= height - 1) continue;
        const k = chave(x, z);
        if (vistos.has(k) || tile(x, z) !== 0) continue;
        vistos.add(k); proxima.push({ x, z });
      }
    }
    if (!proxima.length) break;
    borda = proxima;
  }
  return false;
}
