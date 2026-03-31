import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Server-only Supabase client that bypasses RLS.
 * Use only in API routes / server code after validating the user (e.g. getSession()).
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.
 */
export function getSupabaseServer() {
  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY for server-side game DB access");
  return createClient(url, serviceKey);
}
