import { useEffect, type FormEvent } from "react";
import { formatDateRangeLabel, type DateRange } from "./dateUtils";

type ScheduleModalProps = {
  eventMemo: string;
  eventTime: string;
  eventTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  range: DateRange | null;
  setEventMemo: (memo: string) => void;
  setEventTime: (time: string) => void;
  setEventTitle: (title: string) => void;
};

export function ScheduleModal({
  eventMemo,
  eventTime,
  eventTitle,
  isOpen,
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

  return (
    <div className="photo-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="photo-modal schedule-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${formatDateRangeLabel(range)} 일정 추가`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="photo-modal-header">
          <div>
            <p className="section-label">일정 추가</p>
            <h3>{formatDateRangeLabel(range)}</h3>
          </div>
          <button type="button" className="icon-button" aria-label="일정 추가 닫기" onClick={onClose}>
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
          <label>
            시간
            <input type="time" value={eventTime} onChange={(event) => setEventTime(event.target.value)} />
          </label>
          <label>
            메모
            <textarea
              value={eventMemo}
              onChange={(event) => setEventMemo(event.target.value)}
              placeholder="장소나 준비물을 적어둘 수 있어요."
              rows={3}
            />
          </label>
          <button type="submit">이 기간에 일정 추가</button>
        </form>
      </section>
    </div>
  );
}
