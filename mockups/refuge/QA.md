# Revisão do mockup — 2026-09-05

## Revisão 06 — mais vida no refúgio

- Atlas novo inspecionado com passarinhos em 16s, leitura em 34s e soneca em 43s na revisão ampliada. Pouso alinhado à mão, página virando, personagem dormindo apoiado no chão.
- Clique no Faísca chama pássaros e leitura; Enter no botão do personagem chama a próxima ação. Alvo saiu do contêiner decorativo para ser acessível e receber cliques.
- Opção de reduzir movimento mantém pose, quadro e posição estáveis entre observações; configuração original restaurada após o teste.
- Rotina de 52s percorre passeio, rega, passarinhos, descanso, leitura, soneca e repouso. Continuidade de posição verificada a cada 0,05s por duas voltas; leitura e soneca alternam de ordem. Ações manuais aguardam a chegada e voltam à rotina a partir da posição atual.
- Console sem erros no refúgio e revisão ampliada. A arte da caminhada e sua sombra alinhada foram mantidas; sombra da soneca acompanha a silhueta mais larga. Sem mudanças no jogo publicado.

- JavaScript: `node --check mockups/refuge/main.js` passou.
- Desktop 1280×720: refúgio, mapa, chefe 3D, loja, build veloz, preparação e mochila revisados no navegador.
- Mobile 390×844: refúgio, ranking, mapa com chefe, entrada na arena, cartas de evolução, controles e botão da HUD do chefe revisados.
- Paisagem 844×390: arena completa, vida, barra de chefe, joystick e ações nos cantos revisados. Viewport temporário restaurado ao terminar.
- Compra das botas: 240 → 160 essências, botão passa a adquirido, botas presentes na mochila.
- Build veloz: comparação mostra 100 HP, 2 de dano e 6,8 de movimento.
- Prévia de combate carregou o renderer original, sem erro de execução. Joystick recebeu arrasto e botão de bomba recebeu clique.
- Nenhuma imagem quebrada ou overflow horizontal de página nos estados inspecionados. A faixa de mundos possui rolagem horizontal intencional quando necessário.
- Console sem erros nos fluxos revisados. Os avisos de iluminação do preview 3D são os do módulo existente.
- Corrigidos: nomes de assets antigos, mapa alto demais no desktop, botão do jardim próximo ao texto inferior e recorte da arena em retrato.
- Arquivos de produção permanecem iguais ao commit `90b5524`. Apenas a entrada `HUD-APROVACAO.html` e `mockups/refuge/` foram acrescentadas após o commit.

Limites: simulação visual sem persistência, economia de exemplo, sem nova trilha; tradução completa e testes físicos multitoque ficam para a integração aprovada. Redimensionamento no navegador não substitui teste em aparelho real.

## Primeira tentativa de refinamento — rejeitada pelo usuário

Ciclo antigo substituído por cinco camadas articuladas da arte original. Pernas e braços alternam em oposição; pé em recuperação eleva e o corpo acompanha discretamente. A cadência depende da distância percorrida. Trajeto fecha no mesmo ponto, acelera e desacelera suavemente; ir regar também interpola a posição. Redução de movimento retorna à pose de repouso. Sintaxe verificada e console do refúgio sem erros.

## Revisão por execução completa — versão lateral posteriormente rejeitada

Antes de editar: ciclo observado por 27 segundos, com quadros em 0 / 3,5 / 7 / 10,5 / 14 / 17,5 / 21 / 24,5s. Confirmados perfil frontal inadequado para a direção lateral e articulações rígidas. Após a nova arte lateral e pernas com duas articulações: outros 27 segundos no refúgio, observando ida para direita, descanso, retorno para esquerda e rega. Visor aponta para o destino na ida e volta. Renderer também inspecionado ampliado em 3,5s e 14s usando a linha do tempo. Console sem erros. Página de revisão permite pausar e reproduzir em câmera lenta. Não foi exportado GIF; foi usada a alternativa pedida de observar a execução completa.

## Revisão 04 — frente e costas

- Renderer lateral substituído por quadros completos, seguindo a preferência do usuário. Regar, descansar e repousar usam a arte original.
- Observação da execução inteira por 26,5 segundos no cenário: captura frontal em 2,5s, rega em 8,5s, costas no retorno em 14,5s, descanso em 20,5s e novo ciclo em 26,5s.
- Estados DOM confirmaram `front/walk`, `front/water`, `back/walk` e `front/rest`. Console sem erros.
- Visualização ampliada conferida em 3,5s (frente) e 14s (costas), com pausa e linha do tempo.
- `node --check` passou para `main.js` e `hero-walk.js`. Alteração restrita ao mockup; não houve publicação ou mudança no jogo.

## Revisão 05 — contato com o chão

A sombra antiga tinha o centro 8,28 px abaixo da linha das solas no desktop. Alinhada à base 108/128 do sprite (84,375% do canvas), com largura e altura menores; contorno reduzido para 1 px. Medição de layout após o ajuste: diferença de 0 px entre a base dos pés e o centro da sombra em desktop e viewport de 390 px. Console sem erros; viewport restaurado. A caminhada e os sprites aprovados não foram alterados.
