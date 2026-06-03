import { useMemo, useState } from "react";
import { CalendarView } from "./calendarView";
import {
  dateFromKey,
  getMonthGrid,
  normalizeDateRange,
  type DateRange,
} from "./dateUtils";
import type { CoupleEvent, CouplePhoto } from "./domainTypes";
import { getEventsForDate, groupPhotosByDate } from "./viewData";

const demoEvents: CoupleEvent[] = [
  {
    id: "demo-event-walk",
    title: "사진 산책",
    date: "2026-06-01",
    time: "17:30",
    memo: "강변에서 찍은 사진과 저녁 약속",
    createdAt: "2026-06-01T08:00:00.000Z",
  },
  {
    id: "demo-event-anniversary",
    title: "기념일 저녁",
    date: "2026-06-02",
    endDate: "2026-06-03",
    time: "19:00",
    memo: "이틀 동안 천천히 기록할 일정",
    createdAt: "2026-06-01T09:00:00.000Z",
  },
  {
    id: "demo-event-letter",
    title: "편지 쓰기",
    date: "2026-06-12",
    memo: "사진 없는 날도 작게 표시되는지 확인",
    createdAt: "2026-06-02T09:00:00.000Z",
  },
];

const demoPhotos: CouplePhoto[] = [
  createDemoPhoto("demo-photo-river", "2026-06-01", "River", "#f4a58c", "#7fc7bd"),
  createDemoPhoto("demo-photo-cafe", "2026-06-01", "Cafe", "#f8ce75", "#ed7f78"),
  createDemoPhoto("demo-photo-dinner", "2026-06-03", "Dinner", "#8fb7e8", "#f2a6be"),
  createDemoPhoto("demo-photo-letter", "2026-06-12", "Letter", "#c7b2f3", "#89c9a7"),
];

export function isCalendarDemoMode(search: string) {
  return new URLSearchParams(search).get("demo") === "calendar";
}

export function CalendarMemoryDemo() {
  const [visibleMonth, setVisibleMonth] = useState(() => dateFromKey("2026-06-01"));
  const [selectedDate, setSelectedDate] = useState("2026-06-01");
  const [scheduleRange, setScheduleRange] = useState<DateRange | null>({
    start: "2026-06-01",
    end: "2026-06-03",
  });
  const monthDays = useMemo(() => getMonthGrid(visibleMonth), [visibleMonth]);
  const photosByDate = useMemo(() => groupPhotosByDate(demoPhotos), []);
  const selectedDateEvents = useMemo(() => getEventsForDate(demoEvents, selectedDate), [selectedDate]);

  function moveMonth(direction: number) {
    setVisibleMonth((currentMonth) => (
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + direction, 1)
    ));
  }

  function previewScheduleRange(date: string) {
    setScheduleRange((currentRange) => (
      currentRange ? normalizeDateRange(currentRange.start, date) : currentRange
    ));
  }

  function startScheduleRange(date: string) {
    setScheduleRange({ start: date, end: date });
  }

  function completeScheduleRange(date: string) {
    setScheduleRange((currentRange) => (
      currentRange ? normalizeDateRange(currentRange.start, date) : { start: date, end: date }
    ));
    setSelectedDate(date);
  }

  return (
    <main className="app-shell calendar-demo-app">
      <header className="app-header calendar-demo-header">
        <div>
          <p className="eyebrow">캘린더 디자인 미리보기</p>
          <h1>Memory Almanac</h1>
        </div>
      </header>
      <section className="app-content">
        <CalendarView
          events={demoEvents}
          selectedDate={selectedDate}
          scheduleRange={scheduleRange}
          visibleMonth={visibleMonth}
          monthDays={monthDays}
          photosByDate={photosByDate}
          selectedDateEvents={selectedDateEvents}
          deleteEvent={() => undefined}
          moveMonth={moveMonth}
          openDatePhotosModal={setSelectedDate}
          previewScheduleRange={previewScheduleRange}
          startScheduleRange={startScheduleRange}
          completeScheduleRange={completeScheduleRange}
          cancelScheduleRange={() => setScheduleRange(null)}
        />
      </section>
    </main>
  );
}

function createDemoPhoto(
  id: string,
  date: string,
  label: string,
  fillColor: string,
  accentColor: string,
): CouplePhoto {
  const url = createDemoPhotoUrl(label, fillColor, accentColor);

  return {
    id,
    date,
    storagePath: `demo/${id}.svg`,
    url,
    thumbnailUrl: url,
    displayUrl: url,
    caption: label,
    uploadedBy: "jungseo",
    createdAt: `${date}T09:00:00.000Z`,
  };
}

function createDemoPhotoUrl(label: string, fillColor: string, accentColor: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
      <rect width="160" height="160" rx="34" fill="${fillColor}"/>
      <circle cx="116" cy="42" r="28" fill="${accentColor}" opacity="0.78"/>
      <path d="M24 116c20-34 35-43 55-22 16 17 27 16 57-10v52H24z" fill="#fff8ef" opacity="0.86"/>
      <text x="80" y="88" text-anchor="middle" font-family="Arial, sans-serif" font-size="25" font-weight="800" fill="#5f3d34">${label}</text>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
