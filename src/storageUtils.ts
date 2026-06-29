type ReadableStorage = {
  getItem: (key: string) => string | null;
};

type WritableStorage = ReadableStorage & {
  setItem: (key: string, value: string) => void;
};

export function getStoredMemberKey(storage: ReadableStorage, storageKey: string) {
  const storedMember = storage.getItem(storageKey);
  return storedMember === "jungseo" || storedMember === "minhyeok" ? storedMember : "";
}

export function getPushDeviceKey(
  storage: WritableStorage,
  storageKey: string,
  createKey: () => string = () => crypto.randomUUID(),
) {
  const existingKey = storage.getItem(storageKey);
  if (existingKey) {
    return existingKey;
  }

  const nextKey = createKey();
  storage.setItem(storageKey, nextKey);
  return nextKey;
}

export function getStoredPushEnabled(storage: ReadableStorage, storageKey: string) {
  return storage.getItem(storageKey) !== "false";
}

export function saveStoredPushEnabled(storage: WritableStorage, storageKey: string, isEnabled: boolean) {
  storage.setItem(storageKey, isEnabled ? "true" : "false");
}
