import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type BuildCoupleClientOptionsInput = {
  authInstanceId: string;
  clientIndex: number;
  coupleCode: string;
  coupleSecret: string;
  memberKey?: string;
};

const defaultSupabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const defaultSupabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const supabaseAuthInstanceId =
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

let supabaseAuthClientIndex = 0;

export function hasSupabaseConfig(supabaseUrl?: string, supabaseKey?: string) {
  return Boolean(supabaseUrl && supabaseKey);
}

export function buildCoupleClientOptions({
  authInstanceId,
  clientIndex,
  coupleCode,
  coupleSecret,
  memberKey,
}: BuildCoupleClientOptionsInput) {
  const headers: Record<string, string> = {
    "x-couple-code": coupleCode,
    "x-couple-secret": coupleSecret,
  };

  if (memberKey) {
    headers["x-member-key"] = memberKey;
  }

  return {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
      storageKey: `emotion-s2-auth-${authInstanceId}-${memberKey || "guest"}-${clientIndex}`,
    },
    global: {
      headers,
    },
  };
}

export function createCoupleClient(
  coupleCode: string,
  coupleSecret: string,
  memberKey?: string,
): SupabaseClient | null {
  if (!defaultSupabaseUrl || !defaultSupabaseKey) {
    return null;
  }

  return createClient(
    defaultSupabaseUrl,
    defaultSupabaseKey,
    buildCoupleClientOptions({
      authInstanceId: supabaseAuthInstanceId,
      clientIndex: ++supabaseAuthClientIndex,
      coupleCode,
      coupleSecret,
      memberKey,
    }),
  );
}
