import type { SupabaseClient } from "@supabase/supabase-js";
import { deleteCouplePhoto } from "./coupleMutations";
import type { CouplePhoto } from "./domainTypes";
import { removePhotoSignedUrlCacheEntries as removeCacheEntries } from "./photoUrlCache";

type DeletePhotoInput = {
  id: string;
  storagePath: string;
};

type DeletePhoto = (
  supabase: SupabaseClient,
  input: DeletePhotoInput,
) => Promise<{ deleteError: unknown | null; storageError: unknown | null }>;

type SetPhotoModalIndex = (updater: (currentIndex: number | null) => number | null) => void;

type RunPhotoDeleteWorkflowInput = {
  broadcastDataChanged: () => Promise<void>;
  confirmDeletePhoto: () => boolean;
  deletePhoto?: DeletePhoto;
  loadRemoteData: (notice: string) => Promise<void>;
  photo: CouplePhoto;
  remainingPhotoCount: number;
  removePhotoSignedUrlCacheEntries?: (storagePath: string, storage: Storage) => void;
  setPhotoModalIndex: SetPhotoModalIndex;
  storage: Storage;
  supabase: SupabaseClient;
};

type RunPhotoDeleteWorkflowResult =
  | { status: "cancelled" }
  | { status: "deleted" }
  | { status: "deleted-with-storage-warning" }
  | { status: "failed" };

function getNextPhotoModalIndex(remainingPhotoCount: number, currentIndex: number | null) {
  if (remainingPhotoCount === 0) {
    return null;
  }

  return Math.min(currentIndex ?? 0, remainingPhotoCount - 1);
}

export async function runPhotoDeleteWorkflow({
  broadcastDataChanged,
  confirmDeletePhoto,
  deletePhoto = deleteCouplePhoto,
  loadRemoteData,
  photo,
  remainingPhotoCount,
  removePhotoSignedUrlCacheEntries = removeCacheEntries,
  setPhotoModalIndex,
  storage,
  supabase,
}: RunPhotoDeleteWorkflowInput): Promise<RunPhotoDeleteWorkflowResult> {
  if (!confirmDeletePhoto()) {
    return { status: "cancelled" };
  }

  const { deleteError, storageError } = await deletePhoto(supabase, {
    id: photo.id,
    storagePath: photo.storagePath,
  });

  if (deleteError) {
    return { status: "failed" };
  }

  setPhotoModalIndex((currentIndex) => getNextPhotoModalIndex(remainingPhotoCount, currentIndex));
  removePhotoSignedUrlCacheEntries(photo.storagePath, storage);
  await loadRemoteData("사진 삭제됨");
  await broadcastDataChanged();

  if (storageError) {
    return { status: "deleted-with-storage-warning" };
  }

  return { status: "deleted" };
}
