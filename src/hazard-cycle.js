import { HazardField, planHazards, temRefugio, hazardKindFor } from './hazards.js';

// A brasa errante. Uma regiao avisa, acende, esfria e apaga; outra acende.
// A arena nao fica menor -- ela fica instavel.
//
// O diretor nao conhece Game. Ele recebe um contexto minimo a cada passo e
// devolve o que aconteceu. Quem aplica dano, desenha ou toca som e o chamador.

/** O ciclo de uma regiao, em segundos. O aviso vem antes de qualquer dano:
 *  e a emenda ao invariante I2, e nao pode ser removida por ajuste de gosto. */
export const CICLO = Object.freeze({ aviso: 1.2, acesa: 4.5, esfriando: 1.0, livre: 2.0 });

/** A assinatura de cada guardiao: a FORMA que o perigo dele toma. Reconhecivel
 *  de propósito -- o que varia por expedicao e onde, nao o que. */
export const ASSINATURA = Object.freeze({
  ruins: 'mancha', forge: 'veia', abyss: 'borda',
  garden: 'mancha', storm: 'veia', frost: 'borda',
});

/** Quantas regioes ardem ao mesmo tempo, por ato do guardiao. O aumento entra
 *  pela virada de ato, que ja tem texto, som e tremor -- nao precisa de aviso
 *  proprio. */
export const REGIOES_POR_ATO = Object.freeze([1, 1, 2, 3]);

/** Quanto dura um ciclo inteiro de uma regiao. */
export const CICLO_TOTAL = CICLO.aviso + CICLO.acesa + CICLO.esfriando + CICLO.livre;

const chave = (x, z) => `${x},${z}`;
const ORDEM = ['aviso', 'acesa', 'esfriando', 'livre'];

export class HazardDirector {
  /**
   * @param {object} opcoes
   * @param {string} opcoes.kind    tipo de perigo do mundo
   * @param {string} opcoes.forma   assinatura do guardiao
   * @param {HazardField} [opcoes.field]
   */
  constructor({ kind, forma = 'mancha', field = new HazardField() } = {}) {
    this.kind = kind;
    this.forma = forma;
    this.field = field;
    this.regioes = [];
    this.nascidas = 0;
    this.socorros = 0;   // quantas vezes o degrau a prova de xeque-mate disparou
  }

  get ativo() { return !!this.kind; }
  /** Casas que ferem AGORA. So as acesas: aviso e esfriando nao machucam. */
  get acesas() { return this.regioes.filter(r => r.estado === 'acesa').flatMap(r => r.cells); }

  /**
   * Um passo. Devolve os acontecimentos para o chamador traduzir em dano,
   * desenho e som.
   * @returns {Array<{tipo:'aviso'|'acendeu'|'esfriou'|'apagou'|'bate', cells:Array, kind:string}>}
   */
  update(dt, ctx) {
    if (!this.ativo) return [];
    const eventos = [];

    for (const regiao of this.regioes) {
      regiao.timer -= dt;
      if (regiao.estado === 'acesa') {
        regiao.pulso -= dt;
        if (regiao.pulso <= 0) {
          regiao.pulso = this.field.rules[this.kind]?.tick ?? .6;
          eventos.push({ tipo: 'bate', cells: regiao.cells, kind: this.kind });
        }
      }
      if (regiao.timer > 0) continue;

      const proximo = ORDEM[ORDEM.indexOf(regiao.estado) + 1];
      if (!proximo) { regiao.morta = true; eventos.push({ tipo: 'apagou', cells: regiao.cells, kind: this.kind }); continue; }
      regiao.estado = proximo;
      regiao.timer = CICLO[proximo];
      if (proximo === 'acesa') {
        for (const c of regiao.cells) this.field.add(c.x, c.z, this.kind);
        regiao.pulso = this.field.rules[this.kind]?.tick ?? .6;
        eventos.push({ tipo: 'acendeu', cells: regiao.cells, kind: this.kind });
      }
      if (proximo === 'esfriando') {
        // Para de ferir aqui, nao quando apaga: o jogador ganha de volta o chao
        // um segundo antes de a marca sumir, e nao ao contrario.
        for (const c of regiao.cells) this.field.remove(c.x, c.z);
        eventos.push({ tipo: 'esfriou', cells: regiao.cells, kind: this.kind });
      }
    }
    this.regioes = this.regioes.filter(r => !r.morta);

    const alvo = REGIOES_POR_ATO[Math.min(REGIOES_POR_ATO.length - 1, ctx.ato ?? 1)];
    // So conta quem ainda vai arder: regiao esfriando ja devolveu o chao.
    const vivas = this.regioes.filter(r => r.estado === 'aviso' || r.estado === 'acesa').length;
    if (vivas < alvo) {
      const nova = this.acender(ctx, alvo);
      if (nova) eventos.push({ tipo: 'aviso', cells: nova.cells, kind: this.kind });
    }
    return eventos;
  }

  /** Escolhe e agenda uma regiao. Devolve null quando nao ha lugar justo. */
  acender(ctx, alvo = 1) {
    const ocupadas = new Set(this.regioes.flatMap(r => r.cells).map(c => chave(c.x, c.z)));
    const blocked = new Set([...(ctx.blocked || []), ...ocupadas]);
    // Nunca sob os pes do jogador nem nas quatro vizinhas: ele tem de poder
    // recuar sem correr, e nao so sem morrer.
    const p = ctx.player;
    if (p) for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) blocked.add(chave(p.x + dx, p.z + dz));

    let cells = planHazards({ ...ctx, blocked }, { forma: this.forma, orcamento: ctx.orcamento ?? .07, semente: 2 });
    if (!cells.length) return null;

    // Garantia dura: depois de acender, ainda tem de existir casa limpa a pe.
    // Se nao tiver, encolhe a regiao ate ter. O teste assere que isso nunca
    // precisou acontecer -- se acontecer, o orcamento esta errado.
    const ensaio = new HazardField(this.field.rules);
    for (const c of this.field.list()) ensaio.add(c.x, c.z, c.kind);
    for (const c of cells) ensaio.add(c.x, c.z, this.kind);
    let guarda = cells.length;
    while (p && guarda-- > 0 && !temRefugio(ctx, ensaio, p)) {
      const solta = cells.pop();
      if (!solta) break;
      ensaio.remove(solta.x, solta.z);
      this.socorros++;
    }
    if (!cells.length) return null;

    // As primeiras irmas entram espacadas por uma fracao do ciclo, para que as
    // janelas acesas se emendem em vez de coincidir. Depois disso o atraso e
    // ZERO: a regiao que morre ja morreu na sua fase, e renascer na hora mantem
    // o rodizio. Atrasar de novo a cada renascimento afastaria todas para longe.
    const atraso = this.nascidas < alvo ? this.nascidas * (CICLO_TOTAL / alvo) : 0;
    this.nascidas++;
    const regiao = { cells, estado: 'aviso', timer: CICLO.aviso + atraso, pulso: 0 };
    this.regioes.push(regiao);
    return regiao;
  }

  /** Apaga tudo. Chamado quando a fase acaba ou o guardiao cai. */
  limpar() {
    this.regioes = [];
    this.nascidas = 0;
    this.field.clear();
  }
}

/** Monta o diretor do mundo, ou null quando o mundo nao tem perigo autorado. */
export function directorFor(biome, field) {
  const kind = hazardKindFor(biome);
  if (!kind) return null;
  return new HazardDirector({ kind, forma: ASSINATURA[biome?.id] || 'mancha', field });
}
