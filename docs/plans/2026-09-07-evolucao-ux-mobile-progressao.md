# BOMB RIFT — Plano de evolução de UX, mobile e progressão

Data: 07/09/2026  
Status: planejamento; tarefas abaixo ainda não implementadas.  
Base: versão local 2.5 beta, revisão visual de desktop/mobile e código atual.  
Objetivo: tornar o jogo confortável no celular, simplificar a navegação e melhorar a continuidade das expedições, preservando sua identidade.

## 1. Direção e limites

- Preservar refúgio animado, arte pixel, modelos aprovados dos seis chefes, combate em grade, música e suporte PT/EN.
- Manter upgrades permanentes após a derrota; morte definitiva encerra a tentativa e reinicia as fases.
- Manter publicação de ranking apenas ao encerrar a tentativa ou concluir a campanha, nunca em vitórias intermediárias.
- Priorizar qualidade dos sistemas existentes antes de novos mundos.
- Fazer uma adaptação de experiência para mobile: câmera, toque, HUD, navegação e desempenho próprios, compartilhando as regras do jogo com desktop.
- Não confundir instalar como aplicativo com corrigir controles e enquadramento. O trabalho de adaptação vem primeiro.
- Mudanças de regras propostas, como carregar uma habilidade entre fases, entram primeiro como experimento local; não são decisões de balanceamento já aprovadas.

### Prioridades

| Prioridade | Significado |
|---|---|
| P0 | Corrigir desconforto central ou risco de perda de tentativa |
| P1 | Melhorar aprendizado, estratégia e consistência |
| P2 | Expandir distribuição e competição após validar a base |

## 2. Diagnóstico de partida

| Área | Evidência atual | Consequência |
|---|---|---|
| Zoom mobile | `adjustZoom()` existe; CSS oculta `.zoom-tools` em telas móveis | Jogador não ajusta a câmera pelo toque |
| Enquadramento | Arena em retrato apresentou laterais cortadas na revisão em 390 px | Perigos e rotas podem ficar fora da visão |
| Controles | Botões móveis de ação chegam a 52–60 px; rótulos de 5–6 px | Leitura difícil e pouca margem para os dedos |
| Oficina | Sete abas e múltiplas áreas de rolagem | Construir uma build exige navegar por informação demais |
| Entrada | Mapa, Explorar e Iniciar expedição passam pelo atlas | A ação principal tem uma etapa adicional |
| Tutorial | Manual textual; acesso oculto no refúgio estreito inspecionado | Novatos precisam descobrir regras no combate |
| Expedição | 18 fases de 2 minutos mais chefes; tentativa em memória | Recarregar perde uma sessão potencialmente longa |
| Builds | 16 habilidades; três ofertas; reset a cada fase; despertar na quinta escolha | Boa variedade, mas continuidade e frequência dos despertares precisam ser medidas |
| Dificuldade | Medium/Hard alteram vários fatores simultaneamente | Possibilidade de saltos bruscos; falta playtest completo |
| Ranking | Pontos calculados no servidor a partir de dados enviados pelo cliente | Adequado como ranking casual; não é competição com antitrapaça autoritativo |

## 3. Ordem de execução e dependências

| Etapa | Entrega | Depende de |
|---|---|---|
| A — P0 | Protótipo mobile com câmera, zoom, controles e HUD | Baseline visual e cenários de teste |
| B — P0 | Suspender/retomar tentativa e reconciliação do ranking | Definição do contrato de salvamento |
| C — P1 | Menus simplificados e tutorial prático | Padrões de interação desktop/mobile da etapa A |
| D — P1 | Clareza de builds e experimento de continuidade | Salvamento versionado da etapa B |
| E — P1 | Chefes legíveis, balanceamento e telemetria | Controles estabilizados e regras da etapa D definidas |
| F — P2 | PWA; estudo de empacotamento nativo; competição semanal | Mobile e retomada validados |
| G | Validação, build, preview e publicação por entrega | Critérios de aceite da respectiva etapa |

Entregar em mudanças pequenas e revisáveis. Não juntar port mobile, novas regras e ranking em uma única publicação.

## 4. Etapa A — Adaptação mobile de verdade [P0]

### A1. Baseline e arquitetura

- [ ] MOB-01 — Registrar screenshots e cenários reproduzíveis: refúgio, atlas, oficina, arena, chefe, evolução, pausa e resultado.
- [ ] MOB-02 — Definir perfis de apresentação desktop, toque em retrato e toque em paisagem, incluindo tablets e dispositivos híbridos.
- [ ] MOB-03 — Centralizar comandos de mover, colocar bomba e esquivar para teclado, joystick e botões usarem as mesmas regras.
- [ ] MOB-04 — Definir zonas seguras para dedos e HUD; respeitar recortes, barras do navegador e mudança de orientação.

### A2. Câmera e zoom

- [ ] CAM-01 — Exibir controles próprios de `+`, `−` e recentralizar no mobile, com área de toque mínima de projeto de 48 × 48 CSS px.
- [ ] CAM-02 — Definir zoom inicial por tamanho útil da arena, buscando personagem e tiles legíveis. Não reduzir tudo para caber a arena inteira.
- [ ] CAM-03 — Implementar acompanhamento suave do personagem com zona central de tolerância e limites nas bordas do mapa.
- [ ] CAM-04 — Testar alcance inicial entre 0,8× e 1,8×, ajustando os limites por orientação e tamanho do mapa; valores são ponto de partida, não regra fechada.
- [ ] CAM-05 — Persistir preferência de zoom por perfil; permitir restaurar o padrão. Evitar que cada fase apague a preferência.
- [ ] CAM-06 — Prototipar pinça para zoom apenas sobre a arena. Excluir dedos já capturados pelo joystick ou botões; preservar o zoom de acessibilidade da página nos menus.
- [ ] CAM-07 — Adicionar visão geral temporária em pausa ou botão dedicado e sinalização discreta de chefe/perigo fora da tela.
- [ ] CAM-08 — Integrar entrada de chefe e tremor de câmera sem deslocar o personagem para baixo do HUD; evitar zoom automático constante durante a luta.
- [ ] CAM-09 — Recalcular enquadramento ao girar o aparelho, abrir/fechar barras do navegador e redimensionar; respeitar movimento reduzido.

### A3. Controles de toque

- [ ] INPUT-01 — Prototipar joystick fixo maior, inicialmente 132–160 CSS px; zona de captura confortável e centro claramente visível.
- [ ] INPUT-02 — Adicionar opção de joystick flutuante na metade esquerda, sem capturar toques nos menus ou no zoom.
- [ ] INPUT-03 — Aumentar bomba para aproximadamente 80–96 CSS px e esquiva para 64–80 CSS px, ajustáveis e sem sobreposição.
- [ ] INPUT-04 — Permitir mover e plantar bomba/esquivar simultaneamente com dedos independentes.
- [ ] INPUT-05 — Ajustar zona morta e tolerância entre direções para evitar oscilações. Manter deslocamento em quatro direções coerente com a grade.
- [ ] INPUT-06 — Definir e ensinar como o gesto aponta para a grade isométrica; comparar mapeamentos em playtest antes de escolher o padrão.
- [ ] INPUT-07 — Mostrar feedback imediato de pressionado, recarga e indisponibilidade. Diferenciar “sem bomba disponível” de “toque não recebido”.
- [ ] INPUT-08 — Disponibilizar escala, opacidade e lado dos controles; incluir restaurar padrão e testar modo canhoto.
- [ ] INPUT-09 — Corrigir soltura fora da área, `pointercancel`, perda de captura, multitouch e retorno do segundo plano. Nenhum comando pode ficar preso.
- [ ] INPUT-10 — Tratar um toque como uma bomba por padrão. Qualquer repetição ao segurar deve ser opcional, explícita e testada.
- [ ] INPUT-11 — Oferecer vibração opcional quando suportada, com alternativa visual; não depender dela para avisos essenciais.

### A4. HUD e menus móveis

- [ ] HUD-01 — Projetar duas composições: retrato com status compacto acima e comandos abaixo; paisagem com comandos laterais e centro livre.
- [ ] HUD-02 — Priorizar vida/vidas, bomba, esquiva, objetivo e aviso do chefe. Levar estatísticas secundárias para painel acessível por toque.
- [ ] HUD-03 — Remover textos essenciais de 5–6 px; testar corpo a partir de 14 px e rótulos a partir de 12 px, reservando fonte pixel mais ornamental para títulos.
- [ ] HUD-04 — Separar aumentar a interface de aumentar a câmera; o jogador pode precisar de ambos.
- [ ] HUD-05 — Evitar cards, avisos de recursos e efeitos de aquisição no centro da rota do personagem.
- [ ] HUD-06 — Apresentar escolhas de habilidades em cards grandes com uma única rolagem e confirmação clara, mantendo a partida pausada.
- [ ] HUD-07 — Manter Como jogar, configurações e pausa acessíveis em ambas as orientações.
- [ ] HUD-08 — Ajustar formulário final para teclado virtual, mensagens de erro, Turnstile, links e retorno do foco, com uma única rolagem principal.

**Aceite da etapa A:**

- Concluir uma fase e enfrentar um chefe com dois polegares, sem precisar de mouse/teclado.
- Mover enquanto planta bombas e esquiva; nenhum toque duplo acidental ou direção presa nos cenários de teste.
- Alterar zoom, restaurar padrão e girar a tela sem perder personagem ou acesso aos comandos.
- Conseguir identificar perigos próximos no zoom padrão e localizar ameaças fora da tela.
- Vida, vidas e recargas legíveis em 360–430 px; personagem não oculto pelos dedos nas rotas de teste.
- Desktop mantém atalhos, câmera e layout aprovados; telas estreitas sozinhas não devem inutilizar teclado/mouse.

## 5. Etapa B — Suspender e retomar expedição [P0]

- [ ] SAVE-01 — Definir formato versionado: ID da tentativa, dificuldade, próxima fase, vidas, estatísticas acumuladas, relatórios concluídos e identificadores da sessão online.
- [ ] SAVE-02 — Salvar checkpoint atomicamente após concluir cada fase e contabilizar suas recompensas uma única vez.
- [ ] SAVE-03 — Adicionar “Continuar expedição” no refúgio, com dificuldade, fase e horário; explicar claramente o que está salvo.
- [ ] SAVE-04 — Separar checkpoint entre fases de pausa no meio do combate. Para interrupções durante a fase, definir política explícita e consistente; não prometer retomada exata sem serializar o estado completo.
- [ ] SAVE-05 — Persistir o estado de entrada em fase para que recarregar não devolva compras, vidas consumidas ou recompensas já creditadas. Não permitir duplicação entre abas.
- [ ] SAVE-06 — Invalidar checkpoint ao morrer definitivamente ou encerrar a tentativa. Retomar não pode desfazer game over.
- [ ] SAVE-07 — Compatibilizar retomada com API: limite atual de quatro horas, sessão expirada, cookies e relatórios ordenados. Reavaliar tempo ativo versus tempo suspenso.
- [ ] SAVE-08 — Tornar envio/fechamento de relatórios idempotente e reconciliar respostas perdidas antes de reenviar.
- [ ] SAVE-09 — Exibir estado online/local antes de continuar; progresso local não deve ser apresentado como elegível ao ranking global sem validação.
- [ ] SAVE-10 — Tratar armazenamento indisponível, dados incompatíveis/corrompidos, atualização de versão e concorrência entre abas, preservando o legado válido.

**Aceite:** fechar e reabrir entre fases mantém posição na campanha, score e vidas; derrota encerra a tentativa; nenhuma retomada duplica recursos/score; falhas e limitações são explicadas antes de jogar.

## 6. Etapa C — UX, navegação e tutorial [P1]

- [ ] UX-01 — Fazer a ação principal iniciar/continuar a próxima fase; deixar o atlas como exploração e seleção de dificuldade antes da tentativa.
- [ ] UX-02 — Unificar nomes: Refúgio é a home, Build é preparação e Mapa é o atlas. Evitar abrir outra tela chamada Refúgio ao tocar em Build.
- [ ] UX-03 — Agrupar talentos e equipamento na preparação; manter coleção, aparência e bestiário como áreas secundárias, sem sete abas concorrentes no celular.
- [ ] UX-04 — Eliminar rolagens aninhadas na oficina; manter fechar/voltar acessíveis e preservar posição ao retornar.
- [ ] UX-05 — Exibir comparação antes/depois de atributo, custo e motivo de bloqueio junto da ação de compra.
- [ ] UX-06 — Destacar próximo desbloqueio e recursos faltantes; orientar o jogador que terminou uma tentativa e já pode melhorar algo.
- [ ] UX-07 — Criar tutorial prático curto: mover, plantar bomba, sair da cruz, coletar, esquivar e escolher uma evolução.
- [ ] UX-08 — Permitir pular e repetir tutorial; adaptar instruções a toque/teclado; impedir registros de tutorial no ranking.
- [ ] UX-09 — Explicar vida versus vidas extras, fase versus expedição, temporário versus permanente e os usos concorrentes dos cristais.
- [ ] UX-10 — Revisar PT/EN, singular/plural (“1 vida”), nomes e unidades; trocar instruções de teclado quando o jogador usa toque.
- [ ] UX-11 — Revisar foco, fechamento de modais, contraste, escala de texto, movimento reduzido e alternativas à informação apenas por cor.

**Aceite:** um jogador novo chega ao combate e entende bomba/escape sem manual longo; consegue encontrar uma melhoria, comparar e voltar; tutorial e configurações sempre acessíveis; fluxo validado nos dois idiomas.

## 7. Etapa D — Skills, builds e continuidade [P1]

- [ ] BUILD-01 — Medir escolhas por fase, frequência de despertar, uso de forja/reroll e distribuição das 16 habilidades existentes.
- [ ] BUILD-02 — Definir arquétipos legíveis: explosão/alcance, cadeia elétrica, controle de gelo, esquiva ofensiva e sobrevivência.
- [ ] BUILD-03 — Exibir sinergias reais nos cards, efeito atual/próximo e destaque especial em 4/5; não anunciar combinações sem efeito implementado.
- [ ] BUILD-04 — Comparar duas regras em protótipo: reset completo atual versus carregar uma habilidade assinatura dentro das três fases do mundo.
- [ ] BUILD-05 — Para o experimento, definir escolha da assinatura, nível preservado, despertar, reset ao trocar de mundo e efeitos em relíquias. Evitar acumular bônus duas vezes.
- [ ] BUILD-06 — Validar a regra com o usuário e playtest antes de adotá-la na campanha; recalibrar chefes, XP e custos se for aprovada.
- [ ] BUILD-07 — Avaliar recursos limitados de direcionamento, como bloquear uma oferta ou favorecer um arquétipo, apenas se dados mostrarem dependência excessiva de sorte.
- [ ] BUILD-08 — Revisar custo de vida versus forja: apresentar a troca entre segurança e poder, sem uma opção dominar sempre.
- [ ] BUILD-09 — Ajustar efeitos e sons dos despertares para serem distintos e reconhecer-se no combate, respeitando contraste e movimento reduzido.
- [ ] BUILD-10 — Revisar talentos/equipamentos permanentes para ter escolhas de estilo, comparações e redistribuição acessíveis; avaliar vantagem de veteranos no ranking.

**Aceite:** cada arquétipo muda uma decisão de combate; o jogador entende por que escolheu uma skill; despertares aparecem em uma frequência medida e desejada; progressão respeita os resets definidos e não torna uma build obrigatória.

## 8. Etapa E — Chefes, dificuldade e feedback [P1]

- [ ] BOSS-01 — Testar os seis chefes em campanha com horda ativa, vida normal e builds iniciais e avançadas; separar testes de IA de testes de dificuldade.
- [ ] BOSS-02 — Tornar preparação, área atingida, impacto e recuperação reconhecíveis pela animação e pelo chão, sem depender do texto de debug.
- [ ] BOSS-03 — Verificar perseguição, quebra de barreiras, reposicionamento e recuperação de caminhos bloqueados nos tamanhos reais de mapa.
- [ ] BOSS-04 — Validar mudanças de arena: caminhos de fuga, spawn protegido, runas/âncoras interativas e ausência de dano inevitável ao entrar.
- [ ] BOSS-05 — Ajustar duração/contraste dos avisos para mobile; comunicar ameaças fora da câmera e distinguir fogo decorativo de hitbox ativa.
- [ ] BOSS-06 — Afinar efeitos de impacto, som e tremor com intensidade ajustável; evitar partículas encobrindo avisos e personagem.
- [ ] BAL-01 — Construir tabela de HP, dano, velocidade, spawn e inteligência por mundo/dificuldade; alterar uma dimensão por rodada de teste.
- [ ] BAL-02 — Medir mortes por causa/fase, tempo de chefe, dano recebido, vidas compradas e duração de tentativa.
- [ ] BAL-03 — Manter Easy → Medium → Hard como desbloqueios; ajustar a curva sem depender apenas de inimigos com mais vida.
- [ ] BAL-04 — Testar tempos de reação e rotas possíveis com toque e teclado. Corrigir controles antes de compensar desconforto mobile com atributos menores.
- [ ] BAL-05 — Revisar ritmo: preparação, dois minutos de horda, chefe, recompensa e volta à ação; reduzir pausas repetitivas e telas redundantes.

**Aceite:** os seis chefes pressionam, telegrafam e oferecem contra-ataque; nenhuma transformação de mapa produz dano inevitável nos cenários testados; mudanças de dificuldade justificadas por playtest, não por notas de agentes invulneráveis.

## 9. Ranking, feedback de resultado e métricas [P1/P2]

- [ ] RANK-01 [P1] — Conferir home com ranking global preenchido, vazio, carregando e offline. Distinguir explicitamente dados locais de globais.
- [ ] RANK-02 [P1] — Organizar resultado em score, motivo do encerramento, conquistas, recompensa permanente e próxima melhoria sugerida; breakdown de pontos expansível.
- [ ] RANK-03 [P1] — Manter convite “Divulgue seu projeto” opcional, preview, erros junto dos campos e alternativa de sair sem publicar.
- [ ] RANK-04 [P1] — Validar resumo terminal, dificuldade, retomada, score recalculado, publicação repetida e cliques dos projetos após mudanças de sessão.
- [ ] RANK-05 [P1] — Revisar limites de texto/URL, frequência de envios, tratamento de abuso e interpretação dos cliques; não apresentar cliques brutos como visitantes únicos.
- [ ] RANK-06 [P2] — Prototipar desafio semanal com equipamento fixo, regras/seed definidas e ranking separado; preservar campanha casual e sua metaprogressão.
- [ ] DATA-01 [P1] — Instrumentar funil: abrir refúgio, iniciar, primeira bomba, primeira evolução, morrer/concluir, tentar novamente e publicar ranking.
- [ ] DATA-02 [P1] — Registrar eventos agregados por versão, dispositivo e dificuldade; limitar payload/retentativas e evitar nomes, textos de divulgação e dados desnecessários em telemetria de combate.
- [ ] DATA-03 [P1] — Definir baseline antes de metas: abandono por tela, conclusão de primeira fase, tempo até primeira melhoria, despertares, tentativas repetidas e tempo de sessão.
- [ ] DATA-04 [P1] — Separar métricas de experiência (FPS, controles, funil) de Core Web Vitals. Comparar janelas e amostras suficientes; as medições atuais de LCP são poucas.

## 10. Desempenho e distribuição mobile [P1/P2]

- [ ] PERF-01 [P1] — Validar publicação das otimizações já construídas: fundo WebP prioritário e chefes sob demanda. Recolher LCP/INP após novas visitas.
- [ ] PERF-02 [P1] — Medir frame time e travadas com horda/chefe/partículas em aparelho real; meta inicial de 30 FPS sustentados em aparelho modesto e 60 FPS quando suportado.
- [ ] PERF-03 [P1] — Ajustar resolução, sombras, bloom e quantidade de partículas por perfil, sem reduzir avisos de perigo; permitir configuração manual.
- [ ] PERF-04 [P1] — Perfilar preparação dos sprites e inicialização WebGL; adiar/dividir trabalho pesado somente onde a medição justificar.
- [ ] PERF-05 [P1] — Testar 15–20 minutos contínuos para aquecimento, consumo e crescimento de memória; verificar troca de mundo e descarte de recursos.
- [ ] APP-01 [P2] — Criar PWA instalável com manifest, ícones e instruções adequadas a Android/iOS; manter acesso normal pelo navegador.
- [ ] APP-02 [P2] — Definir cache por versão e download sob demanda de mundos; comunicar conteúdo indisponível offline. Não baixar todos os chefes/músicas no primeiro acesso.
- [ ] APP-03 [P2] — Atualizar PWA apenas em ponto seguro; não misturar JavaScript novo, checkpoint antigo e assets incompatíveis durante a tentativa.
- [ ] APP-04 [P2] — Testar áudio, segundo plano, fullscreen quando disponível, armazenamento e retomada na PWA instalada. Ranking online mantém requisitos de sessão/validação.
- [ ] APP-05 [P2] — Fazer estudo curto de Capacitor apenas se houver necessidade de lojas ou APIs nativas que a web não atenda. Comparar manutenção, assinatura, publicação e desempenho medido.

**Decisão sobre “port”:** implementar agora a adaptação mobile sobre o mesmo jogo Three.js. PWA é a etapa seguinte para instalação. Capacitor é uma possibilidade de empacotamento futuro, não garantia de FPS melhor nem substituto para redesenhar interação. Reescrita nativa fica fora desta primeira entrega.

## 11. Matriz de validação

| Ambiente | Cobertura mínima |
|---|---|
| Desktop 1280 × 720 e 1920 × 1080 | Atalhos, mouse, zoom, oficina, modais e combate |
| Retrato 360 × 800, 390 × 844, 430 × 932 | Alvos de toque, legibilidade, teclado virtual, câmera e HUD |
| Paisagem 800 × 360 e 844 × 390 | Recortes, polegares, avisos de chefe e altura curta |
| Tablet / dispositivo híbrido | Alternância toque/teclado e escala dos controles |
| Android Chrome em aparelho real | Multitouch, áudio, frame time, aquecimento, segundo plano |
| iPhone Safari em aparelho real | Safe areas, teclado, interrupção, áudio e orientação |
| PWA instalada, quando implementada | Atualização, cache, instalação e retomada |

Emulação de viewport valida layout, não substitui ergonomia, desempenho e multitouch em hardware real. Registrar modelo/OS/navegador usados, resultado e limitações; não declarar suporte validado onde faltou aparelho.

### Cenários obrigatórios de regressão

- [ ] QA-01 — Explosão dá dano apenas no instante correto; visual residual não fere.
- [ ] QA-02 — Morte com vida extra, Phoenix, compra no limite, vitória de mundo e derrota definitiva seguem regras sem crédito duplicado.
- [ ] QA-03 — Sequência das 18 fases e desbloqueios de dificuldade; não permitir publicar vitórias intermediárias no ranking.
- [ ] QA-04 — Reload, duas abas, sessão expirada, armazenamento falhando e interrupção de rede conforme política de retomada.
- [ ] QA-05 — Seis chefes, carregamento atrasado/falhando, troca de mundo e animações sem regressão.
- [ ] QA-06 — Controles simultâneos, pinça fora/dentro das zonas permitidas, dedo solto fora do botão e rotação durante pausa/combate.
- [ ] QA-07 — PT/EN, texto ampliado, movimento reduzido, teclado virtual e formulário de ranking com mensagens longas.
- [ ] QA-08 — Build e testes apropriados à mudança; páginas/fixtures de teste excluídas do pacote de produção e sem score artificial público.

## 12. Entrega e acompanhamento

- [ ] REL-01 — Para cada etapa, registrar antes/depois, arquivos alterados, testes executados e limitações conhecidas.
- [ ] REL-02 — Criar preview revisável de mobile em retrato/paisagem antes de integrar a composição definitiva.
- [ ] REL-03 — Versionar checkpoints e contratos da API; definir migração e rollback antes de publicar mudanças de persistência.
- [ ] REL-04 — Gerar build, validar preview e registrar commit/deployment na publicação; conferir assets e API em produção.
- [ ] REL-05 — Atualizar `EXPEDITIONS.md`, manual e notas da versão conforme as regras efetivamente adotadas.
- [ ] REL-06 — Acompanhar erros, funil, FPS e Core Web Vitals depois da entrega; anotar resultados observados, sem assumir ganhos apenas pela redução de arquivos.

### Primeira entrega recomendada

MOB-01 a MOB-04, CAM-01 a CAM-05, INPUT-01/03/04/05/07/09 e HUD-01 a HUD-04: um protótipo funcional com zoom acessível, personagem legível, bomba/esquiva maiores e movimento simultâneo. Pinça, personalização avançada e empacotamento vêm depois da validação desse núcleo.

### Pontos de entrada no código

| Frente | Arquivos principais |
|---|---|
| Câmera e renderização | `src/scene.js` |
| Entrada, comandos e fluxo | `src/main.js` |
| HUD mobile e menus | `src/pixel-interface.css`, `src/hud.js`, `src/refuge-home.js`, `src/refuge-home.css`, `src/pixel-atlas.js` |
| Campanha e regras | `src/game.js`, `shared/expedition.js`, `src/legacy.js` |
| Skills | `src/skills.js`, `src/game.js` |
| Chefes | `src/boss-ai.js`, `src/boss-mechanics.js`, `src/boss-models.js` |
| Ranking | `src/global-ranking.js`, `src/ranking-view.js`, `server/leaderboard-api.js`, `server/validation.js`, `shared/scoring.js` |
| Publicação | `scripts/build-cloudflare.mjs`, `wrangler.jsonc` |

## Referências

- [Revisão de desempenho local](../PERFORMANCE-2026-09-07.md) e [regras atuais da expedição](../EXPEDITIONS.md).
- [Game Accessibility Guidelines — acesso rápido ao jogo](https://gameaccessibilityguidelines.com/allow-the-game-to-be-started-without-the-need-to-navigate-through-multiple-levels-of-menus/): referência para reduzir etapas antes de jogar.
- [web.dev — instalação de PWA](https://web.dev/learn/pwa/installation): instalação varia conforme navegador/plataforma; testar a experiência distribuída.
- [Capacitor — documentação oficial](https://capacitorjs.com/docs): container nativo para aplicações web e acesso a APIs nativas, caso essa necessidade seja confirmada.
