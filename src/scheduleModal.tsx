import { useEffect, type FormEvent } from "react";
import { formatDateRangeLabel, type DateRange } from "./dateUtils";

type ScheduleModalProps = {
  eventMemo: string;
  eventTime: string;
  eventTitle: string;
  isOpen: boolean;
  mode?: "add" | "edit";
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  range: DateRange | null;
  setEventMemo: (memo: string) => void;
  setEventTime: (time: string) => void;
  setEventTitle: (title: string) => void;
};

const TIME_PRESETS = [
  { label: "오전 9:30", value: "09:30" },
  { label: "오전 11시", value: "11:00" },
  { label: "오후 1시", value: "13:00" },
  { label: "오후 3시", value: "15:00" },
  { label: "저녁 6시", value: "18:00" },
  { label: "저녁 7:30", value: "19:30" },
];

export function ScheduleModal({
  eventMemo,
  eventTime,
  eventTitle,
  isOpen,
  mode = "add",
  onClose,
  onSubmit,
  range,
  setEventMemo,
  setEventTime,
  setEventTitle,
}: ScheduleModalProps) {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !range) {
    return null;
  }

  const isEditing = mode === "edit";
  const modalLabel = isEditing ? "일정 편집" : "일정 추가";

  return (
    <div className="photo-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="photo-modal schedule-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${formatDateRangeLabel(range)} ${modalLabel}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="photo-modal-header">
          <div>
            <p className="section-label">{modalLabel}</p>
            <h3>{formatDateRangeLabel(range)}</h3>
          </div>
          <button type="button" className="icon-button" aria-label={`${modalLabel} 닫기`} onClick={onClose}>
            ×
          </button>
        </div>
        <form className="form-stack" onSubmit={onSubmit}>
          <label>
            일정 이름
            <input
              value={eventTitle}
              onChange={(event) => setEventTitle(event.target.value)}
              placeholder="예: 1박 2일 여행"
              autoFocus
            />
          </label>
          <div className="time-field">
            <span className="form-label">시간</span>
            <div className="time-presets" aria-label="빠른 시간 선택">
              <span className="time-presets-label">빠른 선택</span>
              <button
                type="button"
                className={`time-preset-chip ${eventTime === "" ? "selected" : ""}`}
                aria-pressed={eventTime === ""}
                onClick={() => setEventTime("")}
              >
                시간 없음
              </button>
              {TIME_PRESETS.map((preset) => (
                <button
                  type="button"
                  className={`time-preset-chip ${eventTime === preset.value ? "selected" : ""}`}
                  aria-pressed={eventTime === preset.value}
                  key={preset.value}
                  onClick={() => setEventTime(preset.value)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <input
              type="time"
              value={eventTime}
              aria-label="직접 시간 입력"
              step="300"
              onChange={(event) => setEventTime(event.target.value)}
            />
          </div>
          <label>
            메모
            <textarea
              value={eventMemo}
              onChange={(event) => setEventMemo(event.target.value)}
              placeholder="장소나 준비물을 적어둘 수 있어요."
              rows={3}
            />
          </label>
          <button type="submit">{isEditing ? "일정 저장" : "이 기간에 일정 추가"}</button>
        </form>
      </section>
    </div>
  );
}
