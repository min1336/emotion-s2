import { formatEventDateLabel } from "./dateUtils";

type EventListItem = {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  time?: string;
  memo?: string;
};

type TodoListItem = {
  id: string;
  title: string;
  completed: boolean;
};

type EventListProps = {
  events: EventListItem[];
  emptyText: string;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
};

export function EventList({ events, emptyText, onDelete, onEdit }: EventListProps) {
  if (events.length === 0) {
    return <p className="empty-state">{emptyText}</p>;
  }

  return (
    <ul className="item-list">
      {events.map((event) => (
        <li className="list-item" key={event.id}>
          <div className="item-content">
            <span className="item-date">
              {formatEventDateLabel(event)}
              {event.time ? ` · ${event.time}` : ""}
            </span>
            <strong>{event.title}</strong>
            {event.memo ? <p>{event.memo}</p> : null}
          </div>
          {onEdit || onDelete ? (
            <div className="item-actions">
              {onEdit ? (
                <button type="button" className="text-button edit-button" onClick={() => onEdit(event.id)}>
                  편집
                </button>
              ) : null}
              {onDelete ? (
                <button type="button" className="delete-button" onClick={() => onDelete(event.id)}>
                  삭제
                </button>
              ) : null}
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

type TodoListProps = {
  todos: TodoListItem[];
  emptyText: string;
  onToggle?: (id: string) => void;
  onDelete?: (id: string) => void;
};

export function TodoList({ todos, emptyText, onToggle, onDelete }: TodoListProps) {
  if (todos.length === 0) {
    return <p className="empty-state">{emptyText}</p>;
  }

  return (
    <ul className="item-list">
      {todos.map((todo) => (
        <li className={`list-item todo-row ${todo.completed ? "completed" : ""}`} key={todo.id}>
          <button
            type="button"
            className="check-button"
            aria-label={`${todo.title} 완료 상태 변경`}
            aria-pressed={todo.completed}
            onClick={() => onToggle?.(todo.id)}
          >
            {todo.completed ? "✓" : ""}
          </button>
          <div>
            <strong>{todo.title}</strong>
            <span className={`todo-status-badge ${todo.completed ? "done" : "open"}`}>
              {todo.completed ? "완료" : "진행 중"}
            </span>
          </div>
          {onDelete ? (
            <button
              type="button"
              className="delete-button"
              aria-label={`${todo.title} 삭제`}
              onClick={() => onDelete(todo.id)}
            >
              삭제
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

type TabButtonProps = {
  active: boolean;
  label: string;
  onClick: () => void;
};

export function TabButton({ active, label, onClick }: TabButtonProps) {
  return (
    <button type="button" className={active ? "active" : ""} onClick={onClick}>
      <span>{label}</span>
    </button>
  );
}
