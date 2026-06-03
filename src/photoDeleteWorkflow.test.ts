import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { CouplePhoto } from "./domainTypes";
import { runPhotoDeleteWorkflow } from "./photoDeleteWorkflow";

const photo: CouplePhoto = {
  id: "photo-1",
  createdAt: "2026-05-26T00:00:00.000Z",
  date: "2026-05-26",
  displayUrl: "signed-display-url",
  storagePath: "S2-0526/2026-05-26/photo.jpg",
  thumbnailUrl: "signed-thumb-url",
  url: "signed-url",
};

describe("photoDeleteWorkflow", () => {
  it("confirms, deletes, updates modal index, clears cache, reloads, then broadcasts", async () => {
    const calls: string[] = [];
    const modalUpdates: Array<(currentIndex: number | null) => number | null> = [];
    const supabase = {} as SupabaseClient;
    const storage = {} as Storage;

    const result = await runPhotoDeleteWorkflow({
      broadcastDataChanged: async () => {
        calls.push("broadcast");
      },
      confirmDeletePhoto: () => {
        calls.push("confirm");
        return true;
      },
      deletePhoto: async (nextSupabase, input) => {
        calls.push(`delete:${nextSupabase === supabase}:${input.id}:${input.storagePath}`);
        return { deleteError: null, storageError: null };
      },
      loadRemoteData: async (notice) => {
        calls.push(`load:${notice}`);
      },
      photo,
      remainingPhotoCount: 2,
      removePhotoSignedUrlCacheEntries: (storagePath, nextStorage) => {
        calls.push(`cache:${storagePath}:${nextStorage === storage}`);
      },
      setPhotoModalIndex: (updater) => {
        calls.push("modal");
        modalUpdates.push(updater);
      },
      storage,
      supabase,
    });

    expect(result).toEqual({ status: "deleted" });
    expect(calls).toEqual([
      "confirm",
      "delete:true:photo-1:S2-0526/2026-05-26/photo.jpg",
      "modal",
      "cache:S2-0526/2026-05-26/photo.jpg:true",
      "load:사진 삭제됨",
      "broadcast",
    ]);
    expect(modalUpdates[0]?.(5)).toBe(1);
    expect(modalUpdates[0]?.(null)).toBe(0);
  });

  it("closes the photo modal after deleting the last photo", async () => {
    let nextModalIndex: number | null | undefined;

    const result = await runPhotoDeleteWorkflow({
      broadcastDataChanged: async () => undefined,
      confirmDeletePhoto: () => true,
      deletePhoto: async () => ({ deleteError: null, storageError: null }),
      loadRemoteData: async () => undefined,
      photo,
      remainingPhotoCount: 0,
      removePhotoSignedUrlCacheEntries: () => undefined,
      setPhotoModalIndex: (updater) => {
        nextModalIndex = updater(0);
      },
      storage: {} as Storage,
      supabase: {} as SupabaseClient,
    });

    expect(result).toEqual({ status: "deleted" });
    expect(nextModalIndex).toBeNull();
  });

  it("skips deletion when the user cancels confirmation", async () => {
    const calls: string[] = [];

    const result = await runPhotoDeleteWorkflow({
      broadcastDataChanged: async () => {
        calls.push("broadcast");
      },
      confirmDeletePhoto: () => false,
      deletePhoto: async () => {
        calls.push("delete");
        return { deleteError: null, storageError: null };
      },
      loadRemoteData: async () => {
        calls.push("load");
      },
      photo,
      remainingPhotoCount: 1,
      removePhotoSignedUrlCacheEntries: () => {
        calls.push("cache");
      },
      setPhotoModalIndex: () => {
        calls.push("modal");
      },
      storage: {} as Storage,
      supabase: {} as SupabaseClient,
    });

    expect(result).toEqual({ status: "cancelled" });
    expect(calls).toEqual([]);
  });

  it("reports delete failure and skips cache, reload, and broadcast", async () => {
    const calls: string[] = [];

    const result = await runPhotoDeleteWorkflow({
      broadcastDataChanged: async () => {
        calls.push("broadcast");
      },
      confirmDeletePhoto: () => true,
      deletePhoto: async () => ({ deleteError: new Error("delete failed"), storageError: null }),
      loadRemoteData: async () => {
        calls.push("load");
      },
      photo,
      remainingPhotoCount: 1,
      removePhotoSignedUrlCacheEntries: () => {
        calls.push("cache");
      },
      setPhotoModalIndex: () => {
        calls.push("modal");
      },
      storage: {} as Storage,
      supabase: {} as SupabaseClient,
    });

    expect(result).toEqual({ status: "failed" });
    expect(calls).toEqual([]);
  });

  it("keeps the successful delete flow when storage cleanup reports a warning", async () => {
    const result = await runPhotoDeleteWorkflow({
      broadcastDataChanged: async () => undefined,
      confirmDeletePhoto: () => true,
      deletePhoto: async () => ({ deleteError: null, storageError: new Error("storage failed") }),
      loadRemoteData: async () => undefined,
      photo,
      remainingPhotoCount: 1,
      removePhotoSignedUrlCacheEntries: () => undefined,
      setPhotoModalIndex: () => undefined,
      storage: {} as Storage,
      supabase: {} as SupabaseClient,
    });

    expect(result).toEqual({ status: "deleted-with-storage-warning" });
  });
});
