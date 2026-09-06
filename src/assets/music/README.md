# Trilhas do refúgio

MP3s fornecidos pelo usuário em 05/09/2026. Os arquivos nesta pasta são cópias
integrais dos originais, sem recodificação:

- `beneath-the-violet-arch.mp3` — Beneath the Violet Arch, 2:01,89, estéreo, 44,1 kHz, 192 kbps.
- `tiptoeing-past-the-sentinel.mp3` — Tiptoeing Past the Sentinel, 1:59,04, estéreo, 44,1 kHz, 192 kbps.

A prévia `HUD-APROVACAO.html` permite escolher entre as duas músicas e a trilha
sintetizada revisada. Beneath é a seleção inicial. A escolha fica somente nesta
sessão do mockup; não escreve no save. A música entra após um gesto do usuário.

`RecordedMusic` decodifica sob demanda, mantém velocidade 1×, repete o arquivo,
aplica fades de 650ms às extremidades somente na memória e controla volume pelo
Web Audio. Silenciar, ocultar a página ou entrar no combate interrompe a faixa;
voltar retoma a posição. Trocar de música inicia a nova faixa do começo.
Se o download/decoder falhar, a versão sintetizada assume e o painel informa isso.

A sintetizada usa notas da tríade de cada compasso, registro menos agudo e
envelopes que terminam antes da próxima harmonia. Esta alteração ainda é local.
