import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import {
  formatDateRangeLabel,
  formatFullDateLabel,
  getDateKeysInRange,
  getEventEndDate,
  isDateInRange,
  type DateRange,
} from "./dateUtils";
import { EventList } from "./listComponents";

const LONG_PRESS_MS = 520;
const weekdayLabels = ["일", "월", "화", "수", "목", "금", "토"];

type CalendarViewEvent = {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  time?: string;
  memo?: string;
};

type CalendarViewPhoto = {
  id: string;
  url: string;
  thumbnailUrl: string;
};

type CalendarMonthDay = {
  key: string;
  day: number;
  isCurrentMonth: boolean;
};

type CalendarViewProps<TEvent extends CalendarViewEvent, TPhoto extends CalendarViewPhoto> = {
  events: TEvent[];
  selectedDate: string;
  scheduleRange: DateRange | null;
  visibleMonth: Date;
  monthDays: CalendarMonthDay[];
  photosByDate: Map<string, TPhoto[]>;
  selectedDateEvents: TEvent[];
  deleteEvent: (id: string) => void;
  moveMonth: (direction: number) => void;
  openDatePhotosModal: (date: string) => void;
  previewScheduleRange: (date: string) => void;
  startScheduleRange: (date: string) => void;
  completeScheduleRange: (date: string) => void;
  cancelScheduleRange: () => void;
};

export function CalendarView<TEvent extends CalendarViewEvent, TPhoto extends CalendarViewPhoto>({
  events,
  selectedDate,
  scheduleRange,
  visibleMonth,
  monthDays,
  photosByDate,
  selectedDateEvents,
  deleteEvent,
  moveMonth,
  openDatePhotosModal,
  previewScheduleRange,
  startScheduleRange,
  completeScheduleRange,
  cancelScheduleRange,
}: CalendarViewProps<TEvent, TPhoto>) {
  const eventDates = new Set(
    events.flatMap((event) => getDateKeysInRange(event.date, getEventEndDate(event))),
  );
  const longPressTimerRef = useRef<number | null>(null);
  const isRangePressActiveRef = useRef(false);
  const hasRangeDragMovedRef = useRef(false);
  const suppressDateClickRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  const calendarGridRef = useRef<HTMLDivElement | null>(null);
  const capturedPointerElementRef = useRef<HTMLButtonElement | null>(null);
  const capturedDateRectsRef = useRef<
    Array<{ bottom: number; key: string; left: number; right: number; top: number }>
  >([]);
  const rangeStartDateRef = useRef("");
  const lastRangeDateRef = useRef("");
  const previewScheduleRangeRef = useRef(previewScheduleRange);
  const completeScheduleRangeRef = useRef(completeScheduleRange);

  useEffect(() => {
    previewScheduleRangeRef.current = previewScheduleRange;
  }, [previewScheduleRange]);

  useEffect(() => {
    completeScheduleRangeRef.current = completeScheduleRange;
  }, [completeScheduleRange]);

  useEffect(() => {
    function handleDocumentPointerMove(event: PointerEvent) {
      if (activePointerIdRef.current !== event.pointerId || !isRangePressActiveRef.current) {
        return;
      }

      previewPointerRange(event.clientX, event.clientY);
    }

    function handleDocumentPointerUp(event: PointerEvent) {
      finishPointerRange(event.pointerId, event.clientX, event.clientY);
    }

    function handleDocumentPointerCancel(event: PointerEvent) {
      cancelPointerRange(event.pointerId);
    }

    window.addEventListener("pointermove", handleDocumentPointerMove);
    window.addEventListener("pointerup", handleDocumentPointerUp);
    window.addEventListener("pointercancel", handleDocumentPointerCancel);
    return () => {
      window.removeEventListener("pointermove", handleDocumentPointerMove);
      window.removeEventListener("pointerup", handleDocumentPointerUp);
      window.removeEventListener("pointercancel", handleDocumentPointerCancel);
    };
  }, []);

  function clearLongPressTimer() {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function getDateKeyFromPoint(clientX: number, clientY: number) {
    const target = document.elementFromPoint(clientX, clientY);
    const targetDate = target?.closest<HTMLElement>("[data-date-key]")?.dataset.dateKey;
    if (targetDate) {
      return targetDate;
    }

    return getDateKeyFromRects(readCurrentDateRects(), clientX, clientY)
      || getDateKeyFromRects(capturedDateRectsRef.current, clientX, clientY);
  }

  function readCurrentDateRects() {
    const dateButtons = calendarGridRef.current?.querySelectorAll<HTMLElement>("[data-date-key]");
    return Array.from(dateButtons || []).map((button) => {
      const rect = button.getBoundingClientRect();
      return {
        bottom: rect.bottom,
        key: button.dataset.dateKey || "",
        left: rect.left,
        right: rect.right,
        top: rect.top,
      };
    });
  }

  function getDateKeyFromRects(
    rects: Array<{ bottom: number; key: string; left: number; right: number; top: number }>,
    clientX: number,
    clientY: number,
  ) {
    for (const rect of rects) {
      if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
        return rect.key;
      }
    }

    return "";
  }

  function releaseCapturedPointer(pointerId: number) {
    const element = capturedPointerElementRef.current;
    if (element?.hasPointerCapture(pointerId)) {
      element.releasePointerCapture(pointerId);
    }
    capturedPointerElementRef.current = null;
  }

  function previewPointerRange(clientX: number, clientY: number) {
    const nextDate = getDateKeyFromPoint(clientX, clientY);
    if (!nextDate) {
      return;
    }

    hasRangeDragMovedRef.current = true;
    lastRangeDateRef.current = nextDate;
    previewScheduleRangeRef.current(nextDate);
  }

  function finishPointerRange(pointerId: number, clientX: number, clientY: number) {
    clearLongPressTimer();
    if (activePointerIdRef.current !== pointerId) {
      return;
    }

    activePointerIdRef.current = null;
    releaseCapturedPointer(pointerId);
    if (!isRangePressActiveRef.current) {
      return;
    }

    const nextDate = getDateKeyFromPoint(clientX, clientY) || lastRangeDateRef.current;
    const didReleaseOnDifferentDate = Boolean(nextDate && nextDate !== rangeStartDateRef.current);
    isRangePressActiveRef.current = false;
    suppressDateClickRef.current = true;
    if ((hasRangeDragMovedRef.current || didReleaseOnDifferentDate) && nextDate) {
      completeScheduleRangeRef.current(nextDate);
    }
  }

  function cancelPointerRange(pointerId: number) {
    clearLongPressTimer();
    if (activePointerIdRef.current !== pointerId) {
      return;
    }

    releaseCapturedPointer(pointerId);
    activePointerIdRef.current = null;
    isRangePressActiveRef.current = false;
  }

  function handleDatePointerDown(event: ReactPointerEvent<HTMLButtonElement>, date: string) {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    clearLongPressTimer();
    const targetElement = event.currentTarget;
    const pointerId = event.pointerId;
    activePointerIdRef.current = event.pointerId;
    capturedDateRectsRef.current = readCurrentDateRects();
    capturedPointerElementRef.current = targetElement;
    rangeStartDateRef.current = date;
    lastRangeDateRef.current = date;
    isRangePressActiveRef.current = false;
    hasRangeDragMovedRef.current = false;
    targetElement.setPointerCapture(pointerId);
    longPressTimerRef.current = window.setTimeout(() => {
      isRangePressActiveRef.current = true;
      suppressDateClickRef.current = true;
      startScheduleRange(date);
    }, LONG_PRESS_MS);
  }

  function handleDatePointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    if (activePointerIdRef.current !== event.pointerId || !isRangePressActiveRef.current) {
      return;
    }

    previewPointerRange(event.clientX, event.clientY);
  }

  function handleDatePointerUp(event: ReactPointerEvent<HTMLButtonElement>, fallbackDate: string) {
    if (!lastRangeDateRef.current) {
      lastRangeDateRef.current = fallbackDate;
    }
    finishPointerRange(event.pointerId, event.clientX, event.clientY);
  }

  function handleDatePointerCancel(event: ReactPointerEvent<HTMLButtonElement>) {
    cancelPointerRange(event.pointerId);
  }

  function handleDateClick(date: string) {
    if (suppressDateClickRef.current) {
      suppressDateClickRef.current = false;
      return;
    }

    openDatePhotosModal(date);
  }

  return (
    <div className="screen-stack">
      <section className="content-card">
        <div className="calendar-topbar">
          <button type="button" className="icon-button" aria-label="이전 달" onClick={() => moveMonth(-1)}>
            ‹
          </button>
          <h2>
            {visibleMonth.getFullYear()}년 {visibleMonth.getMonth() + 1}월
          </h2>
          <button type="button" className="icon-button" aria-label="다음 달" onClick={() => moveMonth(1)}>
            ›
          </button>
        </div>

        <div className="calendar-grid" ref={calendarGridRef}>
          {weekdayLabels.map((label) => (
            <div className="weekday" key={label}>
              {label}
            </div>
          ))}
          {monthDays.map((date) => {
            const datePhotos = photosByDate.get(date.key) || [];
            const isInScheduleRange = scheduleRange
              ? isDateInRange(date.key, scheduleRange.start, scheduleRange.end)
              : false;

            return (
              <button
                type="button"
                data-date-key={date.key}
                className={[
                  "calendar-day",
                  date.isCurrentMonth ? "" : "muted",
                  date.key === selectedDate ? "selected" : "",
                  isInScheduleRange ? "range-selected" : "",
                  eventDates.has(date.key) ? "has-event" : "",
                  datePhotos.length ? "has-photo" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                key={date.key}
                onClick={() => handleDateClick(date.key)}
                onPointerCancel={handleDatePointerCancel}
                onPointerDown={(event) => handleDatePointerDown(event, date.key)}
                onPointerMove={handleDatePointerMove}
                onPointerUp={(event) => handleDatePointerUp(event, date.key)}
              >
                <span className="calendar-day-number">{date.day}</span>
                {datePhotos.length ? (
                  <span className="calendar-day-photos" aria-hidden="true">
                    {datePhotos.slice(0, 2).map((photo) => (
                      <img
                        src={photo.thumbnailUrl || photo.url}
                        alt=""
                        decoding="async"
                        loading="lazy"
                        key={photo.id}
                        onError={(event) => {
                          if (photo.url && event.currentTarget.src !== photo.url) {
                            event.currentTarget.src = photo.url;
                          }
                        }}
                      />
                    ))}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {scheduleRange ? (
          <div className="range-helper">
            <div>
              <p className="section-label">기간 선택 중</p>
              <strong>{formatDateRangeLabel(scheduleRange)}</strong>
            </div>
            <div className="range-helper-actions">
              <button type="button" className="text-button" onClick={() => completeScheduleRange(scheduleRange.end)}>
                일정 추가
              </button>
              <button type="button" className="text-button" onClick={cancelScheduleRange}>
                취소
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="content-card">
        <div className="section-heading">
          <div>
            <p className="section-label">선택한 날</p>
            <h3>{formatFullDateLabel(selectedDate)}</h3>
          </div>
        </div>
        <EventList
          events={selectedDateEvents}
          emptyText="아직 이 날의 약속이 없어요."
          onDelete={deleteEvent}
        />
      </section>
    </div>
  );
}
