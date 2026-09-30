/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base da termux-file-api, ex.: /api ou http://192.168.0.10:3000/api */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
