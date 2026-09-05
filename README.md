# BOMB RIFT 2.1 — Crônicas da Fenda

Um protótipo jogável de sobrevivência e exploração em Three.js, inspirado na estratégia de bombas em grade e na evolução imprevisível dos roguelikes. Interface em português, personagens e cenário originais construídos em 3D.

## Atualização 2.1 — uma faísca contra o infinito

A tela de abertura apresenta o próximo guardião em 3D, acesso ao atlas e às evoluções, e um ranking das cinco melhores expedições deste navegador. Até dez resultados são guardados, sem pontuações fictícias. Cada resultado é registrado uma vez ao vencer ou morrer. Abates valem 100 pontos, cristais coletados 10, níveis obtidos 80 e sobrevivência 2 por segundo (até 120s). Uma vitória acrescenta 1.000 pontos, 150 por número da fase e duas vezes a vida restante.

Explosões agora causam dano somente no instante do impacto. Entrar no rastro visual depois é seguro; isso vale para fogo azul e ataques inimigos. O eco continua sendo uma segunda detonação, após 0,85s, com seu próprio impacto. O começo tem dois limos, reforços a cada aproximadamente 10–11 segundos e intervalos entre passos 35% maiores na fase 1. A pressão aumenta nas fases seguintes. Os guardiões iniciais anunciam ataques por 1,7s (1,5s em fúria), com intervalos maiores entre ataques.

Faísca tem passos alternados, movimento de mãos, preparação da bomba, inclinação da esquiva e reação ao dano. Limos comprimem e saltam, pavios soltam faíscas, skills produzem efeitos da cor da sua categoria e destacam o ícone equipado. Os chefes recebem selos no chão e um HUD com identidade, fúria, nomes de golpes e barra de preparação. Avisos de coleta e evolução ficam brevemente na lateral; etiquetas grandes de relíquias no meio da arena foram removidas. A escolha de skill continua pausando a partida.

Quatro composições instrumentais originais são sintetizadas por Web Audio: menu, Vale dos Ecos, Caldeira Rubra e Maré Espectral. Cada chefe tem uma variação mais intensa do tema do seu mundo, intensificada na fúria. Música e efeitos possuem controles independentes; volume e preferências são salvos. O áudio começa após interação do jogador e silencia quando a página fica oculta. Não há arquivos musicais externos nem chamadas a serviços de música.

## Guardiões do Blender e seleção de fases

Somente Mórthos, Vulkar e Nyxara usam os modelos do Blender. Faísca, os inimigos comuns, o sentinela, as arenas, as bombas, os efeitos e o HUD mantêm o visual original. O atlas mostra os três guardiões em 3D, com rotação por arraste/setas e uma reação ao botão Provocar. Cartões de fase destacam disponibilidade, conclusão e presença de minichefe; fases bloqueadas podem ser consultadas sem iniciar uma partida.

Os três GLBs ficam em `src/assets/characters/`. `boss-models.js` compartilha os assets entre atlas e arena, com esqueletos independentes para cada instância. As animações seguem os avisos de ataque e respeitam a pausa; o visual de morte é removido ao terminar. A prévia do atlas para de renderizar durante a partida. O HTML offline inclui os três modelos e tem aproximadamente 3,8 MB. Modelos experimentais dos demais personagens e novos cenários não fazem parte do jogo.

## Atualização 2.0 — mundos e legado

O novo atlas tem três mundos, nove fases, prévias animadas dos três guardiões, desbloqueios e ascensões sem fim. As arenas crescem de 15 × 13 a 19 × 17, com praças, corredores e cruzamentos. A Caldeira Rubra tem lava anunciada no piso; a Maré Espectral tem marés arcanas em linha e espectros que atacam à distância.

As fases 2, 3, 5, 6, 8 e 9 recebem um sentinela aos 60 segundos. Sete relíquias se combinam: fogo azul, bomba-relógio, eco, geada, carapaça, órbita de coleta e ressurreição. Cada fase reinicia a build temporária; essências e melhorias permanentes ficam. A vitória desbloqueia a fase seguinte. Depois da fase 9, os mundos retornam em uma nova ascensão, com dificuldade maior.

**DESIGN-DA-CAMPANHA.md** detalha os mundos, a progressão, as combinações e as referências. **TRILHA-SONORA.md** contém nove prompts de música para as fases, três para os chefes e um para o atlas. As gravações enviadas futuramente poderão substituir as trilhas instrumentais que já tocam no jogo.

## HUD e jogabilidade preservados

Ao iniciar, a arena ocupa a janela inteira e a câmera se aproxima suavemente. No celular, ela acompanha o personagem; os botões + e − ajustam a distância. O HUD de combate exibe vida em números grandes, barra segmentada, alerta de vida crítica, XP, recursos, bombas restantes e recarga da esquiva. Há também uma barra de vida acima de Faísca.

As habilidades têm dez ilustrações vetoriais próprias, comparação de atributos antes/depois e ícones equipados na parte inferior. Pressione B para inspecionar a build com o combate pausado. Curas imediatas não aparecem com a vida cheia, salvo quando todas as outras melhorias já chegaram ao máximo.

Os primeiros limos são distraídos e continuam perseguindo o jogador através da previsão de bombas. Atenção, cercos e pressão aumentam com as fases e o relógio. Caçadores mais atentos procuram saídas considerando reações em cadeia. Inimigos laranja anunciam uma investida por 1,1 segundo nas fases iniciais e 0,8 nas avançadas. Besouros são lentos e resistentes; espectros mantêm distância e marcam seu alvo antes de conjurar. Os três guardiões têm padrões e aparências próprios, entram em fúria na metade da vida e chamam reforços.

Foram adicionados números de dano e coleta, indicador de sequência de abates, ondas de choque, clarões, trilhas de esquiva, prévia do alcance de bombas perto da detonação e efeitos de evolução. Blocos do cenário usam instâncias agrupadas, e modelos de inimigos compartilham geometrias combinadas para reduzir chamadas de desenho.

## Jogar sem instalar

Abra `standalone/BOMB-RIFT.html` no Chrome ou Edge. O arquivo inclui código, Three.js, ícones e fontes, e funciona offline. O navegador precisa ter WebGL 2 e aceleração de hardware disponíveis.

O progresso permanente fica no armazenamento local do navegador, conservando a chave da versão anterior e suas melhorias. Saves antigos começam o novo atlas na fase 1. A versão em arquivo e a versão servida por HTTP podem usar salvamentos diferentes. A fase em andamento não é recuperada depois de recarregar, mas o legado e as fases desbloqueadas são mantidos.

## Desenvolvimento

Requer Node.js 22.12+ ou 24+.

```sh
npm ci
npm run dev
```

Abra o endereço local exibido pelo Vite. Para validar e gerar a distribuição:

```sh
npm test
npm run build
npm run standalone
```

`npm run preview` serve a versão de produção. O script standalone grava o HTML também em `dist/BOMB-RIFT.html`. `dist/` pode ser hospedada como site estático. Nenhum backend, conta ou chave de API é necessário.

## Como funciona

- WASD ou setas: mover pelos eixos da grade isométrica.
- Espaço: colocar bomba. O pavio inicial dura 2,1 segundos.
- Shift: esquivar até três casas na direção em que está olhando; não atravessa paredes.
- E: gastar cristais para sortear três habilidades e escolher uma.
- B: inspecionar as habilidades equipadas; pausa o combate.
- Botões + e − no HUD: aproximar ou afastar a câmera.
- Escape ou P: pausar. Sair da aba também pausa automaticamente.
- Enter: iniciar pela tela inicial.
- No celular: direcional, botão de bomba e esquiva na tela.

Selecione a fase no atlas e sobreviva durante 120 segundos de tempo ativo. O relógio para durante pausa e escolhas. Em seguida, derrote o guardião para desbloquear a próxima fase. A luta pode ultrapassar os dois minutos. Cada mundo tem três avatares progressivamente mais fortes do seu guardião. Depois dos nove encontros, novas ascensões continuam sem limite definido.

Bombas explodem em cruz. Paredes bloqueiam as explosões; caixas são destruídas e interrompem a propagação naquela direção. Bombas dentro do alcance explodem em cadeia. Explosões do jogador também causam dano a ele.

Caixas e monstros deixam cristais ou vida. Cristais fornecem XP e moeda. Cada nível oferece uma habilidade gratuita. A forja custa 20 cristais inicialmente, aumentando em 10 a cada uso. Sortear novamente custa 6. Há dez habilidades, com melhorias de dano, alcance, capacidade de bombas, velocidade, vida, atração de recursos, pavio, esquiva, cura e recuperação ao matar.

Vencer rende as essências indicadas no atlas, mais uma a cada cinco abates e três por minichefe. Morrer rende apenas as essências de abates e minichefes da tentativa. O crédito é aplicado uma única vez. No atlas, elas compram vida ou dano inicial para futuras fases. Revisitando fases conquistadas, você pode acumular mais essências. Vida, nível, XP, skills, cristais, custo da forja e relíquias reiniciam a cada fase, aplicando as melhorias permanentes à vida e ao dano iniciais.

Destrua o caixote com um cristal dourado perto do início para encontrar uma relíquia garantida. Caixotes e monstros também podem derrubar outros itens. Relíquias são equipadas automaticamente, aparecem no HUD e têm detalhes no menu B. **O eco da explosão também machuca você.** Última faísca permite uma ressurreição por fase.

## Estrutura

- `src/game.js`: regras de combate, geração de arenas, IA, progressão e estados; independente do navegador.
- `src/campaign.js`: mundos, fases, relíquias e identificadores da trilha sonora.
- `src/atlas.js` e `src/atlas.css`: mapa inicial, seleção de fases e retratos vetoriais originais.
- `src/scene.js`: arena, personagens, partículas, iluminação, sombras e bloom em Three.js.
- `src/main.js`: interface, controles, salvamento e ligação entre simulação e renderização.
- `src/audio.js` e `src/music.js`: efeitos, composições instrumentais e sequenciador Web Audio.
- `src/launch.js` e `src/juice.css`: abertura, ranking e apresentação dos eventos de combate.
- `src/ranking.js`: pontuação, validação e persistência das melhores expedições locais.
- `src/hud.js`: HUD de combate, barras de vida no cenário e números flutuantes.
- `src/skill-art.js`: ilustrações vetoriais e comparação de atributos das habilidades.
- `src/game-hud.css`: modo de combate imersivo e cartas ilustradas.
- `src/style.css`: interface responsiva e telas de jogo.
- `tests/game.test.js`: testes determinísticos da lógica.
- `tests/campaign.test.js`: progressão, recompensas, relíquias, minichefes e perigos de cada mundo.
- `scripts/standalone.mjs`: empacotamento da versão offline em um único HTML.

## Verificação

52 testes automatizados cobrem reações em cadeia, bloqueios, dano instantâneo e resíduos inofensivos, esquiva, chefes, habilidades, IA, pausa, morte, créditos únicos, desbloqueios, reset da build, manutenção do legado, relíquias combinadas, ressurreição, minichefes, ranking e perigos do cenário. Todas as nove arenas são verificadas com 20 sementes cada, incluindo limites, caminhos e spawn seguro. Há verificações de geometria, clones independentes dos GLBs e sincronização das animações com os tempos de preparação dos ataques.

Os sete arranjos de música (menu, três mundos e três variações de chefe) foram renderizados por OfflineAudioContext: todos produziram áudio finito, sem clipping, liberando suas vozes ao terminar. Abertura, atlas, ganho de skill, três chefes, fúria, vitória, ranking após recarga e configurações de música foram exercitados no Chromium, incluindo 390×844. A instrumentação que acelera esses cenários existe apenas nos testes do navegador.

Fluxos verificados no Chromium: início, movimento por teclado e toque, colocação de bombas, dano, pausa, escolha gratuita, forja e novo sorteio, chefe, vitória, rodada seguinte, morte, compra permanente, reinício com melhoria aplicada, persistência após recarregar e ajuste de qualidade. Os cenários de chefe e de salvamento foram alcançados usando instrumentação de teste, ausente da distribuição. Layout inspecionado em 1440×900, 1440×1000 e 390×844.

O ciclo de vitória, compra permanente, entrada na fase seguinte e recarga foi verificado no Chromium com armazenamento isolado. O jogo é single-player local; não inclui multiplayer, sincronização em nuvem ou gamepad. O balanceamento pode ser refinado após sessões mais longas de jogo.

## Dependências e créditos

Three.js (MIT), Vite (MIT), Lucide (ISC), Oxanium e DM Sans (SIL Open Font License, distribuídas via Fontsource). Veja as versões fixadas em `package-lock.json`. A modelagem procedural, a interface e os efeitos sonoros foram criados para este projeto; não há arquivos de personagens de Bomberman.

Documentação técnica: [Three.js](https://threejs.org/docs/) e [Vite](https://vite.dev/guide/).

A distribuição em arquivo único foi verificada no Chromium: nenhuma requisição externa de recursos e controles funcionais com a conexão do navegador desativada após carregar o HTML. O acesso direto por protocolo file não estava disponível na ferramenta de testes; o teste usou o mesmo HTML servido localmente.
