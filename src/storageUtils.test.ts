import { describe, expect, it } from "vitest";
import {
  getPushDeviceKey,
  getStoredMemberKey,
  getStoredPushEnabled,
  saveStoredPushEnabled,
} from "./storageUtils";

function createStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    values,
  };
}

describe("storage utilities", () => {
  it("returns only supported stored member keys", () => {
    expect(getStoredMemberKey(createStorage({ member: "jungseo" }), "member")).toBe("jungseo");
    expect(getStoredMemberKey(createStorage({ member: "other" }), "member")).toBe("");
  });

  it("reuses an existing push device key", () => {
    const storage = createStorage({ device: "existing-key" });

    expect(getPushDeviceKey(storage, "device", () => "new-key")).toBe("existing-key");
    expect(storage.values.get("device")).toBe("existing-key");
  });

  it("creates and stores a push device key when missing", () => {
    const storage = createStorage();

    expect(getPushDeviceKey(storage, "device", () => "new-key")).toBe("new-key");
    expect(storage.values.get("device")).toBe("new-key");
  });

  it("stores whether push notifications are enabled for this device", () => {
    const storage = createStorage();

    expect(getStoredPushEnabled(storage, "push-enabled")).toBe(true);
    saveStoredPushEnabled(storage, "push-enabled", false);
    expect(getStoredPushEnabled(storage, "push-enabled")).toBe(false);
    saveStoredPushEnabled(storage, "push-enabled", true);
    expect(getStoredPushEnabled(storage, "push-enabled")).toBe(true);
  });
});
