import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { registerPushSubscription } from "./pushSubscriptionRegistration";

describe("pushSubscriptionRegistration", () => {
  it("gets the current subscription and saves it", async () => {
    const calls: string[] = [];
    const registration = {} as ServiceWorkerRegistration;
    const subscription = {} as PushSubscription;
    const supabase = {} as SupabaseClient;

    const result = await registerPushSubscription({
      clientId: "client-1",
      coupleCode: "S2-0526",
      deviceKey: "device-1",
      forceRefresh: true,
      getServiceWorkerRegistration: async () => {
        calls.push("ready");
        return registration;
      },
      getSubscription: async (nextRegistration, forceRefresh) => {
        calls.push(`subscription:${nextRegistration === registration}:${forceRefresh}`);
        return subscription;
      },
      memberKey: "jungseo",
      saveRecord: async (nextSupabase, input) => {
        calls.push(`save:${nextSupabase === supabase}:${input.subscription === subscription}:${input.userAgent}`);
        return { error: null, isValid: true };
      },
      supabase,
      userAgent: "agent",
    });

    expect(result).toEqual({ status: "saved" });
    expect(calls).toEqual(["ready", "subscription:true:true", "save:true:true:agent"]);
  });

  it("reports invalid subscription json", async () => {
    const result = await registerPushSubscription({
      clientId: "client-1",
      coupleCode: "S2-0526",
      deviceKey: "device-1",
      forceRefresh: false,
      getServiceWorkerRegistration: async () => ({} as ServiceWorkerRegistration),
      getSubscription: async () => ({} as PushSubscription),
      memberKey: "jungseo",
      saveRecord: async () => ({ error: null, isValid: false }),
      supabase: {} as SupabaseClient,
      userAgent: "agent",
    });

    expect(result).toEqual({ status: "invalid" });
  });

  it("reports save errors", async () => {
    const error = new Error("save failed");

    const result = await registerPushSubscription({
      clientId: "client-1",
      coupleCode: "S2-0526",
      deviceKey: "device-1",
      forceRefresh: false,
      getServiceWorkerRegistration: async () => ({} as ServiceWorkerRegistration),
      getSubscription: async () => ({} as PushSubscription),
      memberKey: "jungseo",
      saveRecord: async () => ({ error, isValid: true }),
      supabase: {} as SupabaseClient,
      userAgent: "agent",
    });

    expect(result).toEqual({ error, status: "save-error" });
  });

  it("reports unexpected registration failures", async () => {
    const result = await registerPushSubscription({
      clientId: "client-1",
      coupleCode: "S2-0526",
      deviceKey: "device-1",
      forceRefresh: false,
      getServiceWorkerRegistration: async () => {
        throw new Error("blocked");
      },
      getSubscription: async () => ({} as PushSubscription),
      memberKey: "jungseo",
      saveRecord: async () => ({ error: null, isValid: true }),
      supabase: {} as SupabaseClient,
      userAgent: "agent",
    });

    expect(result).toEqual({ status: "failed" });
  });
});
