import type { SupabaseClient } from "@supabase/supabase-js";
import {
  addCoupleEvent,
  addCoupleTodo,
  deleteCoupleEvent,
  deleteCoupleTodo,
  updateCoupleEvent,
  updateCoupleTodoCompleted,
} from "./coupleMutations";
import type { CoupleTodo } from "./domainTypes";

type MutationResult = { error: unknown | null };
type MaybeAsyncMutationResult = MutationResult | PromiseLike<MutationResult>;

type AddEventInput = {
  coupleCode: string;
  endDate: string;
  memo: string;
  startDate: string;
  time: string;
  title: string;
};

type UpdateEventInput = Omit<AddEventInput, "coupleCode"> & {
  id: string;
};

type AddTodoInput = {
  coupleCode: string;
  title: string;
};

type WorkflowDependencies = {
  broadcastDataChanged: () => Promise<void>;
  loadRemoteData: (notice: string) => Promise<void>;
  supabase: SupabaseClient;
};

type CompleteMutationOptions = {
  broadcastDataChanged: () => Promise<void>;
  loadRemoteData: (notice: string) => Promise<void>;
  notice: string;
};

async function completeMutation({ broadcastDataChanged, loadRemoteData, notice }: CompleteMutationOptions) {
  await loadRemoteData(notice);
  await broadcastDataChanged();
}

export async function runDeleteEventWorkflow({
  broadcastDataChanged,
  deleteEvent = deleteCoupleEvent,
  id,
  loadRemoteData,
  supabase,
}: WorkflowDependencies & {
  deleteEvent?: (supabase: SupabaseClient, id: string) => MaybeAsyncMutationResult;
  id: string;
}) {
  const { error } = await deleteEvent(supabase, id);
  if (error) {
    return { status: "failed" as const };
  }

  await completeMutation({ broadcastDataChanged, loadRemoteData, notice: "일정 삭제됨" });
  return { status: "deleted" as const };
}

export async function runAddEventWorkflow({
  addEvent = addCoupleEvent,
  broadcastDataChanged,
  coupleCode,
  endDate,
  loadRemoteData,
  memo,
  startDate,
  supabase,
  time,
  title,
}: WorkflowDependencies &
  AddEventInput & {
    addEvent?: (supabase: SupabaseClient, input: AddEventInput) => MaybeAsyncMutationResult;
  }) {
  const { error } = await addEvent(supabase, {
    coupleCode,
    endDate,
    memo,
    startDate,
    time,
    title,
  });
  if (error) {
    return { status: "failed" as const };
  }

  await completeMutation({ broadcastDataChanged, loadRemoteData, notice: "일정 저장됨" });
  return { status: "saved" as const };
}

export async function runUpdateEventWorkflow({
  broadcastDataChanged,
  endDate,
  id,
  loadRemoteData,
  memo,
  startDate,
  supabase,
  time,
  title,
  updateEvent = updateCoupleEvent,
}: WorkflowDependencies &
  UpdateEventInput & {
    updateEvent?: (supabase: SupabaseClient, input: UpdateEventInput) => MaybeAsyncMutationResult;
  }) {
  const { error } = await updateEvent(supabase, {
    endDate,
    id,
    memo,
    startDate,
    time,
    title,
  });
  if (error) {
    return { status: "failed" as const };
  }

  await completeMutation({ broadcastDataChanged, loadRemoteData, notice: "일정 수정됨" });
  return { status: "updated" as const };
}

export async function runAddTodoWorkflow({
  addTodo = addCoupleTodo,
  broadcastDataChanged,
  coupleCode,
  loadRemoteData,
  supabase,
  title,
}: WorkflowDependencies &
  AddTodoInput & {
    addTodo?: (supabase: SupabaseClient, input: AddTodoInput) => MaybeAsyncMutationResult;
  }) {
  const { error } = await addTodo(supabase, { coupleCode, title });
  if (error) {
    return { status: "failed" as const };
  }

  await completeMutation({ broadcastDataChanged, loadRemoteData, notice: "투두 저장됨" });
  return { status: "saved" as const };
}

export async function runToggleTodoWorkflow({
  broadcastDataChanged,
  id,
  loadRemoteData,
  supabase,
  todos,
  updateTodoCompleted = updateCoupleTodoCompleted,
}: WorkflowDependencies & {
  id: string;
  todos: CoupleTodo[];
  updateTodoCompleted?: (supabase: SupabaseClient, id: string, completed: boolean) => MaybeAsyncMutationResult;
}) {
  const target = todos.find((todo) => todo.id === id);
  if (!target) {
    return { status: "not-found" as const };
  }

  const { error } = await updateTodoCompleted(supabase, id, !target.completed);
  if (error) {
    return { status: "failed" as const };
  }

  await completeMutation({ broadcastDataChanged, loadRemoteData, notice: "투두 완료 상태 변경됨" });
  return { status: "updated" as const };
}

export async function runDeleteTodoWorkflow({
  broadcastDataChanged,
  deleteTodo = deleteCoupleTodo,
  id,
  loadRemoteData,
  supabase,
}: WorkflowDependencies & {
  deleteTodo?: (supabase: SupabaseClient, id: string) => MaybeAsyncMutationResult;
  id: string;
}) {
  const { error } = await deleteTodo(supabase, id);
  if (error) {
    return { status: "failed" as const };
  }

  await completeMutation({ broadcastDataChanged, loadRemoteData, notice: "투두 삭제됨" });
  return { status: "deleted" as const };
}
