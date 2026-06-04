import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, URL } from "node:url";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";

const serviceWorkerPath = join(dirname(fileURLToPath(import.meta.url)), "../public/sw.js");

function loadServiceWorker(clients = []) {
  const listeners = {};
  const showNotification = vi.fn().mockResolvedValue(undefined);
  const self = {
    addEventListener: (type, listener) => {
      listeners[type] = listener;
    },
    clients: {
      claim: vi.fn().mockResolvedValue(undefined),
      matchAll: vi.fn().mockResolvedValue(clients),
      openWindow: vi.fn().mockResolvedValue(undefined),
    },
    location: { origin: "https://emotion-s2.vercel.app" },
    registration: { showNotification },
    skipWaiting: vi.fn(),
  };
  const caches = {
    delete: vi.fn().mockResolvedValue(undefined),
    keys: vi.fn().mockResolvedValue([]),
    match: vi.fn().mockResolvedValue(undefined),
    open: vi.fn().mockResolvedValue({
      addAll: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockResolvedValue(undefined),
    }),
  };

  vm.runInNewContext(readFileSync(serviceWorkerPath, "utf8"), {
    caches,
    fetch: vi.fn().mockRejectedValue(new Error("network disabled")),
    Promise,
    self,
    URL,
  });

  return { listeners, showNotification };
}

async function dispatchPush(pushListener, payload) {
  const waits = [];
  pushListener({
    data: {
      json: () => payload,
      text: () => JSON.stringify(payload),
    },
    waitUntil: (promise) => waits.push(Promise.resolve(promise)),
  });
  await Promise.all(waits);
}

describe("service worker push notifications", () => {
  it("does not show a notification while a visible client is on the chat tab", async () => {
    const client = {
      id: "client-a",
      url: "https://emotion-s2.vercel.app/",
      visibilityState: "visible",
    };
    const { listeners, showNotification } = loadServiceWorker([client]);

    listeners.message({
      data: { type: "active-tab-change", tab: "chat" },
      source: client,
    });
    await dispatchPush(listeners.push, { body: "새 메시지", tag: "message-1" });

    expect(showNotification).not.toHaveBeenCalled();
  });

  it("still shows a notification when the visible client is not on the chat tab", async () => {
    const client = {
      id: "client-a",
      url: "https://emotion-s2.vercel.app/",
      visibilityState: "visible",
    };
    const { listeners, showNotification } = loadServiceWorker([client]);

    listeners.message({
      data: { type: "active-tab-change", tab: "home" },
      source: client,
    });
    await dispatchPush(listeners.push, { body: "새 메시지", tag: "message-1" });

    expect(showNotification).toHaveBeenCalledWith(
      "정서 S2 민혁",
      expect.objectContaining({ body: "새 메시지", tag: "message-1" }),
    );
  });

  it("does not show a poke notification while a visible client is on the chat tab", async () => {
    const client = {
      id: "client-a",
      url: "https://emotion-s2.vercel.app/",
      visibilityState: "visible",
    };
    const { listeners, showNotification } = loadServiceWorker([client]);

    listeners.message({
      data: { type: "active-tab-change", tab: "chat" },
      source: client,
    });
    await dispatchPush(listeners.push, { body: "상대가 콕 찔렀어요", tag: "couple-poke" });

    expect(showNotification).not.toHaveBeenCalled();
  });

  it("still shows a notification when the chat tab client is hidden", async () => {
    const client = {
      id: "client-a",
      url: "https://emotion-s2.vercel.app/",
      visibilityState: "hidden",
    };
    const { listeners, showNotification } = loadServiceWorker([client]);

    listeners.message({
      data: { type: "active-tab-change", tab: "chat" },
      source: client,
    });
    await dispatchPush(listeners.push, { body: "새 메시지", tag: "message-1" });

    expect(showNotification).toHaveBeenCalledWith(
      "정서 S2 민혁",
      expect.objectContaining({ body: "새 메시지", tag: "message-1" }),
    );
  });

  it("still shows a notification when no app window is open", async () => {
    const { listeners, showNotification } = loadServiceWorker([]);

    await dispatchPush(listeners.push, { body: "새 메시지", tag: "message-1" });

    expect(showNotification).toHaveBeenCalledWith(
      "정서 S2 민혁",
      expect.objectContaining({ body: "새 메시지", tag: "message-1" }),
    );
  });
});
