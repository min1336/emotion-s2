type EventSortable = {
  date: string;
  time?: string;
};

type TodoSortable = {
  completed: boolean;
  createdAt: string;
};

export function sortEvents<T extends EventSortable>(events: T[]) {
  return [...events].sort((first, second) => {
    const dateOrder = first.date.localeCompare(second.date);
    if (dateOrder !== 0) {
      return dateOrder;
    }

    return (first.time || "99:99").localeCompare(second.time || "99:99");
  });
}

export function sortTodos<T extends TodoSortable>(todos: T[]) {
  return [...todos].sort((first, second) => {
    if (first.completed !== second.completed) {
      return first.completed ? 1 : -1;
    }

    return first.createdAt.localeCompare(second.createdAt);
  });
}
