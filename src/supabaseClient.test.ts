import { describe, expect, it } from "vitest";
import { buildCoupleClientOptions, hasSupabaseConfig } from "./supabaseClient";

describe("supabaseClient", () => {
  it("returns null when Supabase env values are missing", () => {
    expect(hasSupabaseConfig("https://example.supabase.co", undefined)).toBe(false);
    expect(hasSupabaseConfig(undefined, "anon-key")).toBe(false);
    expect(hasSupabaseConfig("https://example.supabase.co", "anon-key")).toBe(true);
  });

  it("builds couple-scoped Supabase client options", () => {
    const options = buildCoupleClientOptions({
      authInstanceId: "instance-1",
      clientIndex: 3,
      coupleCode: "S2-0526",
      coupleSecret: "secret",
      memberKey: "minhyeok",
    });

    expect(options).toEqual({
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
        storageKey: "emotion-s2-auth-instance-1-minhyeok-3",
      },
      global: {
        headers: {
          "x-couple-code": "S2-0526",
          "x-couple-secret": "secret",
          "x-member-key": "minhyeok",
        },
      },
    });
  });
});
