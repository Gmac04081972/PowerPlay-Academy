import { createClient } from "@supabase/supabase-js";
// Vite env vars (set in .env.local). NEVER ship the service key to the browser.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
