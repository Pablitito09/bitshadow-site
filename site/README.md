# BitShadow LITE — Site de apresentação e download

Este é o site oficial do BitShadow LITE: página de início elegante, demonstração de Codificar/Descodificar no browser e ponto de download da aplicação **BitShadow PRO** (desktop).

## Conteúdo

- **Início** — Hero com projeto académico, descrição, CTAs e estatísticas (256 bits, 100K PBKDF2, 100% local, 0 dados enviados).
- **Codificar** — Interface igual ao projeto correto (indexPro): upload de imagem, mensagem, chave AES-256, codificação LSB.
- **Descodificar** — Interface igual ao projeto correto: upload de imagem, chave, extração da mensagem.
- **Documentação** — Texto resumido e link para download da PRO.

## Como usar

1. **Local:** abra `index.html` no browser a partir da pasta `site/`. O link "Baixar Versão PRO" aponta para `../dist/win-unpacked/BitShadow Pro.exe` (funciona se mantiver a estrutura de pastas do projeto).

2. **Publicar na web:** suba a pasta `site/` para o seu alojamento (Netlify, GitHub Pages, etc.). No ficheiro `index.html`, altere a constante `DOWNLOAD_PRO_URL` no início do `<script>` para o URL público do ficheiro da app (ex.: link do Dropbox com `?dl=1`, ou do Google Drive, etc.).

```javascript
const DOWNLOAD_PRO_URL = 'https://seu-link.com/BitShadow-Pro.exe';
```

## Estrutura

- `index.html` — Página única com todas as secções (Início, Codificar, Descodificar, Documentação) e lógica de esteganografia (AES-256 + LSB), igual ao projeto correto.

Não são necessárias instalações nem servidor para uso local; basta abrir o ficheiro no browser.
