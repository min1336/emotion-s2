import type { MemberKey } from "./domainTypes";
import { getStoredMemberKey } from "./storageUtils";

export const COUPLE_CODE_STORAGE_KEY = "couple-app-code";
export const COUPLE_SECRET_STORAGE_KEY = "couple-app-secret";
export const COUPLE_MEMBER_STORAGE_KEY = "couple-app-member";

type ReadableStorage = {
  getItem: (key: string) => string | null;
};

type WritableStorage = ReadableStorage & {
  removeItem: (key: string) => void;
  setItem: (key: string, value: string) => void;
};

export function getStoredCoupleSession(storage: ReadableStorage) {
  return {
    coupleCode: storage.getItem(COUPLE_CODE_STORAGE_KEY) || "",
    coupleSecret: storage.getItem(COUPLE_SECRET_STORAGE_KEY) || "",
  };
}

export function getStoredCoupleMember(storage: ReadableStorage) {
  return getStoredMemberKey(storage, COUPLE_MEMBER_STORAGE_KEY);
}

export function saveCoupleSession(storage: WritableStorage, coupleCode: string, coupleSecret: string) {
  storage.setItem(COUPLE_CODE_STORAGE_KEY, coupleCode);
  storage.setItem(COUPLE_SECRET_STORAGE_KEY, coupleSecret);
}

export function clearCoupleSession(storage: WritableStorage) {
  storage.removeItem(COUPLE_CODE_STORAGE_KEY);
  storage.removeItem(COUPLE_SECRET_STORAGE_KEY);
  storage.removeItem(COUPLE_MEMBER_STORAGE_KEY);
}

export function saveCoupleMember(storage: WritableStorage, memberKey: MemberKey) {
  storage.setItem(COUPLE_MEMBER_STORAGE_KEY, memberKey);
}

export function clearCoupleMember(storage: WritableStorage) {
  storage.removeItem(COUPLE_MEMBER_STORAGE_KEY);
}
