import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "./env";
import { empresa } from "@/lib/empresa";

export function createClient() {
  return createBrowserClient(
    supabaseEnv().url,
    supabaseEnv().key,
    { db: { schema: empresa.schema } },
  );
}
