/**
 * verify-play-subscription (Supabase Edge Function)
 *
 * Purpose (later):
 * - Verify Google Play subscription purchase tokens via Android Publisher API
 * - Upsert public.user_entitlements using service-role privileges
 *
 * Required secrets (to be configured in Supabase later):
 * - SUPABASE_URL
 * - SUPABASE_ANON_KEY
 * - SUPABASE_SERVICE_ROLE_KEY
 * - GOOGLE_SERVICE_ACCOUNT_JSON
 *
 * Security:
 * - Do NOT log purchaseToken
 * - Auth required (user must be signed in)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Declare Deno global to satisfy TypeScript compiler
declare const Deno: any;

type Body = {
  packageName: string;
  productId: string;
  purchaseToken: string;
};

function json(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

serve(async (req: Request) => {
  try {
    if (req.method !== "POST") {
      return json(405, { ok: false, error: "METHOD_NOT_ALLOWED" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    if (!supabaseUrl || !supabaseAnonKey) {
      return json(500, { ok: false, error: "MISSING_SUPABASE_ENV" });
    }

    // Client with ANON key for user auth verification (reads user from JWT)
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return json(401, { ok: false, error: "UNAUTHENTICATED" });
    }

    const body = (await req.json()) as Partial<Body>;
    if (!body.packageName || !body.productId || !body.purchaseToken) {
      return json(400, { ok: false, error: "INVALID_BODY" });
    }

    // IMPORTANT: Do not log purchaseToken
    // Placeholder: verification not implemented yet
    return json(200, { ok: false, error: "NOT_IMPLEMENTED_VERIFY" });
  } catch (e) {
    return json(500, { ok: false, error: "SERVER_ERROR" });
  }
});