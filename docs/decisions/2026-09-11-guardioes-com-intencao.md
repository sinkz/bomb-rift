# Guardiões com intenção, seis entradas e o salto do primeiro duelo

**Data:** 2026-09-11 · **Status:** aplicado · **Escopo:** `src/boss-intent.js`, `src/boss-ai.js`, `src/campaign.js`, `tests/boss-simulation.test.js`, `tests/campaign.test.js`

Passos 4, 5 e 6 do GDD do perigo vivo. Fecham a etapa E5 do plano original e tudo que foi combinado nesta sessão.

## O achado que motivou o passo 4

`intelligence` é lido **só pela horda** (`game.js:328`, `:330`, `:345`), e a linha 330 exclui o chefe explicitamente. Ou seja: **a IA do guardião era idêntica em easy, medium e hard.** Subir a dificuldade o deixava mais duro — mais vida, mais dano, mais velocidade — nunca mais esperto.

E o que ele fazia era resolver `pathStep(ele, você)` e andar. Perseguição sem plano.

## Decisões

### 1. `boss-intent.js` decide *para onde*, `boss-ai.js` decide *quando*

A separação é essa. O `boss-ai` continua dono do relógio, do recuo, do desvio de bomba e da ruptura de bloqueio. O módulo novo responde três perguntas: qual passo fecha mais saídas, vale punir quem está longe, e encostar dói.

### 2. O cerco: caminho mínimo vira desempate

`respiro(game, bossEm)` conta quantas casas o jogador alcança em **dois passos**, fingindo o guardião numa posição. `passoDeCerco` escolhe o passo que **mais reduz esse número**; distância só desempata.

Duas salvaguardas:

- **Chão aceso não conta como ar.** Uma saída que queima não é saída — o cerco lê a brasa de graça.
- **Só cerca se de fato tirar ar.** Se nenhum passo reduz o respiro, devolve `null` e o `pathStep` de sempre assume. Cercar por cercar viraria dança.

### 3. O arremesso: kite eterno passa a custar

Longe, sem golpe em curso e com a recarga vencida, ele marca a casa do jogador. É golpe telegrafado como qualquer outro: passa por `carveSafeHouse`, tem `MIN_TELEGRAPH + .15` de aviso e entra em `warnings`. **Nenhuma regra nova de justiça** — ele usa as que já existiam.

### 4. Proximidade que alcança

O dano de contato de 24 já existia, mas exigia a **mesma casa**. Com o guardião andando a meio segundo por passo, quase nunca acontecia. Agora a casa vizinha também dói (14), com recarga própria de 1,5 s.

### 5. A dificuldade chega na cabeça dele

| | easy | medium | hard |
|---|---|---|---|
| cerca a partir do ato | 3 | 2 | 1 |
| arremessa a partir do ato | nunca | 2 | 1 |
| recarga do arremesso | — | 7 s | 5 s |
| fere a casa vizinha a partir do ato | 3 | 2 | 1 |

### 6. Seis entradas, mesmo orçamento, vozes diferentes

O ritmo de 2,9 s foi medido e aprovado jogando o MÓRTHOS, então **todos os seis usam o mesmo orçamento**. O que muda é a voz:

- **Vale dos Ecos** — tremor, fenda, escolta, pouso. O original.
- **Caldeira Rubra** — duas fendas seguidas: a fornalha racha antes de cuspir.
- **Maré Espectral** — quase sem tremor, duas levas de invocação. O que assusta ali é o número.
- **Jardim Voraz** — as raízes vêm antes do corpo: duas fendas antes de qualquer coisa pisar.
- **Cidadela do Trovão** — fenda seca, pausa, impacto. O trovão avisa antes de cair.
- **Coroa Glacial** — tremor longo, uma fenda só, e a chegada mais tardia de todas.

### 7. O primeiro duelo ganhou o salto que não tinha

Medido antes de mexer, o crescimento de arena do duelo sobre a caçada do próprio mundo:

| mundo | salto |
|---|---|
| **1** | **+26 casas** |
| 2 | +64 |
| 3 | +68 |
| 4 | +68 |
| 5 | +102 |
| 6 | +76 |

O primeiro duelo era o **único** que quase não crescia — e é o primeiro que o jogador conhece. Não era a arena que era pequena; era o salto que não acontecia.

A tupla da fase 3 foi de `17, 13` para `17, 15` (o `stageFor` expande +1 por lado, então 19×15 → 19×17). Salto de +26 para +60, alinhado com o resto.

**O que eu *não* fiz:** aumentar todas as arenas em duas casas por lado, como cogitado antes de medir. A medição não sustenta — com a brasa tomando ~11% do chão no ato 3 e o guardião cercando, arena maior ficaria **mais vazia**, não mais tensa. O problema era pontual e a correção é pontual.

## Verificação

**178 testes.** Os três novos são do tipo que a sessão inteira ensinou a escrever — os que provam que a coisa *acontece*, não só que existe:

- o toque respeita a própria recarga (dois toques nunca a menos de 1,4 s);
- o guardião **nunca sufocou** o jogador: `respiro` mínimo maior que zero nos três níveis, ao longo de 70 s de luta;
- no easy ele **não arremessou nenhuma vez**, no hard arremessou mais que no medium — a dificuldade muda o comportamento na prática, não só na tabela.

E as seis entradas são aferidas: batidas em ordem crescente, nenhuma depois do fim, exatamente uma chegada e ela é a última, e pelo menos 0,8 s de tela depois do pouso — senão a animação de entrada não aparece e voltaríamos ao problema que a cerimônia resolveu.

---

## Adendo: a regra das cores do perigo

Capturando os seis mundos, o perigo aparecia em todos — mas em cinco deles lia como **ladrilho decorativo**, não como ameaça. A medição achou o padrão:

| perigo | saturação original | como lia |
|---|---|---|
| lava | **79%** | perigo |
| ruína | 63% | cenário |
| vazio | 52% | cenário |
| trilho | 49% | cenário |
| espinho | 38% | cenário |
| gelo | 37% | cenário |

A lava era a única saturada, e era a única que lia como ameaça. **O que separa perigo de cenário não é o matiz — é a saturação.** Tom pálido da família do próprio bioma vira decoração, por mais contraste de luminância que tenha.

As seis passaram de 70%, **mantendo o matiz do mundo**: o tema fica intacto e a leitura muda. Um teste trava o piso de saturação e a tolerância de matiz, para que um ajuste de paleta futuro não devolva o perigo ao cenário.

### Nota de campo

Passei várias capturas em dúvida se o gelo aparecia, porque estava recortando o **centro** da arena. A assinatura da Coroa Glacial é `borda`: o perigo nasce no **anel do perímetro**. A prova só veio quando passei a projetar as casas acesas para coordenadas de tela e recortar exatamente em cima delas.

Vale como método: para conferir efeito posicional, pergunte ao jogo onde ele está em vez de apontar a câmera para onde você acha que deveria estar.

---

## Adendo 2026-09-12: o arremesso ganhou corpo, e o flipbook achou lugar

Duas pontas soltas que eu mesmo deixei, encontradas conferindo o que faltava.

### O arremesso era meio mudo

Correção ao diagnóstico inicial: a **animação já funcionava**. O evento `warning` dispara `actor.prepare()` em `scene.js`, então o guardião fazia o gesto. O que não existia era o **projétil** — nada viajava dele até a marca, e quem jogasse veria a marca nascer sozinha e leria como defeito.

`src/throw-fx.js` resolve, e a decisão que importa é a duração: o projétil **recebe a duração do telégrafo** em vez de ter velocidade própria, então pousa exatamente quando a marca estoura. Velocidade fixa faria ele chegar cedo ou tarde conforme a distância, e a promessa do telégrafo quebraria.

Um sprite novo foi assado no Blender — `bolt`, cabeça quente com cauda afinando. Ele tem **frente**, que é o que o `spark` (simétrico) não tem, e é por isso que serve para dizer para onde a coisa vai. Entrou na oitava célula do atlas, que estava vazia desde o primeiro assamento — nenhum arquivo cresceu de tamanho.

O que mais ajuda a leitura não é o projétil em si, que é rápido: é o **rastro de brasas** ligando o guardião ao ponto de impacto.

### O flipbook finalmente é usado

Dezesseis quadros de fumaça assados junto com os sprites, que eu chamei de "o pulo do gato" num relatório e nunca liguei em lugar nenhum — oversell meu.

O lugar certo apareceu sozinho: o **halo do chão em brasa**. Ele era um sprite parado que dizia "o chão está aceso"; agora percorre os 16 quadros e diz "o chão está vivo". Funciona porque cada mundo tem um perigo só, então todas as casas acesas compartilham o material e basta mover o `offset` da textura uma vez por quadro de cena — sem shader por instância.
