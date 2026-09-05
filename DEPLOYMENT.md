# Publicação na Cloudflare Pages

- Jogo: https://bomb-rift.pages.dev/
- Projeto Pages: `bomb-rift`
- Versão inicial publicada: 2.2.0, em 2026-09-05.
- Método: Direct Upload pelo painel, sem Functions ou backend.

Versão 2.3 publicada e validada em 2026-09-05. O novo pacote contém português/inglês e assets pixel art importados pelo Vite: 168 arquivos, aproximadamente 12,57 MiB. As imagens têm hash e cache imutável; páginas de aprovação e fixtures de QA continuam excluídas. Antes de enviar, regenere o ZIP com os comandos abaixo.

## Preparar uma atualização

Na raiz deste projeto:

```powershell
npm test
npm run build:cloudflare
Compress-Archive -Path 'dist-cloudflare/*' -DestinationPath 'bomb-rift-cloudflare.zip' -Force
```

Em Cloudflare → Workers & Pages → bomb-rift, crie um novo deployment de produção e envie `bomb-rift-cloudflare.zip`. Espere a confirmação e valide o endereço público. Atualizar os arquivos locais não publica automaticamente.

O build dedicado usa `dist-cloudflare`, preservando o preview local em `dist`. Inclui código, fontes, modelos de chefes embutidos e favicon; exclui as páginas de aprovação, a biblioteca experimental de pixel art e seus arquivos de trabalho. Quando novos assets entrarem no jogo, importe-os pelo código para que o Vite os inclua ou ajuste explicitamente a cópia de arquivos públicos no script.

Assets com hash recebem cache de um ano. O endereço antigo `/BOMB-RIFT.html` redireciona para `/`. Há página 404 própria. O script verifica o limite de 25 MiB por arquivo e 1.000 arquivos do upload pelo painel.

O projeto foi criado com Direct Upload. Para automatizar atualizações, é possível usar Wrangler/CI; a integração Git nativa requer um novo projeto Pages.

## Validação desta publicação

77 testes passaram. Build: 168 arquivos, 12,57 MiB descompactados. Upload de 168/168 confirmado pelo painel. Menu 02.3, configurações com idioma e ausência de erros de execução foram verificados no endereço público. O console mostrou dois avisos de iluminação `THREE.sigmaRadians`, sem erros de execução no fluxo verificado.

Progressão e ranking continuam salvos no navegador, por origem. O progresso de localhost não migra automaticamente para o domínio publicado.
