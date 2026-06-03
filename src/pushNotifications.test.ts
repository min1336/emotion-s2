import { describe, expect, it } from "vitest";
import {
  getCurrentPushSubscription,
  getNotificationPermission,
  isCurrentPushSubscription,
  isWebPushSupported,
  requestPokePermission,
} from "./pushNotifications";

describe("pushNotifications", () => {
  it("reads notification permission with an unsupported fallback", () => {
    expect(getNotificationPermission({})).toBe("unsupported");
    expect(getNotificationPermission({ Notification: { permission: "granted" } })).toBe("granted");
  });

  it("checks whether web push APIs are available", () => {
    expect(
      isWebPushSupported({
        navigator: { serviceWorker: {} },
        Notification: { permission: "default" },
        PushManager: {},
      }),
    ).toBe(true);
    expect(isWebPushSupported({ navigator: {}, Notification: { permission: "default" }, PushManager: {} })).toBe(false);
  });

  it("does not request permission before a member is selected", async () => {
    const calls: string[] = [];

    await expect(
      requestPokePermission({
        hasSelectedMember: false,
        isSupported: () => {
          calls.push("support");
          return true;
        },
        requestPermission: async () => {
          calls.push("permission");
          return "granted";
        },
      }),
    ).resolves.toBe("missing-member");
    expect(calls).toEqual([]);
  });

  it("returns unsupported without requesting permission when web push is unavailable", async () => {
    const calls: string[] = [];

    await expect(
      requestPokePermission({
        hasSelectedMember: true,
        isSupported: () => false,
        requestPermission: async () => {
          calls.push("permission");
          return "granted";
        },
      }),
    ).resolves.toBe("unsupported");
    expect(calls).toEqual([]);
  });

  it("requests browser permission when a member is selected and web push is supported", async () => {
    await expect(
      requestPokePermission({
        hasSelectedMember: true,
        isSupported: () => true,
        requestPermission: async () => "denied",
      }),
    ).resolves.toBe("denied");
  });

  it("compares an existing subscription application server key", () => {
    const subscription = {
      options: { applicationServerKey: new Uint8Array([1, 2, 3, 250, 251, 252]) },
    } as unknown as PushSubscription;

    expect(isCurrentPushSubscription(subscription, "AQID-vv8")).toBe(true);
    expect(isCurrentPushSubscription(subscription, "other-key")).toBe(false);
  });

  it("replaces stale subscriptions before subscribing again", async () => {
    let unsubscribed = false;
    const existingSubscription = {
      options: { applicationServerKey: new Uint8Array([9]) },
      unsubscribe: async () => {
        unsubscribed = true;
      },
    } as unknown as PushSubscription;
    const nextSubscription = { options: {} } as unknown as PushSubscription;
    const registration = {
      pushManager: {
        getSubscription: async () => existingSubscription,
        subscribe: async () => nextSubscription,
      },
    } as ServiceWorkerRegistration;

    await expect(getCurrentPushSubscription(registration, false, "AQID-vv8")).resolves.toBe(nextSubscription);
    expect(unsubscribed).toBe(true);
  });
});
