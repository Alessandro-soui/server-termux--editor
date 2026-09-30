---
tags:
  - api
  - documentacao
  - backend
formato: JSON
---

# API de Arquivos e Pastas

**Formato:** JSON (request e response), exceto `GET /api/files/raw`, que
responde o arquivo cru com o `Content-Type` do tipo.

> [!warning] Segurança
> Todas as rotas devem ser restritas a um diretório raiz (`ROOT_DIR`) para evitar acesso fora da área permitida.
> Recomendo usar `path.resolve` + validação com `startsWith`.

> [!info] Autenticação
> Todas as rotas `/api/*` exigem o header `x-api-token` com o valor de
> `API_TOKEN` do `.env`. Sem ele (ou errado) a resposta é `401 UNAUTHORIZED`.

---

## Estrutura de Resposta Padrão

### Sucesso
```json
{
  "success": true,
  "data": { ... }
}
```

### Erro
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Descrição do erro"
  }
}
```

### Códigos de erro comuns

| Código | Descrição |
|---|---|
| `INVALID_PATH` | caminho inválido ou fora do ROOT |
| `NOT_FOUND` | arquivo/pasta não existe |
| `ALREADY_EXISTS` | já existe |
| `NOT_A_DIRECTORY` | esperava pasta |
| `NOT_A_FILE` | esperava arquivo |
| `PERMISSION_DENIED` | — |
| `INTERNAL_ERROR` | — |

---

## 1. API de Pastas

### 1.1 Listar conteúdo de uma pasta

```
GET /api/folders?path=<caminho_relativo>
```

**Query params**

| Param | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `path` | string | não | Caminho relativo à raiz. Padrão: `/` |

**Exemplo**
```
GET /api/folders?path=/projetos
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "path": "/projetos",
    "items": [
      { "name": "app.js", "type": "file", "size": 1024, "modified": "2025-01-10T12:00:00Z" },
      { "name": "src",    "type": "folder", "modified": "2025-01-09T08:30:00Z" }
    ]
  }
}
```

---

### 1.2 Criar nova pasta

```
POST /api/folders
```

**Body**
```json
{
  "path": "/projetos",
  "name": "novo-projeto"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `path` | string | sim | Pasta pai (relativa à raiz) |
| `name` | string | sim | Nome da nova pasta |

**Response 201**
```json
{
  "success": true,
  "data": { "path": "/projetos/novo-projeto" }
}
```

**Erros:** `ALREADY_EXISTS`, `INVALID_PATH`

---

### 1.3 Renomear pasta

```
PATCH /api/folders/rename
```

**Body**
```json
{
  "path": "/projetos/novo-projeto",
  "newName": "projeto-renomeado"
}
```

**Response 200**
```json
{
  "success": true,
  "data": { "oldPath": "/projetos/novo-projeto", "newPath": "/projetos/projeto-renomeado" }
}
```

**Erros:** `NOT_FOUND`, `ALREADY_EXISTS`

---

### 1.4 Deletar pasta

```
DELETE /api/folders?path=<caminho>&recursive=<true|false>
```

| Query | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `path` | string | sim | Caminho da pasta |
| `recursive` | boolean | não | Se `true`, deleta conteúdo interno. Padrão: `false` |

**Response 200**
```json
{
  "success": true,
  "data": { "deleted": "/projetos/projeto-renomeado" }
}
```

**Erros:** `NOT_FOUND`, `NOT_A_DIRECTORY`

---

## 2. API de Arquivos

### 2.1 Criar arquivo

```
POST /api/files
```

**Body**
```json
{
  "path": "/projetos/src",
  "name": "index.js",
  "content": ""
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `path` | string | sim | Pasta onde criar |
| `name` | string | sim | Nome do arquivo |
| `content` | string | não | Conteúdo inicial. Padrão: `""` |

**Response 201**
```json
{
  "success": true,
  "data": { "path": "/projetos/src/index.js" }
}
```

**Erros:** `ALREADY_EXISTS`, `INVALID_PATH`

---

### 2.2 Ler conteúdo de um arquivo

```
GET /api/files?path=<caminho>
```

> Lê como `utf8`. Para imagens e outros binários use `GET /api/files/raw`.

**Response 200**
```json
{
  "success": true,
  "data": {
    "path": "/projetos/src/index.js",
    "content": "console.log('oi');",
    "size": 19,
    "modified": "2025-01-10T12:00:00Z"
  }
}
```

**Erros:** `NOT_FOUND`, `NOT_A_FILE`

---

### 2.3 Buscar arquivos recursivamente

```
GET /api/files/search?path=<pasta>&query=<texto>
```

| Query | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `path` | string | não | Pasta onde a busca começa. Padrão: `/` |
| `query` | string | não | Substring do caminho, sem diferenciar maiúsculas. Vazio = tudo |

**Response 200**
```json
{
  "success": true,
  "data": {
    "path": "/projetos",
    "results": [
      { "path": "/projetos/src/index.js", "name": "index.js", "size": 19, "modified": "2025-01-10T12:00:00Z" }
    ],
    "truncated": false
  }
}
```

**Limites:** ignora pastas ocultas (`.git`) e `node_modules`, `dist`, `build`,
`.cache`, `.npm`, `.gradle`; desce no máximo 8 níveis; devolve até 200
resultados (`truncated: true` avisa que a lista foi cortada).

**Erros:** `NOT_FOUND`, `NOT_A_DIRECTORY`

---

### 2.4 Conteúdo bruto (binário / imagens)

```
GET /api/files/raw?path=<caminho>
```

> Única rota que **não** responde JSON: faz stream do arquivo com o
> `Content-Type` do tipo. Serve para preview de imagens, PDF, áudio e vídeo.

**Query params**

| Param | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `path` | string | sim | Caminho do arquivo |

**Exemplo**
```
GET /api/files/raw?path=/imagens/foto.png
→ 200 image/png
```

**MIME por extensão:** `png`, `jpg`/`jpeg`, `gif`, `webp`, `bmp`, `svg`, `ico`,
`avif`, `heic`, `pdf`, `mp3`, `mp4`, `txt`, `json`, `html`, `css`, `js`.
Extensão desconhecida cai em `application/octet-stream`. Envia
`Cache-Control: no-store`.

> [!note] Consumindo no front
> Um `<img src>` não envia header, então o cliente baixa com `fetch`
> (header `x-api-token`) e exibe com `URL.createObjectURL(blob)`. Assim o
> token nunca aparece na URL nem no histórico/cache do navegador.

**Erros:** `NOT_FOUND`, `NOT_A_FILE`

---

### 2.5 Salvar / atualizar conteúdo

> cria se não existir, sobrescreve se existir

```
PUT /api/files/content
```

**Body**
```json
{
  "path": "/projetos/src/index.js",
  "content": "console.log('novo conteúdo');"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `path` | string | sim | Caminho do arquivo |
| `content` | string | sim | Novo conteúdo (substitui tudo) |

**Response 200**
```json
{
  "success": true,
  "data": { "path": "/projetos/src/index.js", "size": 30 }
}
```

> [!note] Observação
> Use `POST /api/files` para criar do zero e `PUT` para salvar/sobrescrever. Se quiser um único endpoint que faz os dois, use `PUT` — ele cria o arquivo caso não exista.

> [!warning] Binários
> O `PUT` grava `utf8`. Salvar por cima de uma imagem destrói o arquivo: o
> front trata abas de imagem/binário como não editáveis e bloqueia o save.

---

### 2.6 Renomear arquivo

```
PATCH /api/files/rename
```

**Body**
```json
{
  "path": "/projetos/src/index.js",
  "newName": "main.js"
}
```

**Response 200**
```json
{
  "success": true,
  "data": { "oldPath": "/projetos/src/index.js", "newPath": "/projetos/src/main.js" }
}
```

**Erros:** `NOT_FOUND`, `ALREADY_EXISTS`

---

### 2.7 Deletar arquivo

```
DELETE /api/files?path=<caminho>
```

**Response 200**
```json
{
  "success": true,
  "data": { "deleted": "/projetos/src/main.js" }
}
```

**Erros:** `NOT_FOUND`, `NOT_A_FILE`

---

## Resumo das Rotas

| Método | Rota | Ação |
|---|---|---|
| `GET` | `/api/folders?path=` | Lista conteúdo da pasta |
| `POST` | `/api/folders` | Cria pasta |
| `PATCH` | `/api/folders/rename` | Renomeia pasta |
| `DELETE` | `/api/folders?path=&recursive=` | Deleta pasta |
| `GET` | `/api/files?path=` | Lê arquivo (texto) |
| `GET` | `/api/files/search?path=&query=` | Busca recursiva por substring |
| `GET` | `/api/files/raw?path=` | Envia o arquivo cru com `Content-Type` |
| `POST` | `/api/files` | Cria arquivo |
| `PUT` | `/api/files/content` | Salva/sobrescreve conteúdo |
| `PATCH` | `/api/files/rename` | Renomeia arquivo |
| `DELETE` | `/api/files?path=` | Deleta arquivo |
