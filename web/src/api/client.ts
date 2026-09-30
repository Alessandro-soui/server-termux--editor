// Cliente da termux-file-api.
// A URL base vem do .env (VITE_API_BASE_URL); por padrao sao caminhos relativos
// (/api/...), que o Vite encaminha (vite.config.ts) para http://localhost:3000,
// evitando problemas de CORS.
//
// O token NUNCA vem de .env: ele e digitado na tela de Settings e guardado
// apenas em sessionStorage (temporario, some ao fechar a aba/ponto).

export type EntryType = 'file' | 'folder';

export interface FolderItem {
  name: string;
  type: EntryType;
  size?: number;
  modified: string;
}

export interface FolderListing {
  path: string;
  items: FolderItem[];
}

export interface FileContent {
  path: string;
  content: string;
  size: number;
  modified: string;
}

export interface CreatedPath {
  path: string;
}

export interface RenamedPath {
  oldPath: string;
  newPath: string;
}

export interface DeletedPath {
  deleted: string;
}

export interface SavedFile {
  path: string;
  size: number;
}

export interface SearchHit {
  path: string;
  name: string;
  size: number;
  modified: string | null;
}

export interface SearchResult {
  path: string;
  results: SearchHit[];
  truncated: boolean;
}

export interface ApiSettings {
  baseUrl: string;
  token: string;
}

export class ApiError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return 'Erro desconhecido';
}

const TOKEN_KEY = 'vs_api_token';

// URL base da API: vem SO do .env (VITE_API_BASE_URL). Nao ha ajuste pela tela
// de Settings nem persistencia no navegador. Vazio = /api, que usa o proxy do Vite.
export const ENV_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').trim();

export const DEFAULT_BASE_URL = ENV_BASE_URL || '/api';

export function getStoredToken(): string {
  return sessionStorage.getItem(TOKEN_KEY) || '';
}

export function setStoredToken(value: string): void {
  const trimmed = value.trim();
  if (trimmed) sessionStorage.setItem(TOKEN_KEY, trimmed);
  else sessionStorage.removeItem(TOKEN_KEY);
}

export function clearStoredToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

export function getSettings(): ApiSettings {
  return { baseUrl: DEFAULT_BASE_URL, token: getStoredToken() };
}

interface ApiSuccessBody<T> {
  success: true;
  data: T;
}

interface ApiErrorBody {
  success: false;
  error?: {
    code?: string;
    message?: string;
  };
}

type QueryValue = string | number | boolean | null | undefined;

interface RequestOptions {
  query?: Record<string, QueryValue>;
  body?: unknown;
}

async function request<T>(method: string, path: string, { query, body }: RequestOptions = {}): Promise<T> {
  const { baseUrl, token } = getSettings();

  if (!token) {
    throw new ApiError('Token nao configurado. Informe o token no modal de conexao.', 'NO_TOKEN');
  }

  const url = new URL(baseUrl + path, window.location.origin);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    });
  }

  const res = await fetch(url.toString().replace(window.location.origin, ''), {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-api-token': token,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let json: ApiSuccessBody<T> | ApiErrorBody;
  try {
    json = (await res.json()) as ApiSuccessBody<T> | ApiErrorBody;
  } catch {
    throw new ApiError(`Resposta invalida do servidor (status ${res.status})`);
  }

  if (!json.success) {
    throw new ApiError(json.error?.message || 'Erro desconhecido', json.error?.code);
  }

  return json.data;
}

async function requestBlob(path: string, query: Record<string, QueryValue>): Promise<Blob> {
  const { baseUrl, token } = getSettings();

  if (!token) {
    throw new ApiError('Token nao configurado. Informe o token no modal de conexao.', 'NO_TOKEN');
  }

  const url = new URL(baseUrl + path, window.location.origin);
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  });

  const res = await fetch(url.toString().replace(window.location.origin, ''), {
    headers: { 'x-api-token': token },
  });

  if (!res.ok) {
    let message = `Erro ao carregar arquivo (status ${res.status})`;
    try {
      const json = (await res.json()) as ApiErrorBody;
      if (!json.success && json.error?.message) message = json.error.message;
    } catch {
      /* resposta sem JSON: mantem a mensagem padrao */
    }
    throw new ApiError(message);
  }

  return res.blob();
}

const IMAGE_MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.avif': 'image/avif',
  '.heic': 'image/heic',
};

export function fileExtension(path: string): string {
  const name = path.split('/').pop() || '';
  const index = name.lastIndexOf('.');
  return index <= 0 ? '' : name.slice(index).toLowerCase();
}

export function isImagePath(path: string): boolean {
  return IMAGE_MIME_BY_EXT[fileExtension(path)] !== undefined;
}

export const api = {
  // Pastas
  listFolder: (path = '/') => request<FolderListing>('GET', '/folders', { query: { path } }),
  createFolder: (path: string, name: string) =>
    request<CreatedPath>('POST', '/folders', { body: { path, name } }),
  renameFolder: (path: string, newName: string) =>
    request<RenamedPath>('PATCH', '/folders/rename', { body: { path, newName } }),
  deleteFolder: (path: string, recursive = false) =>
    request<DeletedPath>('DELETE', '/folders', { query: { path, recursive: String(recursive) } }),

  // Arquivos
  createFile: (path: string, name: string, content = '') =>
    request<CreatedPath>('POST', '/files', { body: { path, name, content } }),
  readFile: (path: string) => request<FileContent>('GET', '/files', { query: { path } }),
  readFileBlob: (path: string) => requestBlob('/files/raw', { path }),
  searchFiles: (path: string, query: string) =>
    request<SearchResult>('GET', '/files/search', { query: { path, query } }),
  saveFile: (path: string, content: string) =>
    request<SavedFile>('PUT', '/files/content', { body: { path, content } }),
  renameFile: (path: string, newName: string) =>
    request<RenamedPath>('PATCH', '/files/rename', { body: { path, newName } }),
  deleteFile: (path: string) => request<DeletedPath>('DELETE', '/files', { query: { path } }),
};
