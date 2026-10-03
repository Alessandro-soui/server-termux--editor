# vscode-clone-react

Front-end em React que imita a interface do VS Code (activity bar, sidebar
com arvore de arquivos, abas, editor e status bar), consumindo a
`termux-file-api` (Express) para listar, abrir, editar, criar, renomear e
deletar arquivos/pastas dentro da home do Termux.

Stack: **Vite + React 19 + Tailwind CSS v4 + React Router v7 + lucide-react + xterm.js**.

## Como foi criado

```bash
npm create vite@latest vscode-clone-react -- --template react
cd vscode-clone-react
npm install
npm install -D tailwindcss @tailwindcss/postcss postcss autoprefixer
npm install react-router-dom lucide-react xterm xterm-addon-fit
```

## Rodar

1. Suba primeiro o backend (`termux-file-api`, `npm start`, porta 3000).
2. Nesse projeto:

```bash
npm install
npm run dev
```

3. Abra `http://localhost:5173`.

O `vite.config.ts` já tem um proxy de `/api` -> `http://localhost:3000`,
então em dev não há problema de CORS.

## Configurar o token

**Nao existe `VITE_API_TOKEN`.** Nada de token no `.env`/build, e **nao ha
modal na tela de entrada**: a pagina abre direto no editor.

O token e configurado em **Settings** (engrenagem na activity bar, ou o
indicador na status bar):

- **Token (x-api-token)**: o mesmo valor de `API_TOKEN` no `.env` do backend,
  com botao mostrar/ocultar. O botao **Salvar** grava e testa chamando
  `GET /api/folders?path=/`; se responder `success`, mostra "Token salvo e
  conexao testada com sucesso". **Esquecer** limpa o token da sessao.
- **URL base da API**: vem **apenas** do `.env`, em `VITE_API_BASE_URL`
  (vazio = `/api`, que usa o proxy do Vite). Nao ha campo para isso na tela de
  Settings nem valor salvo no navegador.

Ha **um unico botao** ("Salvar"), que grava o token digitado e testa a
conexao.

Sem token:

- A status bar mostra "Sem token — clique para configurar" e leva para as
  Settings.
- O botao **Abrir pasta** (e o item `...` da title bar) **redireciona para
  `/settings`** em vez de abrir o seletor de pastas.
- O Explorer mostra "Sem token configurado" com um botao para as Settings e nao
  faz nenhuma requisicao.

Onde o valor fica:

| Dado | Onde | Tempo de vida |
| --- | --- | --- |
| Token | `sessionStorage` (`vs_api_token`) | temporario, some ao fechar a aba/ponto |
| URL base | `.env` (`VITE_API_BASE_URL`) | fixa no build |

## Abrir pasta

A arvore comeca **vazia**: nada e listado ate voce escolher uma pasta.

- O botao **Abrir pasta** aparece no estado vazio do editor, no cabecalho do
  Explorer e no menu `...` da title bar. Ele abre um modal com as pastas da
  home:
  - Tocar na linha seleciona a pasta e expande as subpastas (lazy, igual o
    Explorer).
  - A pasta atualmente aberta aparece com o selo **aberta**.
  - **Abrir** troca a raiz do Explorer (`rootPath`).

## Selecao e criacao de arquivo/pasta

Tocar numa pasta na arvore a **seleciona** (destaque); tocar num arquivo
seleciona a pasta que o contem. Os botoes **Novo arquivo** e **Nova pasta** do
Explorer criam dentro da pasta selecionada (o `title` dos botoes mostra o
caminho alvo). Trocando a raiz do Explorer, a selecao volta para a nova raiz.

## Abas e grupo do editor

`Layout.tsx` monta um "frame": um `padding` de 1.5 com `gap` de 1.5 sobre o
fundo `--vs-bg-sidebar`, e dentro dele dois cards com a mesma moldura
(`1px solid var(--vs-border-group)` + `rounded-[5px]`):

- **Side panel** (`ActivityBar.tsx` + `Sidebar.tsx`): activity bar e Explorer
  vivem **no mesmo card, na mesma cor** (`--vs-bg-activitybar`), separados
  apenas por uma linha vertical de 1px (`--vs-border-light`). O item ativo da
  activity bar ganha fundo `--vs-bg-hover`, icone branco e a barra de 2px na
  esquerda. O Explorer (`w-52 md:w-60`) tem cabecalho fixo e arvore rolando.
- **Editor group** (`EditorGroup.tsx`): card que contem a tab strip
  (`TabBar.tsx`) grudada no topo da area de edicao, como no VS Code. A aba
  ativa usa o mesmo fundo do editor, tem os cantos superiores arredondados e
  uma linha azul no topo, entao ela se funde com o texto; as inativas ficam no
  cinza da tab strip, com divisor e hover.

## Salvar

- Botao **Salvar** fica no cabecalho do **Explorer** (Sidebar) ao lado do titulo `EXPLORER` (so aparece com aba de texto aberta; desabilitado quando nao ha alteracao).
- `Ctrl+S` / `Cmd+S` em qualquer lugar da janela.

Abas de imagem ou binario nao sao editaveis: `Ctrl+S` e o botao **Salvar** ficam
desabilitados, para nunca sobrescrever o arquivo com texto vazio.

## Editor

- Barra fininha no topo do editor (`h-5`, `text-[10px]`) com o caminho do
  arquivo atual; fica acima da area de codigo, como no VS Code. Nao ha mais
  barra inferior nem botao de salvar ali.
- Numero de linhas no gutter, com o **numero da linha sob o mouse em azul**
  (`--vs-accent-blue`), calculado pela posicao do cursor; o gutter rola junto
  com o texto.
- Contagem total de linhas no canto superior direito da area de codigo
  (`N linhas`).
- A caixa da title bar (`command center`) e pequena e sem icones: mostra o
  arquivo aberto, ou o nome da pasta raiz, ou `Explorer` quando nada esta
  aberto.

## Imagens e binarios

`Tab.kind` no `WorkspaceContext` define o que a aba mostra:

| `kind` | Como abre | O que aparece |
| --- | --- | --- |
| `text` | `GET /api/files` | gutter + `textarea` |
| `image` | `GET /api/files/raw` (blob) | preview da imagem, centralizado e com scroll |
| `binary` | `GET /api/files` | aviso de "arquivo binario, sem visualizacao" |

- `isImagePath()` (client) decide pela extensao: `png`, `jpg`, `jpeg`, `gif`,
  `webp`, `bmp`, `svg`, `ico`, `avif`, `heic`.
- O binario vem como `Blob` (header `x-api-token`, token nunca na URL) e vira
  `URL.createObjectURL`, revogado ao fechar a aba e ao desmontar o app.
- Extensao desconhecida que venha com caractere de substituicao (`\uFFFD`) ao
  ler como texto e tratada como binaria.

## Busca rapida de arquivos (Ctrl+P)

A caixa central da title bar (e o atalho `Ctrl+P` / `Ctrl+Shift+P`) abre um
modal de quick open:

- Ao digitar, a busca e recursiva dentro da pasta aberta, por substring do
  caminho (sem diferenciar maiusculas), com debounce de ~180ms.
- Backend: `GET /api/files/search?path=<pasta>&query=<texto>`; ignora
  `node_modules`, `dist`, `build`, `.git` e pastas ocultas, desce no maximo 8
  niveis e devolve ate 200 resultados (a lista avisa quando trunca).
- Ordenacao: nome que comeca com o texto, depois nome, depois caminho.
- `↑`/`↓` navegam, `Enter` abre a aba com o arquivo, `Esc` fecha. Clicar na
  linha tambem abre.
- Sem token, o modal manda para as Settings; sem pasta aberta, avisa para abrir
  uma pasta.

## Estrutura

```
src/
├── api/client.ts              # fetch com header x-api-token + leitura/escrita do token (sessionStorage)
├── context/
│   ├── SettingsContext.tsx    # URL base (localStorage) + token (sessionStorage) + estado do modal
│   └── WorkspaceContext.tsx   # abas abertas, aba ativa, refresh da arvore, raiz aberta (rootPath)
├── components/
│   ├── Layout.tsx             # title bar + frame dos cards + status bar + <Outlet/>
│   ├── ActivityBar.tsx        # icones Explorer / Settings (react-router NavLink)
│   ├── TitleBar.tsx           # titulo, busca rápida, botão do Terminal e toggle do Explorer
│   ├── StatusBar.tsx          # "Token configurado" leva para /settings
│   ├── Sidebar.tsx            # Explorer: abrir pasta, botão Salvar, arquivos, novo arquivo/pasta
│   ├── FileTreeItem.tsx       # item recursivo da arvore (duplo clique p/ opções, inclui 'Abrir no Terminal')
│   ├── TabBar.tsx             # tab strip do grupo (aba ativa fundida com o editor)
│   ├── EditorGroup.tsx        # card do grupo: tab strip + EditorPane + TerminalPanel
│   ├── EditorPane.tsx         # barra do caminho, preview de imagem/binario ou textarea com numeros de linha
│   ├── TerminalPanel.tsx      # painel gerenciador de terminais, suporta instanciar vários e fechar tudo
│   ├── XTermComponent.tsx     # xterm.js nativo + WebSockets (suporta Ctrl+V colando clipboard)
│   ├── QuickOpenModal.tsx     # busca rapida de arquivos (Ctrl+P)
│   └── OpenFolderModal.tsx    # modal "Abrir pasta" (arvore de pastas da home)
├── pages/
│   ├── Explorer.tsx           # rota "/" -> <EditorGroup/>
│   └── Settings.tsx           # rota "/settings" -> token + URL base
├── App.tsx                    # <Routes> + <OpenFolderModal/>
├── main.tsx                   # BrowserRouter + Providers
└── vite-env.d.ts              # tipos do Vite
```

## Funcionalidades

- Token e URL base em Settings, sem modal de entrada; sem token o "Abrir pasta"
  redireciona para as Settings.
- Modal **Abrir pasta** com arvore de pastas da home; a escolha vira a raiz do Explorer.
- Listar pastas/arquivos da home do Termux (lazy load ao expandir cada pasta).
- Abrir arquivo em aba, editar e salvar (`Ctrl+S` ou botão).
- Preview de imagens (png, jpg, gif, webp, svg...) e aviso para arquivos
  binarios.
- Busca rápida de arquivos por nome (`Ctrl+P` ou a caixa central da title bar).
- Criar arquivo/pasta na raiz (botões no topo do Explorer).
- Renomear/excluir arquivo ou pasta, e **Abrir no Terminal** (clique direito ou duplo-toque).
- Indicador de "nao salvo" na aba (bolinha branca no lugar do X).
- Tela de Settings para trocar URL base e o token da sessao.
- **Terminal Integrado**: Botão esquerdo na TitleBar (ao lado do menu) abre um painel preto inferior contendo múltiplos terminais conectados ao Bash do Termux via WebSockets (xterm.js). Suporta colar texto nativamente com Ctrl+V.
- **Redimensionadores Otimizados para Mobile**: Barras de puxar visíveis (linhas cinzas) para arrastar e ajustar o tamanho do terminal e do menu lateral de forma fluida no touch.

## Build de produção

```bash
npm run build
```

O backend serve o bundle estatico de `public/` (copie `dist/` para la depois
do build). Se for servir o `dist/` separado do backend, lembre de configurar
CORS no Express (pacote `cors`) ou colocar os dois atras do mesmo reverse
proxy, ja que o proxy do `vite.config.ts` so existe em modo dev (`npm run dev`).
