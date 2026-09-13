// O juramento.
//
// A fase da ~6 escolhas e o despertar pede 5 na MESMA habilidade -- margem de
// uma escolha so. O rollOffers ja tentava ajudar: reservava uma das tres vagas
// para algo que voce ja tinha, com peso pelo nivel. Isso funcionava melhor do
// que parecia, e funcionava EM SILENCIO: nada no jogo dizia que a vaga existia,
// entao a unica forma de descobri-la era reparar no padrao ao longo de dezenas
// de partidas.
//
// Medido com semente fixa, piloto que persegue cristais, 120 partidas por celula:
//
//                                   sem juramento   com juramento
//   quero ESTA habilidade                67%             81%
//   fico com a primeira que vier         77%             84%
//
// O juramento troca uma tendencia oculta por um contrato declarado. Na sua segunda escolha da
// fase voce nao esta so pegando uma habilidade: esta jurando a ela. Dali em
// diante ela ocupa SEMPRE uma das tres vagas, ate despertar.
//
// O compromisso tem preco, e o preco e o ponto: uma das tres vagas fica presa,
// entao voce ve menos descobertas pelo resto da fase. E voce pode trair o
// juramento a qualquer momento -- basta escolher outra coisa. So nao desperta.

/**
 * Em qual escolha da fase o juramento e feito.
 *
 * Dois e o unico numero que funciona, e nao e gosto. Com ~6 escolhas por fase e
 * 5 niveis ate o despertar, so sobra UMA escolha de folga. Jurar na terceira ja
 * tornaria o despertar impossivel na maioria das partidas -- seria devolver o
 * problema com outra roupa.
 */
export const ESCOLHA_DO_JURAMENTO = 2;

/** So habilidades com despertar podem ser juradas -- 'heal' e consumivel. */
export const podeSerJurada = skill => !!skill?.mastery;

/**
 * A escolha recem-feita vira juramento?
 *
 * Recebe a contagem DEPOIS do incremento, que e como o chooseSkill a mantem.
 */
export function viraJuramento(escolhasFeitas, juradaAtual, skill) {
  return !juradaAtual && escolhasFeitas === ESCOLHA_DO_JURAMENTO && podeSerJurada(skill);
}

/**
 * A vaga reservada da oferta.
 *
 * Devolve a habilidade jurada quando ela ainda esta disponivel, ou null -- que
 * acontece quando ela despertou e saiu do catalogo. Ai a vaga volta a ser livre
 * e a fase inteira vira descoberta, que e a recompensa por ter cumprido.
 */
export function vagaReservada(jurada, disponiveis) {
  if (!jurada) return null;
  return disponiveis.find(s => s.id === jurada) || null;
}

/** O juramento foi cumprido? Serve para o texto da interface, nao para a regra. */
export const juramentoCumprido = (jurada, masteries) => !!jurada && masteries.includes(jurada);

/**
 * Em qual nivel a habilidade desperta.
 *
 * Quatro para a jurada que NUNCA foi traida; cinco para todo o resto. O atalho e
 * premio de fidelidade perfeita, e nao da simples existencia do juramento --
 * medindo as duas versoes, dar o atalho so por ter jurado levava um piloto que
 * escolhe ao acaso de 10% para 22% de despertares acidentais, porque o juramento
 * e feito automaticamente na segunda escolha. Exigir fidelidade devolve a
 * separacao: quem nao se compromete quase nunca chega la.
 */
export function despertaEm(estado, id) {
  return estado.oath === id && !estado.oathBroken ? NIVEL_JURADO : NIVEL_LIVRE;
}

export const NIVEL_LIVRE = 5;
export const NIVEL_JURADO = 4;

/**
 * O teto de uma habilidade para ESTE jogador nesta fase.
 *
 * Tem de acompanhar o limiar, e nao ser uma constante. Quando o juramento
 * encurta o despertar para quatro, um teto fixo em cinco devolveria o defeito
 * que o dono relatou com as palavras dele -- "continua vindo as habilidades
 * depois que atinjo o maximo": voce despertaria no quarto e a carta voltaria na
 * oferta seguinte valendo um nivel que nao existe mais.
 *
 * O despertar e o teto. Sempre, nos dois limiares.
 */
export function tetoDe(estado, skill) {
  return skill?.mastery ? despertaEm(estado, skill.id) : skill.max;
}

/** A proxima escolha e a do juramento? Serve a interface, nao a regra. */
export const momentoDeJurar = estado =>
  !estado?.oath && (estado?.stats?.choices || 0) + 1 === ESCOLHA_DO_JURAMENTO;
