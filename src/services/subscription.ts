import { supabase } from "../lib/supabase";

export type VerifySubscriptionResult = {
  ok: boolean;
  isPremium?: boolean;
  expiresAt?: string | null;
  error?: string;
};

export async function verifyPlaySubscription(
  packageName: string,
  productId: string,
  purchaseToken: string
): Promise<VerifySubscriptionResult> {
  try {
    const { data, error } = await supabase.functions.invoke("verify-play-subscription", {
      body: { packageName, productId, purchaseToken },
    });

    if (error) {
      return { ok: false, error: error.message || "FUNCTION_INVOKE_ERROR" };
    }

    // data should be like: { ok: boolean, isPremium?: boolean, expiresAt?: string|null, error?: string }
    if (!data || typeof data.ok !== "boolean") {
      return { ok: false, error: "INVALID_FUNCTION_RESPONSE" };
    }

    return {
      ok: data.ok,
      isPremium: data.isPremium,
      expiresAt: data.expiresAt ?? null,
      error: data.error,
    };
  } catch (e: any) {
    return { ok: false, error: e?.message || "UNEXPECTED_ERROR" };
  }
}
