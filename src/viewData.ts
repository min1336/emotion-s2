import type { CoupleEvent, CouplePhoto, CoupleTodo } from "./domainTypes";
import type { DateRange } from "./dateUtils";
import { doesEventOccurOnDate, doesEventOverlapRange } from "./dateUtils";

export function groupPhotosByDate(photos: CouplePhoto[]) {
  const groupedPhotos = new Map<string, CouplePhoto[]>();
  photos.forEach((photo) => {
    const datePhotos = groupedPhotos.get(photo.date) || [];
    datePhotos.push(photo);
    groupedPhotos.set(photo.date, datePhotos);
  });

  groupedPhotos.forEach((datePhotos) => {
    datePhotos.sort((first, second) => first.createdAt.localeCompare(second.createdAt));
  });

  return groupedPhotos;
}

export function getEventsForDate(events: CoupleEvent[], date: string) {
  return events.filter((event) => doesEventOccurOnDate(event, date));
}

export function getEventsOverlappingRange(events: CoupleEvent[], range: DateRange) {
  return events.filter((event) => doesEventOverlapRange(event, range.start, range.end));
}

export function splitTodosByCompletion(todos: CoupleTodo[]) {
  return {
    completedTodos: todos.filter((todo) => todo.completed),
    openTodos: todos.filter((todo) => !todo.completed),
  };
}
