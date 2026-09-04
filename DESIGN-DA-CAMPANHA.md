# BOMB RIFT 2.0 — Crônicas da Fenda

## O ciclo implementado

Atlas → selecionar fase → sobreviver 120 segundos → enfrentar o guardião → receber essências e liberar a próxima fase → investir no legado → retornar com uma build nova.

Cada fase reinicia vida, nível, XP, cristais, escolhas de skill, preço da forja e relíquias. A vida e o dano iniciais incorporam as melhorias permanentes compradas. Essências, melhorias, recordes e a maior fase desbloqueada ficam no mesmo save local da versão anterior (`bomb-rift-v1`); a atualização não remove esse save. O ponto inicial do novo atlas é a fase 1 para saves que ainda não tinham campanha.

As fases conquistadas podem ser revisitadas e voltam a render essências. A recompensa de cada tentativa é creditada uma única vez. Morrer rende uma essência a cada cinco abates, mais as três de um minichefe derrotado. Vencer acrescenta a recompensa exibida no atlas. Ao conquistar a fase 9, abre-se a fase 10: outro ciclo dos três mundos, com inimigos e chefes mais fortes. Não há um limite final de fases.

## Reinos e fases

| Fase | Reino / local | Arena | Particularidade |
|---|---|---|---|
| 01 | Vale dos Ecos / O primeiro eco | 15 × 13 | Limos pouco atentos, começo mais tranquilo |
| 02 | Vale dos Ecos / Pátio esquecido | 15 × 13 | Praça aberta; sentinela aos 60s |
| 03 | Vale dos Ecos / Campanário partido | 17 × 13 | Cruzamento central; sentinela; avatar soberano de Mórthos |
| 04 | Caldeira Rubra / Boca da fornalha | 17 × 13 | Gêiseres de lava anunciados no piso |
| 05 | Caldeira Rubra / Engrenagens em brasa | 17 × 15 | Corredores amplos, besouros e sentinela |
| 06 | Caldeira Rubra / Trono de escória | 19 × 15 | Cruzamento maior; soberano Vulkar |
| 07 | Maré Espectral / Costa dos sussurros | 17 × 15 | Espectros com disparos marcados e marés em linha |
| 08 | Maré Espectral / Jardim submerso | 19 × 15 | Praça de cristais; sentinela espectral |
| 09 | Maré Espectral / O último horizonte | 19 × 17 | Maior arena; soberana Nyxara; abre outra ascensão |

Cada mundo tem três encontros com avatares progressivamente mais fortes do seu guardião. São três identidades de chefe, com modelos, retratos, cores, frases e padrões próprios. Mórthos alterna impacto e cruz; Vulkar varre linhas da arena; Nyxara cria selos ao redor do jogador e invoca espectros. Abaixo de metade da vida, entram em fúria.

## Curva de dificuldade

O primeiro mundo começa com três limos, sem leitura preventiva de bombas no início. Cada monstro recebe um nível individual de atenção. Com o avanço das fases e do relógio, aumenta a parcela que reconhece bombas e busca saída. Cercos só entram quando a inteligência acumulada passa de um limite; as investidas iniciais têm preparação mais longa. Nem todos os inimigos ficam igualmente inteligentes.

Os besouros são lentos e resistentes. Os espectros mantêm distância e anunciam o alvo antes de conjurar. Sentinelas têm mais vida, conjuram uma cruz e garantem uma relíquia. A quantidade e a frequência dos monstros têm limites para preservar a leitura e o desempenho.

## Relíquias e combinações

Um baú com cristal dourado próximo do início garante uma relíquia por fase. Outros caixotes e inimigos também podem derrubá-las. Itens recolhidos são equipados automaticamente, aparecem no HUD e podem ser consultados com **B**. Não há duplicatas da mesma relíquia na build; todas podem se combinar.

- **Fogo azul:** +1 dano, chamas azuis com duração maior.
- **Bomba-relógio:** +1 segundo de pavio, +2 dano, +1 alcance; bomba com relógio visível.
- **Eco do caos:** repete a explosão após 0,85s com metade do dano, arredondado para cima. A repetição é sinalizada e também causa dano ao jogador.
- **Geada do vazio:** desacelera inimigos atingidos; efeito menor sobre chefes.
- **Carapaça solar:** +20 vida máxima, cura 20, reduz dano recebido em 20%.
- **Órbita de cobre:** +2 raio de coleta e +1 bomba simultânea.
- **Última faísca:** uma ressurreição por fase, com metade da vida e três segundos de proteção.

Exemplo: fogo azul + relógio + eco cria bombas mais lentas, com chamas azuis fortes e uma segunda explosão. Acrescentar geada ajuda a prender os monstros na área, enquanto a carapaça reduz o risco da própria explosão. As skills da forja continuam funcionando sobre esse conjunto.

## Direção visual

O atlas usa ilhas vetoriais originais, caminhos pontilhados, marcos do cenário e uma prévia animada do guardião. Prévia de mundos bloqueados está liberada; entrar exige conquistar a fase anterior. O HUD aprovado, os controles, as barras de vida e o estilo de combate em Three.js foram mantidos. Foram acrescentados relíquias visíveis, avisos de minichefe, efeitos de conjuração, chamas azuis, preparação do eco e sons próprios.

## Referências consultadas

As referências orientaram a variedade e a progressão; personagens, arte e áudio não foram copiados.

- [Hades — Supergiant Games](https://www.supergiantgames.com/games/hades/): ação roguelite com um mundo e personagens marcantes. Aqui, essa direção aparece na presença dos guardiões e na continuidade do legado.
- [Dead Cells — atualização Break the Bank](https://deadcells.com/patchnotes/28): exemplo concreto de um bioma com criaturas, armas e mecânicas associados ao mesmo tema. Isso inspirou a coerência entre reino, perigos, monstros e relíquias.
- [Slay the Spire — Mega Crit](https://www.megacrit.com/games/): exploração e relíquias como parte da progressão. O atlas de BOMB RIFT usa uma sequência de desbloqueios; não é um sistema de ramificações aleatórias.

## Próximo passo de conteúdo

Gerar os nove temas de fase, três temas de guardião e o tema do atlas com o arquivo **TRILHA-SONORA.md**. A música gravada será integrada quando os arquivos forem enviados. O jogo atual funciona com efeitos sintetizados localmente, inclusive offline.
