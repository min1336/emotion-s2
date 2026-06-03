import { describe, expect, it } from "vitest";
import {
  clearCoupleMember,
  clearCoupleSession,
  getStoredCoupleMember,
  getStoredCoupleSession,
  saveCoupleMember,
  saveCoupleSession,
} from "./coupleSessionStorage";

function createMemoryStorage(initialEntries: Record<string, string> = {}) {
  const entries = new Map(Object.entries(initialEntries));
  return {
    entries,
    getItem(key: string) {
      return entries.get(key) ?? null;
    },
    removeItem(key: string) {
      entries.delete(key);
    },
    setItem(key: string, value: string) {
      entries.set(key, value);
    },
  };
}

describe("coupleSessionStorage", () => {
  it("reads saved couple session values", () => {
    const storage = createMemoryStorage({
      "couple-app-code": "S2-0526",
      "couple-app-secret": "secret",
      "couple-app-member": "jungseo",
    });

    expect(getStoredCoupleSession(storage)).toEqual({
      coupleCode: "S2-0526",
      coupleSecret: "secret",
    });
    expect(getStoredCoupleMember(storage)).toBe("jungseo");
  });

  it("saves and clears couple session values", () => {
    const storage = createMemoryStorage();

    saveCoupleSession(storage, "S2-0526", "secret");
    saveCoupleMember(storage, "minhyeok");
    clearCoupleSession(storage);

    expect(storage.entries.size).toBe(0);
  });

  it("clears only the saved member when changing profile", () => {
    const storage = createMemoryStorage({
      "couple-app-code": "S2-0526",
      "couple-app-member": "jungseo",
      "couple-app-secret": "secret",
    });

    clearCoupleMember(storage);

    expect(getStoredCoupleSession(storage)).toEqual({
      coupleCode: "S2-0526",
      coupleSecret: "secret",
    });
    expect(getStoredCoupleMember(storage)).toBe("");
  });
});
