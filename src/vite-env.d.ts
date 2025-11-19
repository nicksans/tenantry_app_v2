/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_MAPS_API_KEY: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  interface PlaidConfig {
    token: string;
    onSuccess: (public_token: string, metadata: PlaidMetadata) => void;
    onExit: (err: PlaidError | null, metadata?: PlaidMetadata) => void;
  }

  interface PlaidHandler {
    open: () => void;
    exit: () => void;
  }

  interface PlaidMetadata {
    institution: {
      name: string;
      institution_id: string;
    } | null;
    accounts: Array<{
      id: string;
      name: string;
      mask: string;
      type: string;
      subtype: string;
    }>;
    link_session_id: string;
  }

  interface PlaidError {
    error_type: string;
    error_code: string;
    error_message: string;
    display_message: string | null;
  }

  interface Window {
    google: typeof google;
    Plaid: {
      create: (config: PlaidConfig) => PlaidHandler;
    };
  }
}

export {};
