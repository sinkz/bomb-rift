// A cerimonia de fim de fase: quanto tempo a arena fica com a palavra antes de
// a tela de vitoria subir, e o que essa tela diz.
//
// Existe porque a morte do guardiao era invisivel: defeatBoss() chamava
// clearStage(), o modal subia no mesmo instante e cobria o clipe 'Death' que o
// modelo ja tinha. O VFX estava pronto havia sessoes e ninguem nunca viu.
//
// Fica num arquivo so porque texto e tempo sao a mesma decisao. Quem desenha
// (finale-fx.js) e quem escreve (main.js) leem daqui e nao um do outro.

/** Segundos que a arena segura antes do modal, e a voz de cada desfecho. */
export const CERIMONIA = {
  // O duelo e o unico que ganha a janela inteira: e a unica morte de verdade.
  slain: { espera: 3.0, titulo: 'O guardião caiu.', tom: 'morte' },
  // A fuga ja teve a propria cinematica de 3,2s na transicao; repetir cansaria.
  routed: { espera: 1.2, titulo: 'Ele fugiu de você.', tom: 'fuga' },
  champion: { espera: 1.8, titulo: 'A fenda cedeu.', tom: 'campeao' },
};

const PADRAO = CERIMONIA.slain;

/**
 * Junta desfecho e mundo numa so peca, para a tela nao precisar decidir nada.
 * @param {'slain'|'routed'|'champion'} outcome
 * @param {object} biome  o mundo, de WORLDS
 */
export function finaleFor(outcome, biome) {
  const base = CERIMONIA[outcome] || PADRAO;
  const nome = biome?.boss || 'O GUARDIÃO';
  const manchete = outcome === 'champion' ? 'O CAMPEÃO CAIU.'
    : outcome === 'routed' ? `${nome} FUGIU.`
    : `${nome} CAIU.`;
  // A fala muda com o desfecho: quem morre tem epitafio, quem foge tem promessa.
  const fala = outcome === 'routed' ? (biome?.fleeLine || '')
    : outcome === 'slain' ? (biome?.deathLine || '')
    : '';
  return { ...base, manchete, fala, cor: biome?.color || '#ffd39b' };
}
