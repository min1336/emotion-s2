import { formatCount } from "./dateUtils";
import { EventList, TodoList } from "./listComponents";

type Tab = "home" | "calendar" | "chat" | "todos";

type HomeEvent = {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  time?: string;
  memo?: string;
};

type HomeTodo = {
  id: string;
  title: string;
  completed: boolean;
};

type HomeViewProps = {
  relationshipElapsed: { days: number; hours: number };
  todayEvents: HomeEvent[];
  weekEvents: HomeEvent[];
  openTodos: HomeTodo[];
  setActiveTab: (tab: Tab) => void;
};

export function HomeView({
  relationshipElapsed,
  todayEvents,
  weekEvents,
  openTodos,
  setActiveTab,
}: HomeViewProps) {
  return (
    <div className="screen-stack">
      <section className="hero-card home-hero">
        <div className="hero-main">
          <div>
            <p className="section-label">우리의 시간</p>
            <h2>D+{formatCount(relationshipElapsed.days)}</h2>
            <div className="love-counter" aria-label={`함께한 시간 ${formatCount(relationshipElapsed.hours)}시간`}>
              <span>{formatCount(relationshipElapsed.hours)}시간</span>
            </div>
            <p>2025년 5월 28일부터 함께하는 중이에요.</p>
          </div>
        </div>
      </section>
      <section className="content-card">
        <div className="section-heading">
          <h3>오늘의 약속</h3>
          <button type="button" className="text-button" onClick={() => setActiveTab("calendar")}>
            캘린더 보기
          </button>
        </div>
        <EventList events={todayEvents} emptyText="아직 오늘의 약속이 없어요." />
      </section>

      <section className="content-card">
        <div className="section-heading">
          <h3>이번 주 일정</h3>
        </div>
        <EventList events={weekEvents.slice(0, 4)} emptyText="이번 주는 둘만의 여유가 있어요." />
      </section>

      <section className="content-card">
        <div className="section-heading">
          <h3>같이 할 일</h3>
          <button type="button" className="text-button" onClick={() => setActiveTab("todos")}>
            투두 보기
          </button>
        </div>
        <TodoList todos={openTodos.slice(0, 4)} emptyText="둘이 같이 할 일이 아직 없어요." />
      </section>
    </div>
  );
}
