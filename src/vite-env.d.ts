/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string
  /** Dev only: the local account the "Sign in as developer" button uses. */
  readonly VITE_DEV_EMAIL?: string
  readonly VITE_DEV_PASSWORD?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
