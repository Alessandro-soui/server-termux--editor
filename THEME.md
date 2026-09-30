---
tags:
  - tema
  - design
  - plano
formato: JSON
---

# Plano: tema por arquivo JSON

Objetivo: tirar as cores do código e colocá-las em **um arquivo `.json`** por
superfície (frame, title bar, status bar, activity bar, sidebar, editor, abas,
modais), para trocar o tema inteiro sem mexer em nenhum componente.

> [!warning] Pré-requisito
> Hoje ainda existem **cores escritas no código** (veja o inventário no fim).
> Enquanto eles existirem, trocar o JSON não troca 100% da tela. Zerar isso é
> o passo 1 do plano.

> [!note] Origem do tema
> Este documento define **o formato** do `theme.json`. De onde ele vem mudou: o
> usuário instala uma extensão (`.zip` com `package.json` + `theme.json` +
> ícone) em vez de escolher um tema à mão. Ver [EXTENSIONS.md](./EXTENSIONS.md).

---

## 1. Onde o arquivo vive

```
web/src/themes/
├── schema.json          # JSON Schema (opcional, valida no editor)
├── index.ts             # temas embutidos (import estático, funciona offline)
├── default.json         # o tema atual (Dark+), exatamente com os valores de hoje
└── apply.ts             # converte o JSON em CSS custom properties
```

Motivo de ser **embutido** (`import`) em vez de `fetch`: o app roda dentro do
Termux, às vezes sem rede; `import` não tem latência nem falha de carregamento.

Temas do usuário vêm de **extensões instaladas** (ver `EXTENSIONS.md`): o
`theme.json` fica dentro da pasta da extensão e chega pelo mesmo formato
descrito aqui. `src/themes/default.json` continua sendo o embutido e o
fallback de qualquer papel faltando.

---

## 2. Estrutura do JSON

Organizado **por superfície** (é o que foi pedido: status bar, title bar,
sidebar, activity bar, frame), e dentro de cada uma só **papéis**, nunca nome
de cor. Assim o mesmo JSON serve para tema claro e escuro.

```json
{
  "$schema": "./schema.json",
  "id": "dark-plus",
  "name": "Dark+",
  "type": "dark",
  "version": 1,
  "tokens": {
    "frame": {
      "background": "#000000"
    },

    "titleBar": {
      "background": "#3c3c3c",
      "foreground": "#cccccc",
      "border": "#333333",
      "icon": "#969696",
      "iconActive": "#ffffff",
      "hoverBackground": "#2a2d2e",
      "activeBackground": "#007acc",
      "activeForeground": "#ffffff"
    },

    "statusBar": {
      "background": "#000000",
      "foreground": "#cccccc",
      "border": "#1e1e1e",
      "icon": "#969696",
      "iconActive": "#ffffff",
      "hoverBackground": "#2a2d2e"
    },

    "activityBar": {
      "background": "#333333",
      "foreground": "#969696",
      "foregroundActive": "#ffffff",
      "border": "#333333",
      "activeBackground": "#2a2d2e",
      "activeBorder": "#ffffff"
    },

    "sidebar": {
      "background": "#252526",
      "foreground": "#cccccc",
      "titleForeground": "#969696",
      "border": "#1e1e1e",
      "itemHoverBackground": "#2a2d2e",
      "itemSelectedBackground": "#37373d",
      "itemSelectedForeground": "#ffffff",
      "itemActiveBorder": "#3794ff",
      "folderIcon": "#dcb67a",
      "fileIcon": "#519aba"
    },

    "editor": {
      "background": "#0d0d0d",
      "foreground": "#cccccc",
      "gutterForeground": "#6a6a6a",
      "gutterActiveForeground": "#3794ff",
      "pathBarBackground": "#0d0d0d",
      "pathBarForeground": "#6a6a6a",
      "lineCountForeground": "#6a6a6a",
      "border": "#1e1e1e"
    },

    "tabBar": {
      "background": "#000000",
      "backgroundActive": "#0d0d0d",
      "backgroundInactive": "#000000",
      "foregroundActive": "#ffffff",
      "foregroundInactive": "#6a6a6a",
      "border": "#333333"
    },

    "modal": {
      "overlay": "rgba(0, 0, 0, 0.6)",
      "background": "#252526",
      "foreground": "#cccccc",
      "border": "#454545",
      "rowSelectedBackground": "#37373d",
      "rowSelectedForeground": "#ffffff"
    },

    "button": {
      "background": "#007acc",
      "foreground": "#ffffff",
      "hoverBackground": "#3794ff",
      "dangerBackground": "rgba(241, 76, 76, 0.12)",
      "dangerForeground": "#f14c4c"
    },

    "scrollbar": {
      "thumb": "#4a4a4a",
      "track": "transparent"
    }
  }
}
```

### Regras

- **Grupos** (chaves de primeiro nível de `tokens`): `frame`, `titleBar`,
  `statusBar`, `activityBar`, `sidebar`, `editor`, `tabBar`, `modal`, `button`,
  `scrollbar`. Um grupo novo = uma superfície nova; não precisa mexer no loader.
- **Papéis** (segundo nível): `background`, `foreground`, `border`, `icon`,
  `hover*`, `active*`, `selected*`. Sempre no plural/mesma raiz conceitual.
- **Valores aceitos**: `#rgb`, `#rrggbb`, `#rrggbbaa`, `rgb()`, `rgba()`, `hsl()`
  e `var(--outro-token)`. Cor solta (sem `var`) é sempre erro de validação.
- **Obrigatórios**: só `background` e `foreground` de cada superfície. O resto
  pode faltar e o loader cai no valor do tema `default`.
- **Sem `!important`, sem gradiente, sem fonte/tamanho** neste arquivo: é tema de
  cor, não de layout.

---

## 3. Como o JSON vira CSS

O app já consome `--vs-*` em `style={{}}` e em `bg-[color:var(--vs-*)]`. A
ponte é uma função pura, sem React:

```ts
// web/src/themes/apply.ts
function toCssVar(path: string): string {
  return `--vs-${path
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')   // statusBar -> status-bar
    .toLowerCase()
    .replace(/\./g, '-')}`;                  // statusBar.background -> -background
}

export function themeToCssVars(theme: Theme): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [surface, roles] of Object.entries(theme.tokens)) {
    for (const [role, value] of Object.entries(roles)) {
      out[toCssVar(`${surface}.${role}`)] = value;
    }
  }
  return out;
}
```

E a aplicação (uma vez, no `main.tsx` ou no `SettingsContext`):

```ts
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  for (const [token, fallback] of Object.entries(themeToCssVars(theme))) {
    root.style.setProperty(token, fallback);
  }
  root.dataset.themeType = theme.type;   // 'dark' | 'light', para regras futuras
}
```

Nome de CSS derivado do caminho, então **`titleBar.background` vira
`--vs-title-bar-background`** e `--vs-bg-app` (o token atual do frame) é
renomeado para `--vs-frame-background`. Isso é a única quebra de nomes: os
componentes passam a usar os nomes novos.

> Alternativa sem renomear nada: manter o JSON agrupado e o loader mapear cada
> papel para o token antigo (`statusBar.background` -> `--vs-bg-statusbar`).
> Menos editável, menos mudanças no front. Recomendo o caminho dos nomes
> derivados.

---

## 4. Persistência e troca de tema

- Tema embutido = `import defaultTheme from './default.json'` (sempre aplicado
  primeiro, é o fallback de qualquer papel faltando).
- Tema de extensão = o `theme.json` da extensão instalada, aplicado quando o
  usuário clica em **Aplicar tema** na página da extensão (`/extensions/:id`).
- A escolha fica em `localStorage` (`vs_theme_source` + `vs_theme_id`), junto
  com a chave `vs_sidebar_width` que já existe.
- `ThemeContext` expõe `{ themes, themeId, setTheme }`. A tela de **Settings**
  ganha um seletor (dropdown com nome + `type` de cada tema).
- Trocar de tema deve ser **instantâneo, sem reload** e **sem piscar**: por isso
  o `default.json` é aplicado no `main.tsx` antes do primeiro render, e o
  `localStorage` é lido ali também, não dentro de um `useEffect` (senão a tela
  abre com o tema padrão e troca depois).

---

## 5. Inventário de cores hardcoded (passo 1 obrigatório)

Cada linha precisa virar `var(--vs-*)` ou sumir:

| Arquivo:linha | Hoje | Token destino |
|---|---|---|
| `ActivityBar.tsx:7` | `text-white` | `activityBar.foregroundActive` |
| `FileTreeItem.tsx:93` | `'#ffffff'` | `sidebar.itemSelectedForeground` |
| `TabBar.tsx:30` | `'#ffffff'` | `tabBar.foregroundActive` |
| `OpenFolderModal.tsx:68` | `'#ffffff'` | `modal.rowSelectedForeground` |
| `OpenFolderModal.tsx:154` | `rgba(0,0,0,0.6)` | `modal.overlay` |
| `OpenFolderModal.tsx:209` | `color: '#fff'` | `button.foreground` |
| `QuickOpenModal.tsx:131` | `rgba(0,0,0,0.6)` | `modal.overlay` |
| `QuickOpenModal.tsx:200` | `'#fff'` | `modal.rowSelectedForeground` |
| `QuickOpenModal.tsx:207` | `rgba(255,255,255,0.75)` | `modal.rowSelectedForegroundDim` |
| `TitleBarMenuModal.tsx:16` | `rgba(0,0,0,0.4)` | `modal.overlaySubtle` |
| `EditorPane.tsx:31` | `color: '#fff'` | `button.foreground` |
| `Sidebar.tsx:51,201,221,228,235,242` | `hover:text-white` | `*.hoverForeground` / `button.foreground` |
| `Sidebar.tsx:259,275` | `color: '#fff'` | `button.foreground` |
| `Settings.tsx:130` | `rgba(241,76,76,0.12)` | `button.dangerBackground` |
| `Settings.tsx:146` | `color: '#fff'` | `button.foreground` |
| `index.css:70,81` | `#4a4a4a` (scrollbar) | `scrollbar.thumb` |

Detalhe do `hover:text-white`: é classe utilitária do Tailwind, não aceita
`var()` com prefixo `text-` sem arbitrário. Duas saídas — trocar por
`hover:text-[color:var(--vs-...)]` (funciona, já é o padrão do projeto), ou
migrar os hovers para classes do VS Code (`hover:bg-vs-hover`). Recomendo a
primeira: menos churn.

---

## 6. Ordem de execução

1. **Zerar os hardcoded** (tabela acima). Não muda visual, deixa o tema możlivel.
2. Criar `src/themes/default.json` com os valores **atuais** (copiar do
   `index.css`) + `schema.json`.
3. Criar `apply.ts` (loader) e trocar o `:root` do `index.css` para ler os
   tokens em vez de declarar os valores.
4. Trocar as referências nos componentes para os nomes derivados.
5. `ThemeContext` + resolução da fonte do tema (embutido ou extensão) com
   fallback silencioso.
6. (Depende do `EXTENSIONS.md`) botão **Aplicar tema** na página da extensão e
   persistência.

---

## 7. Decisões em aberto

- **Nomes derivados vs mapa fixo para os tokens atuais** (seção 3). Recomendo
  derivados.
- **Tema claro**: os papéis já servem, mas nenhum componente foi desenhado para
  fundo claro. Vai aparecer contraste ruim em hover/seleção. Vale um tema
  `light.json` só depois de a estrutura existir.
- **Cor de sintaxe do código**: fora deste arquivo. Hoje não existe
  highlight, então não há token de linguagem para definir (ver seção 2 do
  `README.md` do front).
