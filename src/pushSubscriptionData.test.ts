import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { savePushSubscriptionRecord } from "./pushSubscriptionData";

function createSupabase(calls: string[], error: unknown = null) {
  return {
    from(table: string) {
      calls.push(`from:${table}`);
      return {
        upsert(payload: unknown, options: unknown) {
          calls.push(`${table}.upsert:${JSON.stringify(payload)}:${JSON.stringify(options)}`);
          return Promise.resolve({ error });
        },
      };
    },
  } as unknown as SupabaseClient;
}

describe("pushSubscriptionData", () => {
  it("saves a browser push subscription row", async () => {
    const calls: string[] = [];
    const supabase = createSupabase(calls);
    const subscription = {
      toJSON: () => ({
        endpoint: "https://push.example/subscription",
        keys: {
          auth: "auth-key",
          p256dh: "p256dh-key",
        },
      }),
    } as unknown as PushSubscription;

    const result = await savePushSubscriptionRecord(supabase, {
      clientId: "client-a",
      coupleCode: "S2-0526",
      deviceKey: "device-a",
      memberKey: "jungseo",
      now: () => "__date__",
      subscription,
      userAgent: "Test Agent",
    });

    expect(result).toEqual({ error: null, isValid: true });
    expect(calls).toEqual([
      "from:push_subscriptions",
      'push_subscriptions.upsert:{"auth":"auth-key","client_id":"client-a","couple_code":"S2-0526","device_key":"device-a","endpoint":"https://push.example/subscription","last_seen_at":"__date__","member_key":"jungseo","p256dh":"p256dh-key","user_agent":"Test Agent"}:{"onConflict":"couple_code,device_key"}',
    ]);
  });

  it("does not save incomplete subscription JSON", async () => {
    const calls: string[] = [];
    const supabase = createSupabase(calls);
    const subscription = {
      toJSON: () => ({ endpoint: "https://push.example/subscription", keys: {} }),
    } as unknown as PushSubscription;

    const result = await savePushSubscriptionRecord(supabase, {
      clientId: "client-a",
      coupleCode: "S2-0526",
      deviceKey: "device-a",
      memberKey: "jungseo",
      now: () => "__date__",
      subscription,
      userAgent: "Test Agent",
    });

    expect(result).toEqual({ error: null, isValid: false });
    expect(calls).toEqual([]);
  });
});
