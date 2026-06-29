export const MAX_PHOTO_UPLOAD_SIZE = 5 * 1024 * 1024;
export const MAX_PHOTO_UPLOAD_COUNT = 8;

type PhotoUploadSelectionStatus = "empty" | "invalid-type" | "oversized" | "ready";

type PhotoUploadSelection = {
  files: File[];
  status: PhotoUploadSelectionStatus;
};

export function getPhotoUploadSelection(
  files: File[],
  maxCount = MAX_PHOTO_UPLOAD_COUNT,
  maxSize = MAX_PHOTO_UPLOAD_SIZE,
): PhotoUploadSelection {
  const selectedFiles = files.slice(0, maxCount);
  if (!selectedFiles.length) {
    return { files: [], status: "empty" };
  }

  const imageFiles = selectedFiles.filter((file) => file.type.startsWith("image/"));
  if (imageFiles.length !== selectedFiles.length) {
    return { files: [], status: "invalid-type" };
  }

  if (imageFiles.some((file) => file.size > maxSize)) {
    return { files: [], status: "oversized" };
  }

  return { files: imageFiles, status: "ready" };
}
