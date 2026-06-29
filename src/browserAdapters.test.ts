import { describe, expect, it, vi } from "vitest";
import {
  confirmWithWindow,
  getBrowserOnlineStatus,
  getBrowserUserAgent,
  getClipboardTextWriter,
  getShareInvoker,
  getServiceWorkerNotificationPresenter,
  notifyServiceWorkerActiveTab,
  onServiceWorkerControllerChange,
  showWindowNotification,
  vibrateDevice,
} from "./browserAdapters";

describe("browserAdapters", () => {
  it("returns clipboard and share adapters only when browser APIs exist", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const share = vi.fn().mockResolvedValue(undefined);
    const navigatorLike = { clipboard: { writeText }, share };

    await getClipboardTextWriter(navigatorLike)?.("invite");
    await getShareInvoker(navigatorLike)?.({ text: "invite" });

    expect(writeText).toHaveBeenCalledWith("invite");
    expect(share).toHaveBeenCalledWith({ text: "invite" });
    expect(getClipboardTextWriter({})).toBeUndefined();
    expect(getShareInvoker({})).toBeUndefined();
  });

  it("shows notifications through service worker when available", async () => {
    const showNotification = vi.fn().mockResolvedValue(undefined);
    const presenter = getServiceWorkerNotificationPresenter({
      serviceWorker: {
        ready: Promise.resolve({ showNotification }),
      },
    });

    await presenter?.("새 메시지", { body: "도착" });

    expect(showNotification).toHaveBeenCalledWith("새 메시지", { body: "도착" });
    expect(getServiceWorkerNotificationPresenter({})).toBeUndefined();
  });

  it("reports the active app tab to the controlling service worker", () => {
    const postMessage = vi.fn();

    notifyServiceWorkerActiveTab("chat", {
      serviceWorker: {
        controller: { postMessage },
        ready: Promise.resolve({ showNotification: vi.fn() }),
      },
    });

    expect(postMessage).toHaveBeenCalledWith({ type: "active-tab-change", tab: "chat" });
    expect(notifyServiceWorkerActiveTab("home", {})).toBe(false);
  });

  it("subscribes to service worker controller changes", () => {
    const addEventListener = vi.fn();
    const removeEventListener = vi.fn();
    const listener = vi.fn();

    const cleanup = onServiceWorkerControllerChange(listener, {
      serviceWorker: {
        addEventListener,
        ready: Promise.resolve({ showNotification: vi.fn() }),
        removeEventListener,
      },
    });

    expect(addEventListener).toHaveBeenCalledWith("controllerchange", expect.any(Function));
    cleanup();
    expect(removeEventListener).toHaveBeenCalledWith("controllerchange", expect.any(Function));
  });

  it("wraps window notification and confirmation APIs", () => {
    const NotificationCtor = vi.fn();
    const confirm = vi.fn().mockReturnValue(true);

    showWindowNotification("새 메시지", { body: "도착" }, NotificationCtor);

    expect(NotificationCtor).toHaveBeenCalledWith("새 메시지", { body: "도착" });
    expect(confirmWithWindow("삭제할까요?", { confirm })).toBe(true);
    expect(confirm).toHaveBeenCalledWith("삭제할까요?");
  });

  it("reads browser status without leaking navigator access into App", () => {
    const vibrate = vi.fn();

    expect(getBrowserOnlineStatus({ onLine: false })).toBe(false);
    expect(getBrowserUserAgent({ userAgent: "Mobile Safari" })).toBe("Mobile Safari");
    vibrateDevice([45, 30, 45], { vibrate });

    expect(vibrate).toHaveBeenCalledWith([45, 30, 45]);
  });
});
