import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMeta, seloStatus, useSigil, buyTalent } from '../src/legacy.js';
import { SELOS, seloPorId } from '../src/sigils.js';

// A ponte entre a arvore e a expedicao.
//
// O pedido do dono foi explicito sobre a forma: "tem ativas em cada build, mais
// de uma, mas so posso colocar uma, dai vem sinergia". Duas regras saem dessa
// frase e sao o que este arquivo protege:
//
//   1. o selo e conquistado descendo um RAMO, nao comprado avulso
//   2. so um entra na expedicao
//
// Sem a primeira, os selos viram uma loja paralela e a arvore continua sendo
// lista de compras. Sem a segunda, nao ha escolha, e sem escolha nao ha sinergia.

/** Um explorador rico e experiente, para isolar a regra do orcamento. */
function veterano(extra = {}) {
  return normalizeMeta({ shards: 500, scrap: 500, cores: 20, legacyXp: 100000, ...extra });
}

/** Desce o ramo ate o pre-requisito do selo. Nenhum selo sai sem isso. */
function descerAte(meta, id) {
  const selo = seloPorId(id);
  if (!selo.requer) return;
  const [talento, nivel] = selo.requer;
  for (let i = 0; i < nivel; i++) assert(buyTalent(meta, talento), `nao deu para comprar ${talento}`);
}

test('todo selo exige o ramo dele: ranque, talento, ou os dois', () => {
  // Um selo sem nenhuma exigencia seria compravel no primeiro minuto e nao diria
  // nada sobre a sua build.
  for (const selo of SELOS) {
    const exigencia = (selo.rank || 1) > 1 || selo.requer;
    assert(exigencia, `${selo.id} nao exige nada -- ele nao pertence a arvore, so esta ao lado dela`);
    if (selo.requer) {
      const [talento] = selo.requer;
      assert(talento, `${selo.id} declara requer sem talento`);
    }
  }
});

test('o pre-requisito de talento barra a compra, e some quando cumprido', () => {
  const ferrao = seloPorId('ferrao');           // requer power 2
  assert.deepEqual(ferrao.requer, ['power', 2]);

  const cru = normalizeMeta({ shards: 500, scrap: 500, cores: 20, legacyXp: 100000, power: 0 });
  const antes = seloStatus(cru, ferrao);
  assert(!antes.available, 'o Ferrao pode ser comprado sem a Chama ancestral');
  assert(antes.reason.includes('REQUER'), `razao pouco clara: ${antes.reason}`);
  assert(!useSigil(cru, 'ferrao'), 'comprou um selo sem cumprir o pre-requisito');
  assert.deepEqual(cru.sigils, []);

  buyTalent(cru, 'power'); buyTalent(cru, 'power');
  assert(seloStatus(cru, ferrao).available, 'cumpriu o pre-requisito e o selo continuou travado');
  assert(useSigil(cru, 'ferrao'));
  assert.deepEqual(cru.sigils, ['ferrao']);
  assert.equal(cru.sigil, 'ferrao');
});

test('comprar cobra uma vez; trocar entre os seus e de graca', () => {
  const m = veterano();
  descerAte(m, 'ferrao'); descerAte(m, 'ancora');
  const antesDaCompra = m.shards;

  assert(useSigil(m, 'ferrao'));
  const depoisDaCompra = m.shards;
  assert(depoisDaCompra < antesDaCompra, 'a compra do selo nao cobrou nada');

  assert(useSigil(m, 'ancora'));
  const depoisDaSegunda = m.shards;
  assert(depoisDaSegunda < depoisDaCompra, 'a segunda compra nao cobrou');

  // Voltar para um selo ja comprado nao pode custar de novo.
  assert(useSigil(m, 'ferrao'));
  assert.equal(m.shards, depoisDaSegunda, 'trocar entre selos ja comprados cobrou de novo');
  assert.equal(m.sigil, 'ferrao');
  assert.deepEqual([...m.sigils].sort(), ['ancora', 'ferrao']);
});

test('so um selo equipado, e voltar a jogar sem nenhum e possivel', () => {
  const m = veterano();
  descerAte(m, 'ancora'); descerAte(m, 'fenda');
  assert(useSigil(m, 'ancora'));
  assert(useSigil(m, 'fenda'));
  assert.equal(m.sigil, 'fenda', 'equipar o segundo nao trocou o equipado');
  assert.equal(m.sigils.length, 2, 'equipar um apagou a compra do outro');

  // Clicar no equipado desequipa: quem quiser as duas ativas de sempre precisa
  // poder voltar sem perder a compra.
  assert(useSigil(m, 'fenda'));
  assert.equal(m.sigil, null, 'nao deu para desequipar');
  assert.equal(m.sigils.length, 2, 'desequipar apagou a colecao');
});

test('o meta sobrevive a ida e volta, e nao aceita id inventado', () => {
  const m = veterano();
  descerAte(m, 'brasa-fria');
  assert(useSigil(m, 'brasa-fria'));

  const regravado = normalizeMeta(JSON.parse(JSON.stringify(m)));
  assert.deepEqual(regravado.sigils, ['brasa-fria'], 'o selo comprado nao sobreviveu ao salvamento');
  assert.equal(regravado.sigil, 'brasa-fria');

  const sujo = normalizeMeta({ ...m, sigils: ['brasa-fria', 'selo-pirata'], sigil: 'selo-pirata' });
  assert.deepEqual(sujo.sigils, ['brasa-fria']);
  assert.equal(sujo.sigil, null, 'um id inventado foi aceito como equipado');

  assert(!useSigil(m, 'selo-pirata'), 'comprou um selo que nao existe');
});

test('sem recursos o selo nao sai, e a bolsa fica intacta', () => {
  // Com o ramo descido mas a bolsa vazia -- senao o teste mediria o
  // pre-requisito em vez do orcamento.
  const pobre = normalizeMeta({ shards: 40, scrap: 40, cores: 0, legacyXp: 100000 });
  descerAte(pobre, 'ancora');
  pobre.shards = 0; pobre.scrap = 0;
  const ancora = seloPorId('ancora');
  const status = seloStatus(pobre, ancora);
  assert(!status.available);
  assert.equal(status.reason, 'FALTAM RECURSOS');
  assert(!useSigil(pobre, 'ancora'));
  assert.deepEqual(pobre.sigils, []);
  assert.equal(pobre.shards, 0, 'cobrou sem entregar');
});

test('a aba de talentos desenha a arvore, os travados e os selos do ramo', async () => {
  // O pre-requisito existia so no dado: `requires` tinha zero ocorrencias no
  // render antigo. Quem olhava a tela nao tinha como saber por que um botao
  // estava apagado, nem que os nos dependiam uns dos outros.
  const { Refuge } = await import('../src/refuge.js');
  const { BRANCHES } = await import('../src/legacy.js');
  const enfeite = { avatar: 'helm suit', icon: n => `<svg data-i="${n}"></svg>` };

  const cru = new Refuge(normalizeMeta({}), enfeite).talents();
  const conta = (html, re) => (html.match(re) || []).length;

  assert.equal(conta(cru, /data-sigil=/g), SELOS.length, 'nem todo selo apareceu na arvore');
  assert.equal(conta(cru, /data-talent=/g), 9, 'a arvore perdeu talentos');
  assert(conta(cru, /node-lock/g) > 0, 'nenhum no travado se identifica como travado');
  assert.equal(conta(cru, /talent-branch carrying/g), 0, 'um ramo se diz portador sem selo equipado');
  for (const b of BRANCHES) assert(cru.includes(`SELOS · EQUIPE UM`), `o ramo ${b.id} nao anuncia a camada de selos`);

  // Com um selo equipado, o ramo dele tem de se distinguir sem ler cartao.
  const m = veterano();
  descerAte(m, 'fenda');
  assert(useSigil(m, 'fenda'));
  const comSelo = new Refuge(m, enfeite).talents();
  assert.equal(conta(comSelo, /talent-branch carrying/g), 1, 'o ramo que carrega o selo nao se destaca');
  assert.equal(conta(comSelo, /EQUIPADO · Q/g), 1, 'o selo equipado nao diz que esta equipado');
  assert(conta(comSelo, /node-lock/g) < conta(cru, /node-lock/g), 'investir no ramo nao destravou nada');
});

test('o clique no selo passa pelo mesmo caminho do equipamento', async () => {
  const { Refuge } = await import('../src/refuge.js');
  const m = veterano();
  descerAte(m, 'ancora');
  const tela = new Refuge(m, { avatar: 'helm suit', icon: () => '' });

  const resposta = tela.act({ dataset: { sigil: 'ancora' } });
  assert(resposta?.changed, 'o clique no selo nao mudou nada');
  assert.equal(m.sigil, 'ancora');
  assert(resposta.message.includes('Q'), 'a mensagem nao diz qual tecla usar');
});
