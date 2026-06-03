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
