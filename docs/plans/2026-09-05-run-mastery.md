# Skills, despertares e chefes — versão local

## Direção

Manter as três escolhas por draft e ampliar o catálogo de 10 para 16 skills.
Uma escolha continua uma linha já iniciada, com preferência por linhas próximas
do despertar; as outras duas vêm do conjunto disponível. Cada skill permanente
desperta na quinta escolha. Segundo fôlego é uma cura consumível.

Cristais dão XP; subir de nível pausa a simulação e oferece uma evolução gratuita.
A forja continua consumindo cristais. O custo de XP cresce em 9 por nível, em vez
de multiplicar por 1,3, para permitir desenvolver uma linha numa fase de dois minutos.
Despertares, skills e relíquias reiniciam entre fases; a meta progressão fica.

## Linhas novas

- Arco voltaico: dano elétrico que encadeia alvos; quinta escolha atinge até cinco.
- Cristal de inverno: lentidão, depois congelamento e dano contra alvos congelados.
- Rosa de estilhaços: diagonais alternadas com melhorias de dano, culminando em supernova.
- Égide de cristal: escudo periódico; desperta para regeneração mais rápida e cura ao bloquear.
- Alquimia da fenda: XP adicional e desconto de 25% na forja ao despertar.
- Rastro de cometa: dano na trajetória da esquiva; despertar adiciona impacto em cruz.

Os ícones reutilizam identidades da biblioteca pixel art aprovada através de
referências explícitas no catálogo. Não há imagens externas ou novas dependências.

## Chefes e arenas

Todas as arenas têm largura e altura anteriores +2 (um tile por lado); o primeiro
mapa passa de 15×13 para 17×15. Bordas e dimensões ímpares permanecem.

Um ritual substitui cada terceiro ataque e marca a transição de meia vida. Há
avisos de 2–2,4s: pilares quebrados nas ruínas/jardim, linhas abertas na forja,
colunas elétricas, diagonais glaciais e teleporte espectral. Ritos abrem rotas;
nunca criam obstáculos que prendam o jogador. Forja/trovão causam dano no impacto.

Depois aparecem até duas runas destrutíveis com vida 2 e duração 16s. Elas não
bloqueiam movimento. Quebrá-las atordoa o chefe por 4s e aumenta o dano recebido
por ele em 50%. A transição substitui os dois reforços que aumentavam a dificuldade.
Resíduos de qualquer explosão permanecem puramente visuais.

## Refúgio e aprovação

`HUD-APROVACAO.html` continua isolado do save e das compras reais. O combate usa
agora a simulação real, sem invencibilidade, cronômetro fixo ou cartas falsas.
Os kits de teste aplicam os mesmos equipamentos do motor. A oficina tem um
grimório com estratégias e atalhos para testar a quinta seleção em uma arena
separada. O catálogo e menus de conta ainda são demonstrativos, conforme a proposta.

Música original: **O pavio pode esperar**, 76 BPM, oito compassos, harmonia
C–G–Am–F / C–Em–F–G, caixinha de música e arpejos suaves, sem percussão. Composta
em `src/music.js`, tocada via Web Audio após o primeiro gesto, com volume e mute.
Os passeios, poses, contato com o chão e atividades de Faísca foram preservados.

## Validação

Testes de simulação cobrem 5/5, reaplicação, reset, ofertas, sinergias, impactos
únicos, limites e abertura das arenas, runas, pausa, arte e traduções em inglês.
Revisão no navegador: despertar de pólvora e raios, combate real, ciclo do chefe,
derrota/retorno, grimório e configurações de áudio. Mobile 390×844 e 844×390:
cartas roláveis sem overflow horizontal, controles separados da arena.

Alterações locais; publicação da nova HUD e do balanceamento ainda não realizada.
