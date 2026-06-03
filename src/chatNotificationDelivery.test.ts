import { describe, expect, it } from "vitest";
import {
  CHAT_NOTIFICATION_TITLE,
  SERVICE_WORKER_CHAT_NOTIFICATION_OPTIONS,
  WINDOW_CHAT_NOTIFICATION_OPTIONS,
  showChatNotificationIfNeeded,
} from "./chatNotificationDelivery";

describe("chatNotificationDelivery", () => {
  it("skips when notifications are not granted", async () => {
    const calls: string[] = [];

    const result = await showChatNotificationIfNeeded("새 메시지", {
      getPermission: () => "denied",
      isDocumentHidden: () => true,
      showWindowNotification: () => calls.push("window"),
    });

    expect(result).toBe("skipped");
    expect(calls).toEqual([]);
  });

  it("skips when the document is visible", async () => {
    const calls: string[] = [];

    const result = await showChatNotificationIfNeeded("새 메시지", {
      getPermission: () => "granted",
      isDocumentHidden: () => false,
      showWindowNotification: () => calls.push("window"),
    });

    expect(result).toBe("skipped");
    expect(calls).toEqual([]);
  });

  it("uses service worker notifications first", async () => {
    const calls: unknown[] = [];

    const result = await showChatNotificationIfNeeded("새 메시지", {
      getPermission: () => "granted",
      isDocumentHidden: () => true,
      showServiceWorkerNotification: async (title, options) => {
        calls.push(["service-worker", title, options]);
      },
      showWindowNotification: () => calls.push("window"),
    });

    expect(result).toBe("service-worker");
    expect(calls).toEqual([
      [
        "service-worker",
        CHAT_NOTIFICATION_TITLE,
        {
          ...SERVICE_WORKER_CHAT_NOTIFICATION_OPTIONS,
          body: "새 메시지",
        },
      ],
    ]);
  });

  it("falls back to window notifications without a service worker notifier", async () => {
    const calls: unknown[] = [];

    const result = await showChatNotificationIfNeeded("새 메시지", {
      getPermission: () => "granted",
      isDocumentHidden: () => true,
      showWindowNotification: (title, options) => {
        calls.push(["window", title, options]);
      },
    });

    expect(result).toBe("window");
    expect(calls).toEqual([
      [
        "window",
        CHAT_NOTIFICATION_TITLE,
        {
          ...WINDOW_CHAT_NOTIFICATION_OPTIONS,
          body: "새 메시지",
        },
      ],
    ]);
  });
});
