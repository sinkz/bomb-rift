# Português, inglês e assets aprovados

Escopo autorizado: implementar duas frentes em paralelo com subagentes e revisão integrada ao final. Preservar o comportamento do jogo 2.2 e o progresso existente.

## Idiomas

Disponibilizar português brasileiro e inglês no menu e nas configurações. Salvar a preferência separadamente do progresso. Traduzir interface, descrições, atributos, mundos, avisos e textos de acessibilidade. Manter IDs usados pela simulação e pelo armazenamento. Trocar idioma não deve reiniciar a partida nem gastar recursos. Atualizar o idioma do documento e a formatação de números.

## Arte

Aplicar os recortes aprovados de `public/pixel-library` em habilidades, relíquias, recursos, talentos, equipamentos, contratos, bestiário, controles e retratos. Preservar os chefes 3D, as arenas, números, textos e barras proporcionais. Usar recursos visuais decorativos apenas onde mantêm a leitura e a interação existentes. Empacotar os assets de runtime pelo Vite, sem enviar pranchas, ZIPs ou páginas de aprovação para o build Cloudflare.

## Integração e revisão

Separar os arquivos de tradução e renderização textual dos helpers de arte. Integrar os pontos compartilhados após cada frente estar pronta. Verificar menu, atlas, refúgio, escolhas de habilidades, HUD e configurações nos dois idiomas; conferir troca de idioma, persistência e imagens carregadas. Executar testes do jogo e build de produção. Manter também a geração de HTML offline com os novos assets embutidos.

A versão publicada em Cloudflare permanece como referência até a revisão local desta integração. A implementação desta frente não publica automaticamente.
