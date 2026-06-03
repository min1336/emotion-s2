import { FormEvent } from "react";
import { TodoList } from "./listComponents";

type TodoItem = {
  id: string;
  title: string;
  completed: boolean;
};

type TodoViewProps = {
  openTodos: TodoItem[];
  completedTodos: TodoItem[];
  todoTitle: string;
  setTodoTitle: (title: string) => void;
  addTodo: (event: FormEvent<HTMLFormElement>) => void;
  toggleTodo: (id: string) => void;
  deleteTodo: (id: string) => void;
};

export function TodoView({
  openTodos,
  completedTodos,
  todoTitle,
  setTodoTitle,
  addTodo,
  toggleTodo,
  deleteTodo,
}: TodoViewProps) {
  const totalTodos = openTodos.length + completedTodos.length;
  const completionRate = totalTodos ? Math.round((completedTodos.length / totalTodos) * 100) : 0;

  return (
    <div className="screen-stack todo-screen">
      <section className="content-card todo-overview-card">
        <div className="section-heading">
          <div>
            <p className="section-label">같이 할 일</p>
            <h2>오늘 같이 챙길 것</h2>
          </div>
        </div>

        <div className="todo-metrics" aria-label="투두 요약">
          <div className="todo-metric">
            <span>남은 일</span>
            <strong>{openTodos.length}</strong>
          </div>
          <div className="todo-metric done">
            <span>완료한 일</span>
            <strong>{completedTodos.length}</strong>
          </div>
          <div className="todo-metric">
            <span>완료율</span>
            <strong>{completionRate}%</strong>
          </div>
        </div>

        <form className="form-stack todo-form" onSubmit={addTodo}>
          <label>
            할 일
            <input
              value={todoTitle}
              onChange={(event) => setTodoTitle(event.target.value)}
              placeholder="예: 주말 데이트 예약하기"
            />
          </label>
          <button type="submit">투두 추가</button>
        </form>
      </section>

      <TodoGroup
        title="남은 할 일"
        helper="둘이 같이 챙길 일을 먼저 보여줘요."
        todos={openTodos}
        emptyText="같이 할 일이 아직 없어요."
        onToggle={toggleTodo}
        onDelete={deleteTodo}
      />

      <details className="content-card completed-todo-panel">
        <summary>
          <span>완료한 일</span>
          <span className="count-badge">{completedTodos.length}</span>
        </summary>
        <TodoList
          todos={completedTodos}
          emptyText="완료한 일이 아직 없어요."
          onToggle={toggleTodo}
          onDelete={deleteTodo}
        />
      </details>
    </div>
  );
}

type TodoGroupProps = {
  title: string;
  helper: string;
  todos: TodoItem[];
  emptyText: string;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
};

function TodoGroup({
  title,
  helper,
  todos,
  emptyText,
  onToggle,
  onDelete,
}: TodoGroupProps) {
  return (
    <section className="content-card todo-group">
      <div className="section-heading todo-group-heading">
        <div>
          <h3>{title}</h3>
          <p>{helper}</p>
        </div>
        <span className="count-badge">{todos.length}</span>
      </div>
      <TodoList
        todos={todos}
        emptyText={emptyText}
        onToggle={onToggle}
        onDelete={onDelete}
      />
    </section>
  );
}
