import { useEffect, type ChangeEvent } from "react";
import { formatDateLabel, formatFullDateLabel } from "./dateUtils";
import { EventList } from "./listComponents";

type PhotoModalPhoto = {
  id: string;
  date: string;
  url: string;
  displayUrl: string;
  thumbnailUrl: string;
};

type PhotoModalEvent = {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  time?: string;
  memo?: string;
};

type PhotoModalProps<TPhoto extends PhotoModalPhoto, TEvent extends PhotoModalEvent> = {
  photos: TPhoto[];
  activeIndex: number | null;
  selectedDate: string;
  addPhotos: (event: ChangeEvent<HTMLInputElement>) => void;
  closePhotoModal: () => void;
  deletePhoto: (photo: TPhoto) => void;
  deleteEvent?: (id: string) => void;
  editEvent?: (id: string) => void;
  events: TEvent[];
  isUploadingPhoto: boolean;
  movePhotoSlide: (direction: number) => void;
};

export function PhotoModal<TPhoto extends PhotoModalPhoto, TEvent extends PhotoModalEvent>({
  photos,
  activeIndex,
  selectedDate,
  addPhotos,
  closePhotoModal,
  deletePhoto,
  deleteEvent,
  editEvent,
  events,
  isUploadingPhoto,
  movePhotoSlide,
}: PhotoModalProps<TPhoto, TEvent>) {
  const activePhoto = activeIndex === null ? null : photos[activeIndex] || null;

  useEffect(() => {
    if (activeIndex === null || !photos.length) {
      return undefined;
    }

    const indexesToPreload = [activeIndex, activeIndex + 1, activeIndex - 1].filter(
      (index) => index >= 0 && index < photos.length,
    );
    const preloadImages = indexesToPreload
      .map((index) => photos[index]?.displayUrl || photos[index]?.url)
      .filter(Boolean)
      .map((src) => {
        const image = new Image();
        image.decoding = "async";
        image.src = src;
        return image;
      });

    return () => {
      preloadImages.forEach((image) => {
        image.src = "";
      });
    };
  }, [activeIndex, photos]);

  useEffect(() => {
    if (activeIndex === null) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closePhotoModal();
      }

      if (event.key === "ArrowLeft") {
        movePhotoSlide(-1);
      }

      if (event.key === "ArrowRight") {
        movePhotoSlide(1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, closePhotoModal, movePhotoSlide]);

  if (activeIndex === null) {
    return null;
  }

  return (
    <div className="photo-modal-backdrop" role="presentation" onClick={closePhotoModal}>
      <section
        className="photo-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${formatFullDateLabel(selectedDate)} 사진`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="photo-modal-header">
          <div>
            <p className="section-label">사진</p>
            <h3>{formatFullDateLabel(selectedDate)}</h3>
          </div>
          <div className="photo-modal-header-actions">
            <label className={`text-button photo-upload-button photo-add-button ${isUploadingPhoto ? "disabled" : ""}`}>
              {isUploadingPhoto ? "추가 중" : "추가"}
              <input type="file" accept="image/*" multiple disabled={isUploadingPhoto} onChange={addPhotos} />
            </label>
            <button
              type="button"
              className="text-button photo-delete-button"
              disabled={!activePhoto}
              onClick={() => {
                if (activePhoto) {
                  deletePhoto(activePhoto);
                }
              }}
            >
              삭제
            </button>
            <button type="button" className="icon-button" aria-label="사진 닫기" onClick={closePhotoModal}>
              ×
            </button>
          </div>
        </div>
        <div className="photo-slide">
          {activePhoto ? (
            <img
              src={activePhoto.displayUrl || activePhoto.url}
              alt={`${formatDateLabel(activePhoto.date)} 사진 ${activeIndex + 1}`}
              decoding="async"
              onError={(event) => {
                if (activePhoto.url && event.currentTarget.src !== activePhoto.url) {
                  event.currentTarget.src = activePhoto.url;
                }
              }}
            />
          ) : (
            <p className="photo-modal-empty">이 날의 사진이 아직 없어요.</p>
          )}
        </div>
        <div className="photo-modal-actions">
          <button type="button" className="text-button" disabled={!photos.length} onClick={() => movePhotoSlide(-1)}>
            이전
          </button>
          <span>
            {photos.length ? `${activeIndex + 1} / ${photos.length}` : "사진 없음"}
          </span>
          <button type="button" className="text-button" disabled={!photos.length} onClick={() => movePhotoSlide(1)}>
            다음
          </button>
        </div>
        <section className="photo-modal-events" aria-label={`${formatDateLabel(selectedDate)} 일정`}>
          <p className="section-label">일정</p>
          <EventList
            events={events}
            emptyText="아직 이 날의 약속이 없어요."
            onDelete={deleteEvent}
            onEdit={editEvent}
          />
        </section>
      </section>
    </div>
  );
}
