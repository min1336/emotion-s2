import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { runPhotoUploadWorkflow } from "./photoUploadWorkflow";

describe("photoUploadWorkflow", () => {
  it("uploads photos, reloads remote data, then broadcasts in order", async () => {
    const calls: string[] = [];
    const files = [{ name: "photo.png" }] as File[];
    const supabase = {} as SupabaseClient;

    const result = await runPhotoUploadWorkflow({
      broadcastDataChanged: async () => {
        calls.push("broadcast");
      },
      coupleCode: "S2-0526",
      date: "2026-05-26",
      files,
      loadRemoteData: async (notice) => {
        calls.push(`load:${notice}`);
      },
      supabase,
      uploadPhotos: async (nextSupabase, input) => {
        calls.push(`upload:${nextSupabase === supabase}:${input.files === files}:${input.uploadedBy}`);
        return { uploadedCount: 2 };
      },
      uploadedBy: "jungseo",
    });

    expect(result).toEqual({ status: "uploaded", uploadedCount: 2 });
    expect(calls).toEqual(["upload:true:true:jungseo", "load:2장 사진 추가됨", "broadcast"]);
  });

  it("reports failure and skips reload/broadcast when upload throws", async () => {
    const calls: string[] = [];

    const result = await runPhotoUploadWorkflow({
      broadcastDataChanged: async () => {
        calls.push("broadcast");
      },
      coupleCode: "S2-0526",
      date: "2026-05-26",
      files: [{ name: "photo.png" }] as File[],
      loadRemoteData: async () => {
        calls.push("load");
      },
      supabase: {} as SupabaseClient,
      uploadPhotos: async () => {
        throw new Error("upload failed");
      },
      uploadedBy: null,
    });

    expect(result).toEqual({ status: "failed" });
    expect(calls).toEqual([]);
  });
});
