/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MICROSOFT_CLIENT_ID: string;
  readonly VITE_MICROSOFT_TENANT_ID: string;
  readonly VITE_MICROSOFT_REDIRECT_URI: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
