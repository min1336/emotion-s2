import { useEffect, useRef, type FormEvent } from "react";
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

const DEFAULT_HOUR = 18;
const DEFAULT_MINUTE = 0;
const HOURS = Array.from({ length: 24 }, (_item, hour) => hour);
const MINUTES = Array.from({ length: 12 }, (_item, index) => index * 5);

function padTime(value: number) {
  return String(value).padStart(2, "0");
}

function timeToParts(time: string) {
  const [hourText, minuteText] = time.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return { hour: DEFAULT_HOUR, minute: DEFAULT_MINUTE };
  }

  return { hour, minute: Math.min(55, Math.round(minute / 5) * 5) };
}

function timeFromParts(hour: number, minute: number) {
  return `${padTime(hour)}:${padTime(minute)}`;
}

function formatTimeLabel(time: string) {
  if (!time) {
    return "시간 없음";
  }

  const { hour, minute } = timeToParts(time);
  const period = hour < 12 ? "오전" : "오후";
  const displayHour = hour % 12 || 12;

  return minute === 0 ? `${period} ${displayHour}시` : `${period} ${displayHour}:${padTime(minute)}`;
}

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
  const hourColumnRef = useRef<HTMLDivElement>(null);
  const minuteColumnRef = useRef<HTMLDivElement>(null);

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

  const selectedTime = timeToParts(eventTime);
  const timeLabel = formatTimeLabel(eventTime);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    hourColumnRef.current
      ?.querySelector<HTMLElement>(`[data-time-value="${selectedTime.hour}"]`)
      ?.scrollIntoView({ block: "center" });
    minuteColumnRef.current
      ?.querySelector<HTMLElement>(`[data-time-value="${selectedTime.minute}"]`)
      ?.scrollIntoView({ block: "center" });
  }, [isOpen, selectedTime.hour, selectedTime.minute]);

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
            <div className="time-wheel-sheet">
              <div className="time-wheel-header">
                <div className="time-display">
                  <span>하단에서 시 / 분 선택</span>
                  <strong>{timeLabel}</strong>
                  <small>{eventTime || "선택 안 함"}</small>
                </div>
                <button type="button" className="time-clear-button" onClick={() => setEventTime("")}>
                  시간 없음
                </button>
              </div>
              <div className="time-wheel-columns">
                <div className="time-wheel-column" aria-label="시 선택" ref={hourColumnRef}>
                  <span className="time-wheel-column-label">시</span>
                  {HOURS.map((hour) => (
                    <button
                      type="button"
                      className={`time-wheel-option ${
                        eventTime && selectedTime.hour === hour ? "selected" : ""
                      }`}
                      aria-pressed={eventTime !== "" && selectedTime.hour === hour}
                      data-time-value={hour}
                      key={hour}
                      onClick={() => setEventTime(timeFromParts(hour, selectedTime.minute))}
                    >
                      {padTime(hour)}시
                    </button>
                  ))}
                </div>
                <div className="time-wheel-column" aria-label="분 선택" ref={minuteColumnRef}>
                  <span className="time-wheel-column-label">분</span>
                  {MINUTES.map((minute) => (
                    <button
                      type="button"
                      className={`time-wheel-option ${
                        eventTime && selectedTime.minute === minute ? "selected" : ""
                      }`}
                      aria-pressed={eventTime !== "" && selectedTime.minute === minute}
                      data-time-value={minute}
                      key={minute}
                      onClick={() => setEventTime(timeFromParts(selectedTime.hour, minute))}
                    >
                      {padTime(minute)}분
                    </button>
                  ))}
                </div>
              </div>
            </div>
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
