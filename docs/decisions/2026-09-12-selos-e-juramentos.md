# Selos e Juramentos — a terceira ativa e o despertar visível

**Data:** 2026-09-12 · **Status:** aplicado · **Escopo:** `src/mastery-fx.js`, `src/oath.js`, `src/sigils.js`, `src/sigil-fx.js`, `src/skills.js`, `src/game.js`, `src/legacy.js`, `src/refuge.js`, `src/main.js`, `src/hud.js`, `src/audio.js`, `src/scene.js`

## Contexto

O dono pediu três coisas para a meta-progressão:

1. uma árvore de skill com passivas
2. um modificador ao chegar no nível 5 de uma habilidade de fase
3. **uma terceira habilidade ativa**, escolhida na árvore

Duas delas já existiam. Depois de jogar com elas, ele voltou com a queixa que orientou todo o resto:

> *"Eu não sinto que a maestria muda muito, parece que continua vindo as habilidades depois que atinjo o máximo, não tem efeitos novos e tais como em outros roguelikes que fica com efeitos diferentes visuais ou algo que eu fale uau. A árvore poderia ser no formato árvore onde eu decido a build e tem ativas em cada build, mais de uma, mas só posso colocar uma, daí vem sinergia."*

## Diagnóstico — e duas correções minhas

**A maestria já existia e já funcionava.** `game.js:910` desperta no nível 5, e as quinze habilidades com despertar têm efeito real. Eu acusei cinco delas de inertes procurando por `masteries.includes(id)` no projeto; estava errado — metade aplica o efeito **uma vez, no próprio despertar**, como mudança de atributo (`p.fire='azure'`, `p.pierce=1`, `p.armor+=.2`). Despertando as quinze pelo caminho real e comparando o estado do jogador antes e depois, nenhuma é muda.

**A maestria também já era alcançável.** Eu reportei "23% para um piloto dedicado". Esse número estava errado por dois motivos: o harness passava `{ seed }` ao construtor do `Game`, que **só aceita `random`** — a opção era silenciosamente ignorada e a partida rodava em `Math.random`, sem reprodutibilidade; e o piloto ignorava cristais. Com semente fixa e um piloto que persegue cristais, a linha de base real é **67%**.

Sobram então os defeitos verdadeiros, todos descritos pelo próprio dono:

| # | Defeito | Evidência |
|---|---|---|
| 1 | `power` ia até o nível 8 e `health` até 6, mas o despertar dispara no 5 | você recebia a mensagem de clímax e a mesma carta voltava na oferta seguinte |
| 2 | 14 das 15 maestrias não mudavam nada visualmente | a aura era `0xf5dba1` dourado **fixo** para todas, e compartilhada com o escudo |
| 3 | os 25 poderes do jogo (16 de fase + 9 permanentes) são **todos números** | nenhum é uma ação; bomba e esquiva eram as únicas coisas que as mãos faziam |
| 4 | a árvore **não é uma árvore** | `requires` existe no dado e nunca era desenhado: zero ocorrências no render |

## Decisões

### A · O despertar é o teto, sempre

`max` de toda habilidade com maestria passa a ser `MASTERY_LEVEL`. Um teste estrutural falha se alguma nascer com teto acima do despertar.

Quando o juramento encurta o despertar para quatro, o teto acompanha (`tetoDe`). Um teto fixo em cinco devolveria o defeito 1 em escala menor: você despertaria no quarto e a carta voltaria valendo um degrau que não existe mais.

### B · Assinatura visual por maestria (`src/mastery-fx.js`)

Duas camadas:

- **universal** — a aura ganha um cristal na cor da maestria. Vale para as quinze de graça e para qualquer maestria futura sem escrever nada.
- **heroica** — cada maestria decora um evento que ela já provocava, para o poder aparecer onde ele acontece.

A camada heroica é **dado, não motor**: o sistema de partículas reescrito já tinge por cor e já tem oito sprites assados. Uma maestria nova entra com uma linha na tabela `ASSINATURAS`.

O anel dourado saiu do `scene.js`. Ficou lá só o escudo, que é outro assunto — ele conta cargas, não build.

### C · O Juramento (`src/oath.js`)

Na **segunda** escolha da fase você jura a uma habilidade. A jurada ocupa sempre uma das três vagas até despertar, e desperta na **quarta** em vez da quinta — enquanto você não a trair.

Dois é o único número que funciona: com ~6 escolhas por fase e 5 níveis, sobra uma escolha de folga. Jurar na terceira tornaria o despertar impossível na maioria das partidas.

**O atalho exige fidelidade perfeita.** Medido com semente fixa, 60 partidas por célula:

| | honra | não honra |
|---|---|---|
| atalho só para quem honra | 83% | **7%** |
| atalho por ter jurado, mesmo traindo | 83% | **27%** |

O portão não custa nada a quem se compromete e custa tudo a quem não se compromete — que é exatamente o que se quer de um juramento.

O ganho do juramento sobre a linha de base, 120 partidas por célula:

| modelo de jogador | sem juramento | com juramento |
|---|---|---|
| quero **esta** habilidade | 67% | **81%** |
| fico com a primeira que vier | 77% | **84%** |

O valor real não é só o ponto percentual. O `rollOffers` **já** tendia a reoferecer o que você tinha, com peso pelo nível, e nada no jogo dizia isso — a única forma de descobrir era reparar no padrão ao longo de dezenas de partidas. O juramento troca uma tendência oculta por um contrato declarado.

### D · Os Selos (`src/sigils.js`, `src/sigil-fx.js`)

Seis ativas, duas por ramo, uma equipada. Tecla **Q**, recarga própria no HUD ao lado da esquiva.

| ramo | selo | o que faz | recarga |
|---|---|---|---|
| Demolição | **Estouro** | detona todas as suas bombas em campo | 12s |
| Demolição | **Ferrão** | bomba sem pavio: estoura quando um inimigo encosta | 10s |
| Sobrevivência | **Âncora** | escudo + empurra a horda uma casa | 18s |
| Sobrevivência | **Sangria** | paga 15 de vida, devolve 5 por inimigo atingido | 14s |
| Mobilidade | **Fenda** | troca de lugar com a sua bomba mais distante | 10s |
| Mobilidade | **Brasa fria** | apaga o perigo do chão num raio de 2 e congela | 20s |

Regras que sustentam o desenho:

- **Nenhum selo inventa mecânica.** Cada um reusa um primitivo já testado: `explode()`, `applyFlame()`, `player.ward`, `hazardField.remove()`. O *Brasa fria* estava previsto — quando o perigo persistente fechou, o plano registrou `remove(x,z)` exposto *"para uma skill que apaga"*. O gancho existia e nunca tinha sido usado.
- **Todo selo exige descer o ramo dele.** Sem isso eles virariam uma loja paralela à árvore, compráveis no primeiro minuto, sem dizer nada sobre a build. Um teste guarda essa regra.
- **Um selo que não produziu efeito não gasta a recarga.** Perder vinte segundos por apertar o botão com a arena vazia puniria o reflexo, não o erro.
- **Equipar o equipado desequipa.** Voltar a jogar com duas ativas tem de ser possível sem apagar a compra.
- **Sem selo equipado, o jogo é o de sempre.** O medidor some por completo — um medidor vazio pedindo atenção seria pior que nenhum.

### E · A árvore desenhada como árvore (`src/refuge.js`)

Os três ramos passam a ter espinha vertical com os pré-requisitos desenhados, nós travados legíveis como travados, e os selos como a camada mais profunda de cada ramo.

## O que foi descartado

- **Apagar as maestrias que eu achava inertes.** Bom que não fiz: nenhuma era.
- **Baixar o despertar de 5 para 3.** Resolveria o número e mataria o significado.
- **Jurar na primeira escolha.** Mede 73% contra 67% — ganho pequeno por toda a agência: a primeira escolha é feita às cegas.
- **Uma ativa por habilidade de fase.** Dezesseis botões seria outro jogo.
- **Deixar equipar dois selos.** O dono desenhou melhor: com um só, o ramo vira identidade em vez de lista de compras.

## Detalhes de execução que mudaram o desenho

**O selo mora no dock, não numa barra de texto.** Eu tinha colocado o medidor em `.in-game-bottom`, a linha de texto ao pé da arena. Olhando a captura, o jogo tem um **dock de ações** de verdade — ESPAÇO/BOMBA, SHIFT/ESQUIVA, E/EVOLUIR, com keycap, arte e cortina de recarga. O selo virou a quarta vaga, herdando a forma da esquiva porque são irmãos: as duas únicas ações com recarga. Some por completo para quem não equipou nenhum.

Dois defeitos só apareceram medindo no navegador, nenhum deles visível no código:

- a tecla **Q** é posicionada em `top:-9px` por padrão, e o slot tem `overflow:hidden` para a cortina — a combinação decapitava a tecla. A esquiva já tinha resolvido isso trazendo a tecla para dentro; o selo segue o mesmo caminho.
- a borda de cada slot é pintada por classe em `pixel-interface.css` (`.ability-dock .bomb-action`, `.dash-action`). Minha regra estava no arquivo errado e perdia a cascata. O selo é o único slot cuja cor muda conforme o equipado, então é o único que lê a variável.

**Botão de toque.** No celular não há tecla Q — sem o botão, o selo seria uma habilidade que só existe no teclado.

**Inglês.** O teste `i18n.test.js` varre SKILLS, WORLDS, TALENTS, GEAR e afins exigindo texto autorado; os selos nasceram depois dessa lista e ficariam em português. `SELOS` entrou na varredura, junto com as chaves `nome` e `sinergia`, e as traduções vivem em `src/sigils-en.js`.

**Todo selo exige descer o ramo.** Três deles (Estouro, Âncora, Fenda) tinham nascido sem pré-requisito — compráveis no primeiro minuto, sem dizer nada sobre a build. O teste que exige a regra pegou isso antes de virar tela.

**Pendência conhecida, não introduzida aqui:** `bombRiftDev.audit()` acusa `.refuge-hero` cortando 60px na tela do Refúgio. Medido aba por aba, ele corta os mesmos 60px em **todas** — inclusive nas que este trabalho não tocou. É anterior e fica para uma rodada própria.

## A arte (2026-09-13)

Os seis selos nasceram usando arte **emprestada** das habilidades de fase — o *Estouro* mostrava o ícone de *Bolsos sem fundo*, a *Fenda* o de *Salto dimensional*. Na árvore isso punha o mesmo desenho em dois lugares com significados diferentes.

**Nove ícones novos**, gerados por `codex exec` com `gpt-6-astra` e a skill `imagegen` (`gpt-image-2`, cobrado na assinatura ChatGPT, sem chave de API). Saída 1254×1254 RGBA com alpha real — a documentação da skill afirma que `gpt-image-2` não tem transparência nativa e exige chroma-key; na prática tem.

Seis selos, a marca do Juramento, a vaga vazia, e a substituição do `talent-dash`.

### Duas regras que vieram de falhas medidas

Cada ícone foi julgado **a 40px, ao lado dos vizinhos que encontra na tela** — não em tamanho cheio, e não sozinho. Dois falharam nesse teste e as correções viraram regra no briefing:

1. **Emblema, não cena.** O `fenda` v1 eram dois portais frente a frente: a 40px, dois borrões roxos com a bomba — o assunto — desaparecida. O teste que ficou escrito no briefing: *se reduzido a uma silhueta preta sólida, ainda tem de se ler como um objeto reconhecível.*
2. **O centro é o elemento mais claro.** Nasceu revisando o `fenda` v2, cujo foco era a parte mais escura do ícone. Os três melhores do lote (`sangria`, `brasa-fria`, `estouro`) seguem a regra; o `ferrao`, gerado **antes** dela entrar em vigor, foi o único a falhar e precisou de v2.

### Ressalva registrada

O `talent-dash` novo ficou visualmente próximo do `skill-dash` — ambos raio mint. Distinguem-se pelos pinos de bronze contra o anel do portal, e os dois significam a mesma coisa (recarga da esquiva). É a convenção que já existia entre `skill-range` e `talent-reach`.

### Nada de 3D, nada de animação

Levantado antes de pedir: a biblioteca inteira é PNG **estático** dentro de um contêiner SVG, com todo o movimento vindo de CSS — frames quebrariam o contrato de `pixelArt()`. Os selos são só interface; o que aparece em cena é partícula e geometria procedural. Os únicos GLB do jogo são os seis guardiões, e nascem de script Blender versionado.

## Lição de método

Duas medições minhas estavam erradas nesta sessão, pelo mesmo motivo de fundo: **eu confiei no harness sem verificar que ele media o que eu achava.**

1. `{ seed }` não existe no construtor do `Game` — a opção era ignorada e tudo rodava em `Math.random`. Descoberto rodando a mesma semente três vezes e recebendo três resultados.
2. `masteries.includes(id)` era só um dos dois caminhos pelos quais uma maestria age. Descoberto despertando as quinze e comparando o estado do jogador.

Nos dois casos o erro só apareceu porque a medição foi **repetida de outra forma**. Vale como regra: um número que decide desenho precisa de duas leituras independentes antes de virar argumento.

## Verificação

```sh
npm test     # 226 (eram 194 no início do trabalho)
npm run build
```

Roteiro manual:

- jurar a uma habilidade na segunda escolha e honrar até o fim; o despertar tem de vir na **quarta**, com a aura na cor dela
- trair o juramento uma vez; o despertar volta a exigir **cinco**
- despertar duas maestrias na mesma fase; a aura tem de girar **duas cores**
- comprar um selo no Refúgio e usar com **Q**; o medidor ao lado da esquiva tem de acender
- desequipar o selo; o medidor tem de sumir e o jogo seguir com duas ativas
