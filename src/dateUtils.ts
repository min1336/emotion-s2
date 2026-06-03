export type DateRange = {
  start: string;
  end: string;
};

type CalendarEventLike = {
  date: string;
  endDate?: string;
  time?: string;
};

const RELATIONSHIP_START_DATE_KEY = "2025-05-28";
const RELATIONSHIP_START_AT = new Date(`${RELATIONSHIP_START_DATE_KEY}T00:00:00+09:00`);
export const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const KOREA_TIME_OFFSET_MS = 9 * HOUR_MS;
const weekdayLabels = ["일", "월", "화", "수", "목", "금", "토"];

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function toKoreaDateKey(date: Date) {
  return new Date(date.getTime() + KOREA_TIME_OFFSET_MS).toISOString().slice(0, 10);
}

export function getDateKeyDayIndex(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
}

export function dateFromKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatDateLabel(key?: string) {
  if (!key) {
    return "날짜 없음";
  }

  const date = dateFromKey(key);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

export function formatFullDateLabel(key: string) {
  const date = dateFromKey(key);
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${weekdayLabels[date.getDay()]}요일`;
}

export function formatDateRangeLabel(range: DateRange) {
  if (range.start === range.end) {
    return formatFullDateLabel(range.start);
  }

  return `${formatFullDateLabel(range.start)} - ${formatFullDateLabel(range.end)}`;
}

export function getEventEndDate(event: CalendarEventLike) {
  return event.endDate || event.date;
}

export function formatEventDateLabel(event: CalendarEventLike) {
  const endDate = getEventEndDate(event);
  if (event.date === endDate) {
    return formatDateLabel(event.date);
  }

  return `${formatDateLabel(event.date)} - ${formatDateLabel(endDate)}`;
}

export function formatCount(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

export function getRelationshipElapsed(now: number) {
  const elapsedMs = Math.max(0, now - RELATIONSHIP_START_AT.getTime());
  const elapsedDateDays =
    getDateKeyDayIndex(toKoreaDateKey(new Date(now))) -
    getDateKeyDayIndex(RELATIONSHIP_START_DATE_KEY);

  return {
    days: Math.max(0, elapsedDateDays + 1),
    hours: Math.floor(elapsedMs / HOUR_MS),
  };
}

export function formatSyncTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function getWeekRange(date: Date) {
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return {
    start: toDateKey(start),
    end: toDateKey(end),
  };
}

export function isDateInRange(date: string, start: string, end: string) {
  return date >= start && date <= end;
}

export function normalizeDateRange(start: string, end: string): DateRange {
  return start <= end ? { start, end } : { start: end, end: start };
}

export function doesEventOccurOnDate(event: CalendarEventLike, date: string) {
  return isDateInRange(date, event.date, getEventEndDate(event));
}

export function doesEventOverlapRange(event: CalendarEventLike, start: string, end: string) {
  return event.date <= end && getEventEndDate(event) >= start;
}

export function getDateKeysInRange(start: string, end: string) {
  const dates: string[] = [];
  const current = dateFromKey(start);
  const last = dateFromKey(end);

  while (current <= last) {
    dates.push(toDateKey(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

export function getMonthGrid(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDate = new Date(year, month, 1);
  const gridStart = new Date(firstDate);
  gridStart.setDate(firstDate.getDate() - firstDate.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);

    return {
      key: toDateKey(date),
      day: date.getDate(),
      isCurrentMonth: date.getMonth() === month,
    };
  });
}
