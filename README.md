# termux-file-api

API em Express para listar, criar, ler, renomear e deletar arquivos e pastas,
restrita a home do Termux, com autenticacao por token no header.

---

## Visao geral da estrutura (backend)

```
termux-file-api/
├── .env                    # Variaveis de ambiente (API_TOKEN, PORT)
├── .gitignore
├── API.md                  # Documentacao detalhada de todas as rotas da API
├── package.json            # Dependencias do backend (express, dotenv)
├── server.js               # Entry point: configura Express, middlewares, rotas
├── config/
│   └── config.js           # Carrega .env, define ROOT_DIR (home do Termux), PORT, HOST, NETWORK_ACCESS, API_TOKEN
├── middleware/
│   ├── auth.js             # Valida header x-api-token em /api/*
│   ├── logger.js           # Log de requisicoes: IP, metodo, rota, status, tamanho, tempo
│   └── errorHandler.js     # Mapeia codigos de erro para HTTP status e formato JSON
├── routes/
│   ├── folders.js          # Rotas de pastas (listar, criar, renomear, deletar)
│   └── files.js            # Rotas de arquivos (criar, ler, raw, buscar, salvar, renomear, deletar)
├── utils/
│   └── pathUtils.js        # resolveSafePath(): resolve caminhos relativos de forma segura dentro do ROOT_DIR
├── public/                 # Arquivos estaticos servidos pelo Express (build do front)
│   ├── index.html
│   ├── favicon.svg
│   ├── icons/              # Pasta com milhares de SVGs de icones de arquivos e pastas
│   └── assets/             # JS e CSS compilados pelo Vite
└── THEME.md                # (fora do escopo deste README)
```

---

## Backend (raiz do projeto)

### `server.js` — Entry point
- Cria app Express
- `requestLogger` global (antes de tudo): loga **toda** requisicao
- `express.json()` para parse de JSON
- `express.static('public')` serve o build do front em producao
- Aplica `authMiddleware` em **todas** as rotas `/api/*`
- Monta rotas: `/api/folders` -> `foldersRoutes`, `/api/files` -> `filesRoutes`
- `errorHandler` por ultimo para capturar erros nao tratados
- Escuta na `PORT` no host definido por `NETWORK_ACCESS` (`127.0.0.1` ou `0.0.0.0`) e loga `ROOT_DIR`

### `middleware/logger.js`
Registra cada requisicao no terminal, **funcionando nos dois modos** (com ou sem
`NETWORK_ACCESS`), e formata:

```
<ISO timestamp> | <IP do cliente> | <METODO> <rota> | <status> | <tamanho>B | <tempo>ms
```

Exemplo:
```
2026-09-28T15:00:39.545Z | 192.168.1.102 | GET /api/folders | 200 | 4478B | 11.8ms
2026-09-28T15:00:39.612Z | 192.168.1.102 | GET /api/folders | 401 | 76B | 2.4ms
```

- O IP vem de `req.ip` / socket; respeita `x-forwarded-for` se houver proxy
- Requisicoes encerradas antes da resposta sao logadas como
  `Conexao encerrada antes da resposta`

### `config/config.js`
Carrega `.env` via `dotenv` e exporta:
- `ROOT_DIR`: sempre a home do Termux (`process.env.HOME || os.homedir()`), **nunca fixo**
- `PORT`: `process.env.PORT || 3000`
- `HOST`: `0.0.0.0` se `NETWORK_ACCESS=true`, senao `127.0.0.1`
- `NETWORK_ACCESS`: booleano derivado de `process.env.NETWORK_ACCESS`
- `API_TOKEN`: `process.env.API_TOKEN || 'troque-por-um-token-forte-aqui'`

### `middleware/auth.js`
Intercepta requicoes para `/api/*`.
- Le header `x-api-token`
- Compara com `API_TOKEN` do config
- `401 UNAUTHORIZED` se ausente ou invalido
- `next()` se valido

### `middleware/errorHandler.js`
Mapeia codigos de erro internos para HTTP status:
| Codigo | Status |
|--------|--------|
| `INVALID_PATH` | 400 |
| `NOT_FOUND` | 404 |
| `ALREADY_EXISTS` | 409 |
| `NOT_A_DIRECTORY` | 400 |
| `NOT_A_FILE` | 400 |
| `PERMISSION_DENIED` | 403 |
| `UNAUTHORIZED` | 401 |
| `INTERNAL_ERROR` | 500 (default) |

Retorna JSON padrao: `{ success: false, error: { code, message } }`

### `utils/pathUtils.js`
**Seguranca central:** `resolveSafePath(relativePath)`
- Normaliza o caminho relativo (ex: `../../etc` -> `/etc`)
- Resolve contra `ROOT_DIR` usando `path.resolve`
- Verifica se o resultado **esta dentro de `ROOT_DIR`** (bloqueia path traversal)
- Lanca erro `INVALID_PATH` se tentar sair da home do Termux
- Exporta tambem `ROOT_DIR` para uso nas rotas

### `routes/folders.js` — `/api/folders`
| Metodo | Rota | Descricao |
|--------|------|-----------|
| `GET` | `/` | Lista conteudo da pasta (`?path=`). Sem `path` lista home do Termux (nao recursivo). Retorna `{ name, type: 'folder'|'file', size?, modified }` |
| `POST` | `/` | Cria pasta. Body: `{ path?, name }`. Valida dentro do ROOT_DIR. |
| `PATCH` | `/rename` | Renomeia pasta. Body: `{ path, newName }` |
| `DELETE` | `/` | Deleta pasta. Query: `path`, `recursive=true|false` |

### `routes/files.js` — `/api/files`
| Metodo | Rota | Descricao |
|--------|------|-----------|
| `POST` | `/` | Cria arquivo. Body: `{ path?, name, content? }` |
| `GET` | `/` | Le arquivo como texto (UTF-8). Query: `path` obrigatorio. Retorna `{ content, size, modified }` |
| `GET` | `/raw` | **Binario**. Stream direto do arquivo com `Content-Type` por extensao (MIME_BY_EXT). Usado para imagens/PDF/video. Header `Cache-Control: no-store`. |
| `GET` | `/search` | Busca recursiva (quick open). Query: `path`, `query` (substring, case-insensitive). Limites: `SEARCH_MAX_DEPTH=8`, `SEARCH_MAX_RESULTS=200`, ignora `node_modules`, `.git`, pastas ocultas, etc. |
| `PUT` | `/content` | Salva/atualiza conteudo. Body: `{ path, content }`. Cria se nao existe, sobrescreve se existe. |
| `PATCH` | `/rename` | Renomeia arquivo. Body: `{ path, newName }` |
| `DELETE` | `/` | Deleta arquivo. Query: `path` |

---

## Instalacao e execucao (Termux)

```bash
# 1. Instalar Node
pkg install nodejs -y

# 2. Backend
cd termux-file-api
npm install

# 3. Configurar .env
# Edite API_TOKEN, PORT e NETWORK_ACCESS
cp .env.example .env  # ou crie manualmente

# 4. Subir backend
npm start
# API rodando em http://localhost:3000 (ou http://0.0.0.0:3000 se NETWORK_ACCESS=true)

# 5. Front-end (outro terminal/aba)
cd web
npm install
npm run dev
# Abre http://localhost:5173 (proxy /api -> backend)
```

---

## Variaveis de ambiente

### Backend (`.env` na raiz)
```
API_TOKEN=seu-token-seguro-aqui
PORT=3000
NETWORK_ACCESS=false
```

### `NETWORK_ACCESS`
| Valor | Bind | Quem acessa |
|-------|------|-------------|
| `false` (padrao) | `127.0.0.1` | Somente o proprio dispositivo (localhost) |
| `true` | `0.0.0.0` | Qualquer dispositivo na mesma rede (Wi-Fi/dados) |

Aceita `true`/`1`/`yes`/`on` (case-insensitive) como verdadeiro.

Na startup o servidor sempre lista os IPs da rede local, nos dois modos:

```
API rodando em http://localhost:3000
HOST: 127.0.0.1 | rede local: desativada
Acesso na rede local: http://192.168.0.15:3000 (bloqueado — NETWORK_ACCESS=false)
ROOT_DIR: /data/data/com.termux/files/home
```

```
API rodando em http://0.0.0.0:3000
HOST: 0.0.0.0 | rede local: ATIVA
Acesso na rede local: http://192.168.0.15:3000
ROOT_DIR: /data/data/com.termux/files/home
```

Apos isso, **toda** requisicao (nos dois modos) gera uma linha de log com IP,
metodo, rota, status, tamanho e tempo — veja `middleware/logger.js`.

> Ao exponer na rede, use um `API_TOKEN` forte: qualquer dispositivo da mesma
> rede consegue acessar a API com o token.

### Front-end (`web/.env`)
```
VITE_API_BASE_URL=        # vazio = /api (usa proxy Vite em dev)
# Em producao, se front e backend estiverem no mesmo host, deixe vazio.
# Se separados, coloque a URL completa do backend (ex: https://api.exemplo.com)
```

---

## Fluxo de autenticacao

1. Usuario abre front -> sem token na `sessionStorage`
2. Status bar mostra "Sem token — clique para configurar"
3. Clica -> vai para `/settings`
4. Digita token (mesmo do `API_TOKEN` do backend) -> **Salvar**
5. Front testa com `GET /api/folders?path=/`
6. Se `success` -> token salvo na `sessionStorage`, volta para Explorer
7. Todas as chamadas `api.*` incluem header `x-api-token` automaticamente
8. Fechar aba/navegador -> `sessionStorage` limpo -> token perdido (por design)

---

## Seguranca

- **Path traversal bloqueado**: `resolveSafePath` garante que **nenhuma** operacao saia de `ROOT_DIR` (home do Termux)
- **Token no header**: nunca na URL, nunca no localStorage, apenas `sessionStorage` (memoria da sessao)
- **CORS**: em dev, proxy do Vite resolve; em producao, sirva front e backend no mesmo host ou configure `cors` no Express
- **Permissoes SO**: o processo Node roda com as permissoes do usuario Termux; so acessa o que o usuario acessa

---

## Testes rapidos (curl)

```bash
# Listar home
curl -H "x-api-token: seu-token" http://localhost:3000/api/folders

# Criar pasta
curl -X POST -H "x-api-token: seu-token" -H "Content-Type: application/json" \
  -d '{"path":"/","name":"teste"}' http://localhost:3000/api/folders

# Criar arquivo
curl -X POST -H "x-api-token: seu-token" -H "Content-Type: application/json" \
  -d '{"path":"/teste","name":"ola.txt","content":"hello"}' http://localhost:3000/api/files

# Ler arquivo (texto)
curl -H "x-api-token: seu-token" "http://localhost:3000/api/files?path=/teste/ola.txt"

# Baixar imagem (binario)
curl -H "x-api-token: seu-token" "http://localhost:3000/api/files/raw?path=/teste/foto.png" -o foto.png

# Buscar arquivos
curl -H "x-api-token: seu-token" "http://localhost:3000/api/files/search?path=/teste&query=ola"
```

Cada `curl` acima gera uma linha no terminal do servidor, ex.:

```
2026-09-28T15:00:39.545Z | 127.0.0.1 | GET /api/folders | 200 | 4478B | 11.8ms
```

Com `NETWORK_ACCESS=true`, troque `localhost` pelo IP mostrado na startup
(ex: `http://192.168.0.15:3000`) para testar de outro dispositivo da rede.

---

## Documentacao complementar

- **API.md**: documentacao completa de todas as rotas, parametros, respostas, codigos de erro
- **THEME.md**: (fora do escopo) documentacao de temas/cores