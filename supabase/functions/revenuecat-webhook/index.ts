/**
 * revenuecat-webhook (Supabase Edge Function)
 *
 * Purpose:
 * - Receive webhook events from RevenueCat.
 * - Sync entitlement status to public.user_entitlements table.
 * - This acts as the Source of Truth for the client app.
 *
 * Required Secrets (Set in Supabase Dashboard):
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY (To bypass RLS and write to entitlements)
 * - REVENUECAT_WEBHOOK_SECRET (To verify the request comes from RC)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Declare Deno global for TS compatibility
declare const Deno: any;

serve(async (req: Request) => {
  // 1. Only allow POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // 2. Security Verification
    const secret = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");
    const authHeader = req.headers.get("Authorization");

    // Expecting header: "Authorization: Bearer <SECRET>"
    if (!secret || authHeader !== `Bearer ${secret}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 3. Initialize Supabase Admin Client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase configuration");
      return new Response(JSON.stringify({ error: "Server Configuration Error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 4. Parse RevenueCat Payload
    const payload = await req.json();
    const { event } = payload;

    if (!event) {
      // Return 200 to acknowledge receipt even if we ignore it
      return new Response(JSON.stringify({ message: "Ignored: No event data" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Extract necessary fields
    // RevenueCat maps Supabase Auth User ID to 'app_user_id'
    const appUserId = event.app_user_id; 
    const entitlementIds = event.entitlement_ids || [];
    const expirationMs = event.expiration_at_ms; // Null for lifetime, timestamp for subscriptions
    const productId = event.product_id;

    // Validate appUserId is a UUID (to prevent errors inserting into Postgres UUID column)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!appUserId || !uuidRegex.test(appUserId)) {
      console.warn(`Skipping event for non-UUID user: ${appUserId}`);
      return new Response(JSON.stringify({ message: "Skipped: Invalid User ID" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 5. Logic: Sync Entitlement
    // We check if the 'premium' entitlement is involved in this event.
    // NOTE: The client checks expiration dates, so even if is_premium is true,
    // if expires_at is in the past, access is denied.
    const hasPremium = entitlementIds.includes("premium");
    
    // Construct DB payload
    const upsertData = {
      user_id: appUserId,
      is_premium: hasPremium,
      source: "revenuecat",
      product_id: productId || null,
      // Convert MS timestamp to ISO string, or null if lifetime
      expires_at: expirationMs ? new Date(expirationMs).toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    // 6. Perform Upsert
    const { error } = await supabase
      .from("user_entitlements")
      .upsert(upsertData);

    if (error) {
      console.error("Supabase Write Error:", error);
      throw error;
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Webhook Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
});
