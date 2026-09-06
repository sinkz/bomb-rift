# O último refúgio — proposta de interface 01

Abra `http://127.0.0.1:4175/HUD-APROVACAO.html` com o Vite (`npm run dev -- --port 4175`). Entrada: `HUD-APROVACAO.html`, na raiz do projeto. Esta proposta está isolada do jogo e não entra no build de produção.

## Direção

O jogo começa no lugar para onde o jogador quer voltar. Um refúgio ao anoitecer, lanternas acesas, uma oficina, flores e um portal. Faísca passeia, descansa com sua bomba e rega as flores. O ranking ocupa uma placa lateral; as ações principais ficam em uma barra de slots ao alcance do polegar.

O cenário novo pertence apenas ao refúgio. A arena e os personagens 3D do jogo aprovado permanecem. Molduras raster divididas em nove partes, botões com bordas em degraus, fontes pixel e ícones da biblioteca aprovada dão continuidade à identidade do jogo.

Referências pesquisadas: [Stardew Valley, presskit oficial](https://www.stardewvalley.net/press/) para atividades de descanso e adaptação de interface ao mobile; [Dead Cells, site oficial](https://dead-cells.com/) para a relação entre poderes, rotas e recomeços. São referências de direção, sem reprodução de assets ou interfaces desses jogos.

## Fluxo proposto

1. Refúgio como tela inicial: nível, recursos, melhores expedições locais, continuar e atalhos.
2. Mapa: selecionar mundo, ponto na rota, inspecionar/provocar chefe 3D, entrar.
3. Build: alternar três estratégias, comparar atributos, preparar equipamento e consultar talentos permanentes.
4. Loja: comprar com essências de demonstração; verificar item adquirido na mochila.
5. Combate: vida prioritária, tempo ou chefe, barra curta de skills, bomba/esquiva/evolução.
6. Evolução: pausa e três escolhas com arte grande, explicação e diferença numérica.
7. Configurações: idioma fora do header, redução de movimento e demonstração dos controles de toque.

No mobile, janelas se organizam verticalmente, navegação fica embaixo e a arena tem um espaço próprio acima dos controles. Em paisagem, controles ocupam os cantos inferiores. Alvos principais têm pelo menos 44 px e botões possuem foco visível. `Escape` fecha as janelas; M/B/L/I/R abrem as áreas; WASD, espaço e shift controlam a arena; E abre as escolhas; 1–3 selecionam uma skill.

## O que funciona no estudo

- Caminhada com sprites completos de frente ao vir até as flores e de costas ao retornar. Cadência ligada à distância. As poses originais de repouso, rega e descanso foram restauradas.
- Passarinhos pousam na mão e pulam junto das botas; Faísca lê e vira páginas, dorme com respiração discreta e volta ao passeio. A rotina dura 52 segundos e alterna leitura/soneca entre voltas. Clicar no personagem (ou usar Enter/Espaço com foco) chama passarinhos, leitura e soneca em sequência. Movimento reduzido exibe poses estáticas.
- Menus, atalhos, modais nativos com contenção de foco, fechamento por Escape.
- Seleção de mundos/fases e os três chefes Blender existentes com animação de provocação.
- Seleção de builds, compra de exemplo, saldo e inventário em memória.
- Arena original instanciada separadamente, movimento, bombas e esquiva, joystick com pointer capture.
- Janelas de skills, pausa e alternância entre cronômetro e barra do chefe.
- Redução de movimento do sistema ou configuração do mockup.

Os números, ranking, atributos, cronômetro e recompensas são amostras de UI. A arena usa o Vale dos Ecos e invulnerabilidade para inspeção; selecionar outro mundo altera o mapa e guardião da prévia, não a arena. Skills ilustram a escolha sem aplicar melhorias reais. Idioma e volume ilustram sua posição; a tradução e áudio reais continuam na versão 2.3 publicada. Nada grava no save ou compra recursos reais.

## Plano após aprovação

1. Transformar as molduras, slots, botões e tokens visuais aprovados em componentes usados pela UI real, preservando IDs e ações existentes.
2. Trocar o menu de abertura pelo refúgio, conectando dados reais de `meta`, ranking local e loadout. Exibir estado vazio verdadeiro do ranking para novos jogadores.
3. Conectar mapa, oficina, mochila e loja aos fluxos atuais. Preservar desbloqueios, custos e regra de reset por fase.
4. Aplicar a HUD de combate e os layouts móveis, rever enquadramento e testar toque simultâneo, pausa e safe areas em aparelhos reais.
5. Completar PT/EN do novo fluxo, fallback inglês e idioma em configurações, sem migrar chaves de save.
6. Validar legibilidade em movimento, desempenho, teclado e redução de movimento; executar os testes do jogo. Publicar somente a versão integrada aprovada.

## Assets

Assets gerados com o **imagegen integrado**, em `mockups/refuge/assets`: `refuge.png`, `faisca-sprites.png`, `panel.png`, `faisca-front-back.png` e `faisca-refuge-life.png`. O atlas lateral rejeitado foi preservado, mas não é carregado. Prompts em `prompts.md`. PNGs originais preservados; quadros selecionados no canvas sem recorte destrutivo. Os ícones existentes são referenciados em `public/pixel-library/icons`. Silkscreen vem do Google Fonts; Oxanium usa o pacote local. Otimização final de tamanho e hospedagem da fonte pixel ficam para a integração.

## Versão protegida antes do estudo

Cloudflare: https://bomb-rift.pages.dev/ — 2.3 publicada, 168/168 arquivos enviados e sucesso confirmado. 77 testes passaram. Commit de toda a versão anterior ao mockup: `90b5524`.

## Revisão de animação 03 — perfil lateral rejeitado

Abra `http://127.0.0.1:4175/mockups/refuge/walk-review.html` para ver o mesmo renderer ampliado, com pausa, linha do tempo e câmera lenta. A revisão assistiu a 27 segundos da versão anterior antes de editar e a outros 27 segundos da versão nova no refúgio. O atlas lateral está em `assets/faisca-side-parts.png`, gerado pelo imagegen integrado. O carregador de textura remove apenas o fundo neutro conectado às bordas, em memória, preservando o arquivo original. `hero-walk.js` contém o renderer compartilhado.

## Revisão de animação 04 — frente e costas

O usuário preferiu a aparência original e pediu frente/costas. `assets/faisca-front-back.png` contém quatro quadros completos para cada direção, gerados com a arte original como referência. A versão lateral deixou de ser usada. Ida até as flores de frente → rega original → retorno de costas → descanso original. `sampleStroll` compartilha a sequência de 26 segundos entre o refúgio e a revisão ampliada. Os arquivos de imagem são preservados; a seleção de quadros e limpeza do fundo neutro acontecem apenas na textura em memória. O ciclo foi observado inteiro no cenário após a alteração.
