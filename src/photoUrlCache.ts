export type PhotoSignedUrlVariant = "original" | "thumbnail" | "display";

type CachedPhotoSignedUrl = {
  expiresAt: number;
  url: string;
};

export type PhotoSignedUrlCache = Record<string, CachedPhotoSignedUrl>;

type CacheStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

export const PHOTO_SIGNED_URL_CACHE_KEY = "couple-photo-signed-url-cache:v1";
export const PHOTO_SIGNED_URL_CACHE_LIMIT = 600;
export const PHOTO_SIGNED_URL_TTL = 60 * 60;
export const PHOTO_SIGNED_URL_REFRESH_BUFFER_MS = 5 * 60 * 1000;

export function getPhotoSignedUrlCacheKey(storagePath: string, variant: PhotoSignedUrlVariant) {
  return `${variant}:${storagePath}`;
}

export function isFreshPhotoSignedUrl(
  entry: CachedPhotoSignedUrl | undefined,
  now = Date.now(),
  refreshBufferMs = PHOTO_SIGNED_URL_REFRESH_BUFFER_MS,
) {
  return Boolean(entry?.url && entry.expiresAt > now + refreshBufferMs);
}

export function readPhotoSignedUrlCache(
  storage: Pick<CacheStorage, "getItem">,
  storageKey = PHOTO_SIGNED_URL_CACHE_KEY,
  now = Date.now(),
  refreshBufferMs = PHOTO_SIGNED_URL_REFRESH_BUFFER_MS,
) {
  try {
    const rawCache = storage.getItem(storageKey);
    if (!rawCache) {
      return {};
    }

    const parsedCache = JSON.parse(rawCache) as PhotoSignedUrlCache;
    return Object.fromEntries(
      Object.entries(parsedCache).filter(([, entry]) => isFreshPhotoSignedUrl(entry, now, refreshBufferMs)),
    ) as PhotoSignedUrlCache;
  } catch {
    return {};
  }
}

export function writePhotoSignedUrlCache(
  cache: PhotoSignedUrlCache,
  storage: Pick<CacheStorage, "setItem">,
  storageKey = PHOTO_SIGNED_URL_CACHE_KEY,
  now = Date.now(),
  refreshBufferMs = PHOTO_SIGNED_URL_REFRESH_BUFFER_MS,
  cacheLimit = PHOTO_SIGNED_URL_CACHE_LIMIT,
) {
  try {
    const entries = Object.entries(cache)
      .filter(([, entry]) => isFreshPhotoSignedUrl(entry, now, refreshBufferMs))
      .slice(-cacheLimit);

    storage.setItem(storageKey, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // localStorage can be unavailable or full. The app can still fetch fresh signed URLs.
  }
}

export function removePhotoSignedUrlCacheEntries(
  storagePath: string,
  storage: CacheStorage,
  storageKey = PHOTO_SIGNED_URL_CACHE_KEY,
  now = Date.now(),
  refreshBufferMs = PHOTO_SIGNED_URL_REFRESH_BUFFER_MS,
) {
  const cache = readPhotoSignedUrlCache(storage, storageKey, now, refreshBufferMs);
  let changed = false;

  (["original", "thumbnail", "display"] as PhotoSignedUrlVariant[]).forEach((variant) => {
    const cacheKey = getPhotoSignedUrlCacheKey(storagePath, variant);
    if (cache[cacheKey]) {
      delete cache[cacheKey];
      changed = true;
    }
  });

  if (changed) {
    writePhotoSignedUrlCache(cache, storage, storageKey, now, refreshBufferMs);
  }
}

export function getPhotoTransformOptions(variant: PhotoSignedUrlVariant) {
  if (variant === "thumbnail") {
    return { transform: { height: 180, quality: 68, resize: "cover" as const, width: 180 } };
  }

  if (variant === "display") {
    return { transform: { quality: 82, resize: "contain" as const, width: 1200 } };
  }

  return undefined;
}
