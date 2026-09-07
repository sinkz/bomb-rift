# Playtest dos chefes — GPT-5.6 Luna

Dois subagents jogaram pela interface do navegador, em abas próprias. Nenhuma alteração de código durante o teste. Teste qualitativo curto, sem notas de dificuldade.

## Cobertura

- Luna IA: Mórthos, Nyxara e Nivor no teste direto. Movimento e bombas; Shift enviado, mas sem comprovação visual inequívoca da esquiva nesse teste.
- Luna mecânicas: entrou pelo mapa na fase 1 do jogo normal; testou movimento, bomba e Shift. Observou XP, consumo/recarga de bombas e HUD de esquiva. Depois experimentou Briarok, Fulgra e Vulkar na arena de teste.
- O teste direto protege a vida e desativa inimigos comuns. Não permite concluir mortalidade, pressão combinada da horda ou equilíbrio da dificuldade.

## Resultados positivos observados

- Mórthos alternou preparação, perseguição e recuperação. Bombas reduziram a vida de 18 para 9. Destruição de obstáculos mudou os corredores.
- Nyxara se reposicionou; foram observadas posições 9,7, depois 1,3 e 11,11, com aviso Fenda Espectral.
- Nivor alternou preparação e perseguição, com avisos Lanças da Aurora e Coroa do Inverno e efeito de gelo.
- Briarok, Fulgra e Vulkar passaram pela entrada e criaram duas runas. Avisos próprios de sementes, trovão e válvulas foram observados.
- Não foi reproduzida falha de controle no jogo normal.

## Problemas e limitações

1. **Tela de teste — foco:** selecionar um chefe deixa o foco no seletor. É necessário clicar no cenário para voltar a movimentar. Não foi reproduzido no jogo normal.
2. **Tela de teste — texto antigo:** nomes de ataques do chefe anterior aparecem durante a entrada do próximo. O código não limpa o campo de evento ao reiniciar; não é evidência de ataques trocados na campanha.
3. **Tela de teste — cobertura:** o painel cobre parte da arena. Os estados são úteis para depurar, mas sua legibilidade não comprova a clareza da animação sem painel.
4. **IA — reprodução adicional do agente principal:** em uma simulação isolada, com piso livre entre o chefe e uma barreira de caixas, e ataques regulares desativados para isolar a locomoção, o chefe permaneceu em 7,5 por oito segundos, em estado hunt, sem anunciar quebra. O caminho alternativo só quebra quando seu primeiro tile já é sólido; não avança pelo piso livre até a barreira. Não foi reproduzido pelos agentes durante a partida natural.

## Próximas prioridades sugeridas

- Corrigir o caso de bloqueio da IA acima e verificar se aparece na campanha com bombas e horda.
- Reforçar contraste e associação entre runas, aviso e efeito de atordoamento.
- Avaliar o combate completo sem invulnerabilidade, com horda ativa, antes de alterar dano ou velocidade com base neste playtest.
- Testar reconhecimento de preparação/recuperação pela animação, sem depender do texto de depuração.

As sugestões não foram implementadas nesta avaliação.
