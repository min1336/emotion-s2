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

const DEFAULT_HOUR = 18;
const DEFAULT_MINUTE = 0;
const MINUTES = Array.from({ length: 12 }, (_item, index) => index * 5);
const CLOCK_HOUR_POSITIONS = [
  { hour: 12, x: 50, y: 8 },
  { hour: 1, x: 72, y: 14 },
  { hour: 2, x: 88, y: 30 },
  { hour: 3, x: 94, y: 50 },
  { hour: 4, x: 88, y: 70 },
  { hour: 5, x: 72, y: 86 },
  { hour: 6, x: 50, y: 92 },
  { hour: 7, x: 28, y: 86 },
  { hour: 8, x: 12, y: 70 },
  { hour: 9, x: 6, y: 50 },
  { hour: 10, x: 12, y: 30 },
  { hour: 11, x: 28, y: 14 },
];

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

function clockHourToTime(displayHour: number, period: "am" | "pm") {
  if (displayHour === 12) {
    return period === "am" ? 0 : 12;
  }

  return period === "am" ? displayHour : displayHour + 12;
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
  const selectedPeriod = selectedTime.hour < 12 ? "am" : "pm";
  const selectedClockHour = selectedTime.hour % 12 || 12;

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
            <div className="time-clock-panel">
              <div className="time-clock-header">
                <div className="time-display">
                  <span>시계로 시간 선택</span>
                  <strong>{timeLabel}</strong>
                  <small>{eventTime || "선택 안 함"}</small>
                </div>
                <button type="button" className="time-clear-button" onClick={() => setEventTime("")}>
                  시간 없음
                </button>
              </div>
              <div className="time-period-toggle" aria-label="오전 오후 선택">
                <button
                  type="button"
                  className={selectedPeriod === "am" && eventTime ? "selected" : ""}
                  aria-pressed={eventTime !== "" && selectedPeriod === "am"}
                  onClick={() =>
                    setEventTime(timeFromParts(clockHourToTime(selectedClockHour, "am"), selectedTime.minute))
                  }
                >
                  오전
                </button>
                <button
                  type="button"
                  className={selectedPeriod === "pm" && eventTime ? "selected" : ""}
                  aria-pressed={eventTime !== "" && selectedPeriod === "pm"}
                  onClick={() =>
                    setEventTime(timeFromParts(clockHourToTime(selectedClockHour, "pm"), selectedTime.minute))
                  }
                >
                  오후
                </button>
              </div>
              <div className="time-clock-face" aria-label="시계 시간 선택">
                <div className="time-clock-center" aria-hidden="true" />
                <div
                  className="time-clock-hand"
                  style={{ transform: `translateX(-50%) rotate(${selectedClockHour * 30}deg)` }}
                  aria-hidden="true"
                />
                {CLOCK_HOUR_POSITIONS.map(({ hour, x, y }) => (
                  <button
                    type="button"
                    className={`time-clock-hour ${eventTime && selectedClockHour === hour ? "selected" : ""}`}
                    aria-pressed={eventTime !== "" && selectedClockHour === hour}
                    data-clock-hour={hour}
                    key={hour}
                    onClick={() =>
                      setEventTime(timeFromParts(clockHourToTime(hour, selectedPeriod), selectedTime.minute))
                    }
                    style={{ left: `${x}%`, top: `${y}%` }}
                  >
                    {hour}
                  </button>
                ))}
              </div>
              <div className="time-clock-minutes" aria-label="분 선택">
                {MINUTES.map((minute) => (
                  <button
                    type="button"
                    className={`time-clock-minute ${eventTime && selectedTime.minute === minute ? "selected" : ""}`}
                    aria-pressed={eventTime !== "" && selectedTime.minute === minute}
                    data-clock-minute={minute}
                    key={minute}
                    onClick={() => setEventTime(timeFromParts(selectedTime.hour, minute))}
                  >
                    {padTime(minute)}
                  </button>
                ))}
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
