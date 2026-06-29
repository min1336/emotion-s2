import { describe, expect, it } from "vitest";
import {
  getPhotoSignedUrlCacheKey,
  getPhotoTransformOptions,
  isFreshPhotoSignedUrl,
  readPhotoSignedUrlCache,
  removePhotoSignedUrlCacheEntries,
  writePhotoSignedUrlCache,
} from "./photoUrlCache";

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

describe("photo signed URL cache", () => {
  it("treats URLs as stale before the refresh buffer", () => {
    expect(isFreshPhotoSignedUrl({ url: "url", expiresAt: 2_000 }, 1_000, 500)).toBe(true);
    expect(isFreshPhotoSignedUrl({ url: "url", expiresAt: 1_200 }, 1_000, 500)).toBe(false);
  });

  it("reads only fresh cache entries", () => {
    const storage = createStorage({
      cache: JSON.stringify({
        fresh: { url: "fresh-url", expiresAt: 2_000 },
        stale: { url: "stale-url", expiresAt: 1_200 },
      }),
    });

    expect(readPhotoSignedUrlCache(storage, "cache", 1_000, 500)).toEqual({
      fresh: { url: "fresh-url", expiresAt: 2_000 },
    });
  });

  it("removes all variants for a storage path", () => {
    const storage = createStorage();
    writePhotoSignedUrlCache(
      {
        [getPhotoSignedUrlCacheKey("path.jpg", "original")]: { url: "a", expiresAt: 2_000 },
        [getPhotoSignedUrlCacheKey("path.jpg", "thumbnail")]: { url: "b", expiresAt: 2_000 },
        [getPhotoSignedUrlCacheKey("other.jpg", "original")]: { url: "c", expiresAt: 2_000 },
      },
      storage,
      "cache",
      1_000,
      500,
    );

    removePhotoSignedUrlCacheEntries("path.jpg", storage, "cache", 1_000, 500);

    expect(JSON.parse(storage.values.get("cache") || "{}")).toEqual({
      "original:other.jpg": { url: "c", expiresAt: 2_000 },
    });
  });

  it("returns Supabase image transform options by variant", () => {
    expect(getPhotoTransformOptions("thumbnail")).toEqual({
      transform: { height: 180, quality: 68, resize: "cover", width: 180 },
    });
    expect(getPhotoTransformOptions("display")).toEqual({
      transform: { quality: 82, resize: "contain", width: 1200 },
    });
    expect(getPhotoTransformOptions("original")).toBeUndefined();
  });
});
