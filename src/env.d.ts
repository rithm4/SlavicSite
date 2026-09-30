/// <reference types="vite/client" />

// Setările din .env (local) sau din variabilele depozitului pe GitHub (la publicare).
interface ImportMetaEnv {
  /** Adresa proiectului Supabase, ex. https://abcd.supabase.co */
  readonly VITE_SUPABASE_URL?: string
  /** Cheia publică (anon) a proiectului; accesul real îl stabilesc regulile din supabase/schema.sql */
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
