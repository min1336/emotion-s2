import type { SupabaseClient } from "@supabase/supabase-js";
import { uploadCouplePhotos } from "./coupleMutations";
import type { MemberKey } from "./domainTypes";

type UploadPhotosInput = {
  coupleCode: string;
  date: string;
  files: File[];
  uploadedBy: MemberKey | null;
};

type UploadPhotos = (
  supabase: SupabaseClient,
  input: UploadPhotosInput,
) => Promise<{ uploadedCount: number }>;

type RunPhotoUploadWorkflowInput = UploadPhotosInput & {
  broadcastDataChanged: () => Promise<void>;
  loadRemoteData: (notice: string) => Promise<void>;
  supabase: SupabaseClient;
  uploadPhotos?: UploadPhotos;
};

type RunPhotoUploadWorkflowResult =
  | { status: "failed" }
  | { status: "uploaded"; uploadedCount: number };

export async function runPhotoUploadWorkflow({
  broadcastDataChanged,
  coupleCode,
  date,
  files,
  loadRemoteData,
  supabase,
  uploadPhotos = uploadCouplePhotos,
  uploadedBy,
}: RunPhotoUploadWorkflowInput): Promise<RunPhotoUploadWorkflowResult> {
  try {
    const result = await uploadPhotos(supabase, {
      coupleCode,
      date,
      files,
      uploadedBy,
    });

    await loadRemoteData(`${result.uploadedCount}장 사진 추가됨`);
    await broadcastDataChanged();
    return { status: "uploaded", uploadedCount: result.uploadedCount };
  } catch {
    return { status: "failed" };
  }
}
