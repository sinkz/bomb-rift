# BOMB RIFT — seis guardiões e ranking global
Data: 05/09/2026 · Base: versão 2.4, commit 4664281
Estado: proposta para revisão. Esta entrega contém planejamento e conceito visual; não altera o jogo publicado.

## 1. Direção consolidada

A pixel art é a referência visual principal dos chefes. O atlas mostra arte 2D; a arena usa a versão 3D do mesmo personagem, com silhueta, paleta, proporções e acessórios correspondentes. Revisar os três modelos existentes e criar três guardiões inéditos para os mundos seguintes.

O ranking passa a ser global, com resultados persistentes, explicação dos pontos e divulgação opcional de um projeto do jogador. A publicação da ficha acontece por uma ação explícita na tela de resultado. Cliques no projeto são uma métrica separada dos pontos de jogo.

**Hipótese inicial para o perfil:** sem login obrigatório, com identidade emitida pelo servidor e mantida neste navegador. A preferência por login foi perguntada e ainda pode alterar esta parte do plano. Recuperação entre dispositivos fica para uma etapa seguinte.

## 2. O que existe hoje

- A campanha tem seis mundos, três fases por mundo e novas ascensões após as primeiras 18 fases.
- Mórthos, Vulkar e Nyxara são reutilizados em Jardim, Trovão e Gelo.
- Já existem retratos pixel art, mas o atlas sobrepõe a eles a prévia WebGL.
- O ranking salva dez resultados no navegador. A fórmula usa abates, cristais, níveis, tempo e vitória.
- A simulação registra alguns totais, mas ainda precisa medir bombas, dano efetivo e os demais feitos de forma consistente.
- A simulação é separada da renderização e aceita uma fonte de aleatoriedade: uma boa base para estudar validação por replay.
- A conexão com o Blender respondeu; a cena aberta é a padrão. Os modelos existentes estão em arquivos do projeto.

Referências locais: [campanha](../../src/campaign.js), [ranking](../../src/ranking.js), [atlas](../../src/pixel-atlas.js), [simulação](../../src/game.js), [modelos](../../src/boss-models.js) e [fontes GLB](../../src/boss-sources.js).

## 3. Direção visual dos seis chefes

| Mundo | Guardião | Referência que o modelo 3D deve seguir |
| --- | --- | --- |
| Vale dos Ecos | MÓRTHOS | Rocha violeta, corpo largo e compacto, chifres curvos, ombreiras arredondadas, contornos dourados e cristal violeta dentro do sino. |
| Caldeira Rubra | VULKAR | Armadura escura de carvão, rachaduras de lava, chifres dourados, mãos pesadas e grelha incandescente no peito. |
| Maré Espectral | NYXARA | Figura alongada, manto turquesa, coroa clara ramificada, joias e cajado com cristal verde-água. |
| Jardim Voraz | BRIAROK — O jardim faminto | Criatura vegetal de quatro apoios, raízes grossas, boca de pétalas carmim e núcleo âmbar. |
| Cidadela do Trovão | FULGRA — A tecelã da tempestade | Aranha mecânica de seis pernas, cobre e ferro escuro, reator ciano integrado ao corpo e para-raios nas costas. |
| Coroa Glacial | NIVOR — O bastião glacial | Urso quadrúpede imenso, grandes patas dianteiras, placas glaciais como uma fortaleza e coração cristalino. |

[Prancha dos três conceitos novos](assets/guardians-concept.png). Gerada com ImageGen; [prompt completo](assets/guardians-concept-prompt.md).

A prancha estabelece a identidade dos novos chefes. Antes de modelar, produzir retratos individuais com transparência e detalhes simplificados para a escala real da interface. As seis artes precisam compartilhar densidade de pixels e nível de detalhe; a prancha não deve ser recortada diretamente e tratada como spritesheet final.

### Do pixel para o 3D

1. Fixar a arte frontal e criar vistas auxiliares coerentes. Verso e áreas ocultas serão interpretações documentadas.
2. Modelar primeiro as grandes massas e comparar com o retrato na mesma câmera: cabeça, torso, largura, membros e acessórios.
3. Usar volumes facetados e texturas de resolução controlada, com amostragem nítida. Traduzir o desenho para volume, sem transformar cada pixel em um cubo.
4. Ajustar materiais para preservar as cores sob a iluminação da arena; emissão concentrada em olhos, cristais, lava e circuitos.
5. Manter mãos conectadas aos braços, armas realmente presas e apoios no chão. Elementos flutuantes só quando fizerem parte explícita do conceito.
6. Exportar GLB com pivô no chão, escala e área de colisão coerentes. Examinar tanto em fundo neutro quanto no cenário atual.

O resultado esperado é reconhecer imediatamente o mesmo chefe ao alternar atlas e combate. O cenário, o personagem do jogador e a direção da HUD permanecem como base aprovada.

### Animações necessárias

| Chefe | Movimento e identidade | Ação característica |
| --- | --- | --- |
| Mórthos | Passos curtos pesados; oscilação do cristal | Preparação do sino e impacto no chão |
| Vulkar | Passadas de peso; respiração da fornalha | Pressurização do peito e erupção |
| Nyxara | Flutuação intencional; tecido e cajado coordenados | Conjuração e abertura de selo |
| Briarok | Caminhada alternada de raízes; respiração das pétalas | Enraizar, cuspir sementes e abrir a boca vulnerável |
| Fulgra | Seis pernas com apoios alternados e corpo estável | Carregar condutores, descarregar e entrar em curto |
| Nivor | Marcha quadrúpede pesada; patas apoiadas | Erguer as patas, golpear e quebrar a couraça |

Todos recebem entrada, repouso, movimento, preparação, ataque, reação ao dano, atordoamento/vulnerabilidade e morte. A animação de preparação termina no instante indicado pelo aviso no chão; o dano não depende de um efeito visual solto.

**Entrega para avaliação:** arte e modelo lado a lado, três ângulos, vídeo curto dos ciclos e prévia na câmera do jogo. Revisar Mórthos primeiro para validar o método antes de refazer os demais. Integrar os modelos depois da avaliação das prévias.

## 4. Atlas 2D

- Trocar a prévia 3D por um retrato pixel art grande, com moldura e acentos do mundo.
- Exibir nome, título, frase, mecanismo principal e dificuldade sem aumentar a quantidade de painéis.
- Manter “Provocar”: pequena animação do retrato, resposta e efeito sonoro. Não oferecer “arrastar para girar” em uma imagem 2D.
- Reduzir movimento quando solicitado nas configurações/sistema.
- Carregar os GLBs quando forem necessários na arena; o atlas não precisa iniciar um renderizador de chefes.
- Traduzir títulos, descrições e interações para PT/EN. Nomes próprios permanecem consistentes.

## 5. Novos encontros

Cada mundo tem um guardião próprio. Ele pode reaparecer nas três fases daquele mundo, com o repertório apresentado aos poucos. O encerramento do mundo usa o conjunto completo.

### BRIAROK — controlar o crescimento

Frase: “Tudo o que cai aqui vira raiz.”

- **Jardim que fecha:** raízes temporárias crescem em posições avisadas. São destrutíveis e o posicionamento conserva rotas de fuga.
- **Semeadura:** projéteis de sementes marcam regiões antes do impacto; algumas originam vagens que podem ser destruídas.
- **Janela de ataque:** destruir duas vagens conectadas força Briarok a abrir as pétalas e expor o coração por alguns segundos.
- **Abaixo de metade da vida:** alterna sementes e raízes, mantendo intervalo para reposicionamento.
- Juice: pétalas retraindo ao dano, seiva luminosa, raízes rachando e som grave de madeira.

### FULGRA — transformar a arena em circuito

Frase: “Você já faz parte do circuito.”

- **Condutores:** ativa pares de postes em células livres. O trajeto da descarga aparece antes de energizar.
- **Curto provocado:** explodir um condutor durante a carga interrompe aquela linha e atordoa a chefe.
- **Rede cruzada:** muda os pares conectados; os caminhos são retos e legíveis na grade.
- **Abaixo de metade da vida:** duas cargas alternadas, com uma rota segura claramente visível.
- Juice: pernas travando durante o curto, arcos entre peças conectadas, reator pulsante e faíscas de cobre.

### NIVOR — quebrar a fortaleza

Frase: “A última aurora será minha.”

- **Muralha de gelo:** cria obstáculos temporários em espaços livres; podem ser quebrados com bombas.
- **Impacto glacial:** ergue as patas e anuncia uma linha de fissuras antes de bater. A animação comunica peso.
- **Couraça partida:** sucessivos impactos de bombas quebram placas da armadura e revelam o coração; sinais claros mostram o progresso.
- **Abaixo de metade da vida:** perde parte da proteção e passa a alternar investidas anunciadas com muralhas.
- Juice: placas se desprendendo, rachaduras luminosas, neve no impacto e rugido que faz os cristais vibrarem.

### Regras de combate preservadas

Avisos legíveis, tempo de reação inicial generoso, nenhum obstáculo aparecendo em cima do jogador ou fechando a única saída. Transformações devem considerar bombas e inimigos na grade. Limpar obstáculos temporários ao fim da luta. Partículas residuais de explosão não causam dano; um novo ataque precisa de aviso próprio. Tremor, flashes e partículas devem ter intensidade ajustável e limite em mobile.

## 6. Resultado: a história da expedição

Fluxo proposto:

**Vitória ou derrota → conquistas e pontos → ficha pública opcional → refúgio.**

A tela tem retrato do guardião, resultado, fase/ascensão, pontuação animada e recorde pessoal. Em seguida mostra três grupos:

- **Combate:** abates por categoria, chefe/minichefe, bombas colocadas e detonadas, dano causado, maior combo.
- **Sobrevivência:** duração total, tempo contra chefe, dano recebido, cura, golpes bloqueados, esquivas e revives.
- **Construção da build:** níveis conquistados, escolhas de skills, despertares, relíquias, caixas quebradas e recursos coletados.

“Como ganhei esses pontos” abre as parcelas da fórmula. Medir um feito não significa premiar sua repetição: colocar bombas no vazio e receber dano deliberadamente não rendem pontos.

O jogo atual encerra uma expedição a cada fase. Portanto, cada vitória ou morte gera uma ficha. Vencer a fase 18 conclui uma ascensão e recebe uma apresentação especial; a campanha continua. Não somar infinitas tentativas para dominar o ranking. Um modo futuro de sequência completa pode ter classificação própria.

### Instrumentação correta

- Contar uma bomba somente quando ela foi colocada com sucesso. Separar explosões originais, reações em cadeia e ecos.
- Medir dano efetivo limitado à vida que o alvo tinha antes do golpe, evitando contabilizar dano excedente.
- Separar dano no chefe, minichefes e demais inimigos; separar vida perdida, mitigação e cura do jogador.
- Categorias de abates são exclusivas: um minichefe não recebe também os pontos de inimigo comum.
- Guardar o maior combo e os despertares únicos, com limites explícitos para bônus.
- Dano causado será exibido, mas não dará pontos diretamente na primeira fórmula, evitando exploração de inimigos que recebem cura repetidamente.
- Finalizar a ficha uma única vez e manter os valores imutáveis após vitória/morte.

## 7. Pontuação proposta — versão inicial para balanceamento

**Total = piso((combate + exploração + build + desempenho) × dificuldade).**

| Parcela | Pontos propostos |
| --- | --- |
| Inimigo comum derrotado | 100 |
| Minichefe derrotado | 600 |
| Guardião derrotado | 2.000 |
| Caixa destruída | 10, até 500 por expedição |
| Cristal coletado | 5, até 500 |
| Nível conquistado na expedição | 80, até 800 |
| Despertar de uma skill | 250 por despertar único, até 750 |
| Vitória | 1.000 |
| Maior combo | 25 por abate do maior combo, até 500 |
| Velocidade contra o chefe, na vitória | máximo entre 0 e 600 − 5 × segundos inteiros do confronto |
| Vida restante, na vitória | piso(300 × vida atual / vida máxima) |
| Vitória sem perder vida durante a expedição | 500 |

Dificuldade em porcentagem: mínimo entre 200 e **100 + 10 × (mundo − 1) + 5 × (fase no mundo − 1) + 10 × (ascensão − 1)**. Calcular usando inteiros e arredondar somente o total final.

Exemplo, fase 3 do primeiro mundo, primeira ascensão:
20 inimigos = 2.000; um minichefe = 600; guardião = 2.000; 12 caixas = 120; 30 cristais = 150; três níveis ganhos = 240; vitória = 1.000; chefe em 45s = 375; 70% de vida = 210; combo máximo de seis = 150. Sem despertar nem vitória intacta.
**Subtotal: 6.845 × 110% = 7.529 pontos.**

A derrota conserva os pontos efetivamente conquistados e não recebe os bônus de vitória. Pausar não altera tempos de simulação. Pontos de popularidade ou cliques nunca entram na fórmula.

Esta é uma proposta de balanceamento, não uma fórmula já testada. Validar builds de dano, defesa, alcance e coleta antes de congelar uma temporada. Toda ficha salva a versão da fórmula. Mudanças relevantes abrem outra edição da classificação.

## 8. Ranking como vitrine dos jogadores

### No refúgio

Pódio global compacto com três jogadores, pontuação e selo do mundo; destaque para o recorde pessoal. Um botão abre o Salão das Faíscas completo.

### No salão

- Melhor resultado por perfil na temporada, com filtros por fase e histórico de temporadas anteriores.
- Fichas com posição, nome, pontos, guardião enfrentado, build e medalhas.
- Uma frase de divulgação opcional e um link destacado com domínio visível.
- Ao abrir uma ficha, ver o resumo da expedição e a composição dos pontos.
- Paginação, navegação por teclado e versão mobile em cartões verticais.

Empates: vitória antes de derrota; depois maior número de minichefes derrotados, menor duração ativa, conclusão mais antiga no servidor e identificador da ficha em ordem crescente. Congelar essa regra junto à versão da fórmula.

### Publicação ao terminar

Campos propostos: nome com até 24 caracteres, frase com até 140 e um endereço HTTPS de até 512. Mostrar a prévia da ficha e a indicação de que os dados serão públicos. A pessoa pode publicar só a pontuação, sem divulgação.

O texto é texto simples, sem HTML. Validar URL no servidor, rejeitar credenciais embutidas e protocolos diferentes de HTTPS; mostrar o domínio real. Não buscar automaticamente imagens ou conteúdo no site divulgado.

Identidade de perfil vem de um segredo emitido pelo servidor, armazenado em cookie Secure/HttpOnly/SameSite. Nome não é identidade nem precisa ser único; um identificador curto diferencia homônimos. Limpar os dados do navegador perde o acesso ao perfil nessa primeira versão.

O dono pode editar/remover sua divulgação. Uma nova URL recebe um identificador de link novo para não herdar cliques de outro produto. Prever denúncia de conteúdo e remoção administrativa da divulgação, sem necessariamente apagar uma pontuação válida.

### Cliques

Registrar uma ativação real de “Visitar projeto” com requisição POST curta e idempotente. Abrir o endereço mesmo se o contador estiver indisponível; usar link normal como alternativa. Leituras de ranking, pré-carregamento e robôs acessando uma URL de prévia não devem incrementar o contador.

Exibir cliques e visitantes aproximados por navegador/dia. Deduplicar repetições do mesmo evento, limitar abuso e desconsiderar o próprio perfil quando identificável. Guardar agregados e identificadores de curta duração; não armazenar IP bruto para analytics.

A métrica é **cliques de saída**, não visitas confirmadas, vendas ou conversões no site externo. Contagem por navegador também não identifica pessoas únicas com certeza. Cliques não aumentam a posição no ranking.

## 9. Persistência no Cloudflare

### Opções avaliadas

| Caminho | Vantagem | Limite |
| --- | --- | --- |
| Pages Functions + D1, beta casual | Aproveita o site existente; SQL para resultados, perfis e cliques; menor custo inicial | Relatórios enviados por um jogo no navegador podem ser adulterados, mesmo com verificações de plausibilidade |
| Mesmo backend + replay determinístico | Servidor reexecuta entradas e confere o resultado | Requer estado inicial validado, log completo e medição real de CPU |
| Simulação online autoritativa | Servidor controla a partida | Complexidade e operação maiores para um jogo que hoje é solo e local |

**Recomendação:** primeiro lançamento global como beta casual, com proteção contra abuso e pontuação calculada no servidor. Desenvolver um experimento de replay antes de prometer competição verificada. Não chamar validação de formulário ou Turnstile de antitrapaça completa.

Estrutura: navegador → API no mesmo domínio → D1. Apenas rotas /api/* invocam Functions; imagens, áudio e jogo seguem estáticos. Configurar o arquivo de rotas do build conforme a [documentação de roteamento](https://developers.cloudflare.com/pages/functions/routing/).

### Dados principais

| Tabela | Papel |
| --- | --- |
| profiles | Identidade, nome público, estado de moderação e referência da divulgação atual |
| game_sessions | Identificador único, versão do jogo, fase, emissão/expiração e estado da sessão |
| runs | Métricas finais, parcelas, pontuação calculada, versão da fórmula e estado de publicação |
| leaderboard_best | Melhor ficha por perfil, edição e escopo da classificação |
| promotion_links | Texto, URL validada, dono e histórico de versões |
| click_events / click_daily | Deduplicação temporária e contadores agregados por link/dia |
| reports | Denúncias de conteúdo e decisão administrativa |

Usar índices alinhados aos filtros do ranking. Finalização de sessão, gravação da ficha e atualização do melhor resultado devem ser atômicas/idempotentes. Agregados de cliques não podem perder incrementos concorrentes.

### API proposta

- POST /api/profile: emitir perfil quando necessário; atualização exige a credencial do dono.
- POST /api/runs/start: abrir sessão com fase e versão conhecidas pelo servidor.
- POST /api/runs/finish: aceitar métricas limitadas, conferir sessão, calcular pontos e devolver a ficha.
- POST /api/runs/:id/publish: publicar a ficha e a divulgação opcional, verificando propriedade.
- GET /api/leaderboard: resultado paginado e cache público curto por edição/filtro.
- GET /api/me: histórico e métricas do próprio perfil, sem cache público.
- POST /api/links/:id/click: registrar ativação, sem permitir mudança do destino.
- POST /api/reports: receber denúncia com limitação de frequência.

Aplicar consultas parametrizadas, limites de tamanho/frequência, checagem de origem nas mutações e tratamento de falhas. Nenhum segredo, chave administrativa ou credencial D1 vai para o JavaScript público.

### Confiança das pontuações

O servidor não aceita um total pronto: calcula com a fórmula versionada. Uma sessão só finaliza uma vez. Conferir limites por duração, fase, inimigos, recursos e loadout; rejeitar relações impossíveis e sinalizar casos suspeitos.

Ainda assim, métricas falsas plausíveis podem passar. A progressão atual também vive no navegador e pode ser alterada. Importar esse estado não o torna confiável. Uma classificação competitiva futura exige progressão/loadout validados pelo servidor ou um modo com condições iniciais padronizadas.

Para replay: seed emitida pelo servidor, ticks fixos, ordem das entradas, escolhas de upgrades, versão da simulação e estado inicial precisam ser reproduzíveis. Verificar seleção aleatória e eventos até o resultado. Validar replay comprova compatibilidade com as regras; não comprova que foi uma pessoa jogando.

Turnstile ajuda a conter automação de envio. Seu token precisa de [validação no servidor](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/), é de uso único e dura cinco minutos; solicitar próximo à publicação e renová-lo quando necessário.

### Gratuito: capacidade e limites

Na documentação consultada em 05/09/2026:

- Assets estáticos sem invocar Functions têm requisições gratuitas e ilimitadas. Functions compartilham o limite de **100 mil requisições/dia** do Workers Free. [Preços Pages Functions](https://developers.cloudflare.com/pages/functions/pricing/).
- D1 Free oferece **5 milhões de linhas lidas/dia, 100 mil linhas escritas/dia e 5 GB totais de armazenamento**. Índices e cada operação influenciam o consumo; isso não equivale ao mesmo número de partidas. [Preços D1](https://developers.cloudflare.com/d1/platform/pricing/).
- Workers Free tem **10 ms de CPU por requisição HTTP**. Medir o custo de replay no runtime real antes de afirmar que partidas inteiras cabem nessa faixa. [Limites Workers](https://developers.cloudflare.com/workers/platform/limits/).

Ler o pódio ao abrir o refúgio, usar cache e paginação e evitar consultas durante o combate. Medir consumo por partida e por clique no teste inicial. Ao atingir cotas, manter o jogo e resultados locais utilizáveis; apresentar falha/pendência de envio sem inventar confirmação global. Retentar com o mesmo identificador, respeitando validade da sessão e regras de confiança. Partidas inteiramente offline permanecem locais na primeira versão.

## 10. Ordem de execução e critérios de entrega

1. **Arte e atlas:** fechar retratos individuais, colocar arte 2D no atlas e preparar a comparação pixel/3D de Mórthos.
2. **Modelos:** após avaliar o primeiro, revisar Vulkar/Nyxara e criar Briarok/Fulgra/Nivor; verificar rigs e animações antes da integração.
3. **Encontros:** implementar os três mecanismos sobre a grade existente, com avisos e rotas seguras; ajustar progressão por fase.
4. **Resultados:** instrumentar métricas, fórmula versionada e tela de conquistas local, preservando saves antigos.
5. **Backend em ambiente de prévia:** D1 separado de produção, migrações, perfis, sessões, ranking, divulgação e cliques.
6. **Validação integrada:** avaliar custo/abuso e o experimento de replay; revisar apresentação no desktop/mobile e em PT/EN.
7. **Publicação:** build verificado, migração controlada, registro da versão e teste na URL pública. Esta etapa vem depois da implementação e revisão, não faz parte desta entrega de planejamento.

### Verificações que precisam passar

- Seis guardiões reconhecíveis a partir de suas artes; ausência de mãos desconectadas, pés deslizando e acessórios sem suporte.
- Ciclos de movimento e ataque vistos completos; escala da arte, do modelo e da colisão coerentes.
- Explosões residuais sem dano; ataques avisados e nenhuma alteração de mapa sem saída.
- Métricas corretas em morte, vitória, reviver, correntes, ecos, cura e dano excedente.
- Fórmula com exemplo reproduzível, limites e sem pagamento duplicado de abates.
- Reenvio de resultado não duplica pontuação; chamadas concorrentes não sobrescrevem recorde melhor.
- Texto/URL inválidos rejeitados; perfil não altera resultado ou link de outra pessoa.
- Clique duplicado não conta duas vezes; falha no contador não impede abrir o projeto.
- API indisponível não quebra a partida; confirmação global só aparece após resposta válida.
- Fluxo por toque e teclado, respeito a movimento reduzido, traduções e preservação da evolução local.

## 11. Limite desta entrega

Produzidos o conceito visual dos três chefes e este plano. Não foram criados novos GLBs, tabelas D1 ou endpoints; não houve mudança de código de gameplay nem publicação. A revisão 3D fiel à pixel art já está incluída no escopo dos seis guardiões.
