import { createClient } from "@supabase/supabase-js";

// Estas variables se configuran en Netlify (o en un archivo .env local).
// NUNCA pongas aquí claves secretas: la "anon key" es pública y segura
// porque la protección real la dan las políticas RLS en Supabase.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. Configúralas en Netlify."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
