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

const DEFAULT_TIME_MINUTES = 18 * 60;
const LAST_SLIDER_MINUTE = 23 * 60 + 55;

function padTime(value: number) {
  return String(value).padStart(2, "0");
}

function minutesToTime(minutes: number) {
  const safeMinutes = Math.min(Math.max(minutes, 0), LAST_SLIDER_MINUTE);
  const hour = Math.floor(safeMinutes / 60);
  const minute = safeMinutes % 60;

  return `${padTime(hour)}:${padTime(minute)}`;
}

function timeToMinutes(time: string) {
  const [hourText, minuteText] = time.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return DEFAULT_TIME_MINUTES;
  }

  return hour * 60 + minute;
}

function formatTimeLabel(time: string) {
  if (!time) {
    return "시간 없음";
  }

  const totalMinutes = timeToMinutes(time);
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
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
  const sliderMinutes = eventTime ? timeToMinutes(eventTime) : DEFAULT_TIME_MINUTES;
  const timeLabel = formatTimeLabel(eventTime);

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
            <div className="time-slider-panel">
              <div className="time-display">
                <span>슬라이드로 시간 조절</span>
                <strong>{timeLabel}</strong>
                <small>{eventTime || "선택 안 함"}</small>
              </div>
              <button type="button" className="time-clear-button" onClick={() => setEventTime("")}>
                시간 없음
              </button>
            </div>
            <input
              className="time-slider"
              type="range"
              min="0"
              max={LAST_SLIDER_MINUTE}
              step="5"
              value={sliderMinutes}
              aria-label="시간 슬라이더"
              aria-valuetext={timeLabel}
              onChange={(event) => setEventTime(minutesToTime(Number(event.target.value)))}
            />
            <div className="time-slider-scale" aria-hidden="true">
              <span>00:00</span>
              <span>12:00</span>
              <span>23:55</span>
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
