import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { CoupleTodo } from "./domainTypes";
import {
  runAddEventWorkflow,
  runAddTodoWorkflow,
  runDeleteEventWorkflow,
  runDeleteTodoWorkflow,
  runToggleTodoWorkflow,
} from "./coupleMutationWorkflow";

describe("coupleMutationWorkflow", () => {
  it("deletes an event, reloads remote data, then broadcasts", async () => {
    const calls: string[] = [];
    const supabase = {} as SupabaseClient;

    const result = await runDeleteEventWorkflow({
      broadcastDataChanged: async () => {
        calls.push("broadcast");
      },
      deleteEvent: async (nextSupabase, id) => {
        calls.push(`delete:${nextSupabase === supabase}:${id}`);
        return { error: null };
      },
      id: "event-1",
      loadRemoteData: async (notice) => {
        calls.push(`load:${notice}`);
      },
      supabase,
    });

    expect(result).toEqual({ status: "deleted" });
    expect(calls).toEqual(["delete:true:event-1", "load:일정 삭제됨", "broadcast"]);
  });

  it("saves an event, reloads remote data, then broadcasts", async () => {
    const calls: string[] = [];

    const result = await runAddEventWorkflow({
      addEvent: async (_supabase, input) => {
        calls.push(`add:${input.title}:${input.startDate}:${input.endDate}:${input.time}:${input.memo}`);
        return { error: null };
      },
      broadcastDataChanged: async () => {
        calls.push("broadcast");
      },
      coupleCode: "S2-0526",
      endDate: "2026-05-27",
      loadRemoteData: async (notice) => {
        calls.push(`load:${notice}`);
      },
      memo: "memo",
      startDate: "2026-05-26",
      supabase: {} as SupabaseClient,
      time: "09:00",
      title: "date",
    });

    expect(result).toEqual({ status: "saved" });
    expect(calls).toEqual(["add:date:2026-05-26:2026-05-27:09:00:memo", "load:일정 저장됨", "broadcast"]);
  });

  it("saves a todo, reloads remote data, then broadcasts", async () => {
    const calls: string[] = [];

    const result = await runAddTodoWorkflow({
      addTodo: async (_supabase, input) => {
        calls.push(`add:${input.coupleCode}:${input.title}`);
        return { error: null };
      },
      broadcastDataChanged: async () => {
        calls.push("broadcast");
      },
      coupleCode: "S2-0526",
      loadRemoteData: async (notice) => {
        calls.push(`load:${notice}`);
      },
      supabase: {} as SupabaseClient,
      title: "pack",
    });

    expect(result).toEqual({ status: "saved" });
    expect(calls).toEqual(["add:S2-0526:pack", "load:투두 저장됨", "broadcast"]);
  });

  it("toggles the target todo, reloads remote data, then broadcasts", async () => {
    const calls: string[] = [];
    const todos: CoupleTodo[] = [
      { id: "todo-1", completed: false, createdAt: "2026-05-26T00:00:00.000Z", title: "pack" },
    ];

    const result = await runToggleTodoWorkflow({
      broadcastDataChanged: async () => {
        calls.push("broadcast");
      },
      id: "todo-1",
      loadRemoteData: async (notice) => {
        calls.push(`load:${notice}`);
      },
      supabase: {} as SupabaseClient,
      todos,
      updateTodoCompleted: async (_supabase, id, completed) => {
        calls.push(`toggle:${id}:${completed}`);
        return { error: null };
      },
    });

    expect(result).toEqual({ status: "updated" });
    expect(calls).toEqual(["toggle:todo-1:true", "load:투두 완료 상태 변경됨", "broadcast"]);
  });

  it("deletes a todo, reloads remote data, then broadcasts", async () => {
    const calls: string[] = [];

    const result = await runDeleteTodoWorkflow({
      broadcastDataChanged: async () => {
        calls.push("broadcast");
      },
      deleteTodo: async (_supabase, id) => {
        calls.push(`delete:${id}`);
        return { error: null };
      },
      id: "todo-1",
      loadRemoteData: async (notice) => {
        calls.push(`load:${notice}`);
      },
      supabase: {} as SupabaseClient,
    });

    expect(result).toEqual({ status: "deleted" });
    expect(calls).toEqual(["delete:todo-1", "load:투두 삭제됨", "broadcast"]);
  });

  it("skips reload and broadcast when a mutation returns an error", async () => {
    const calls: string[] = [];

    const result = await runDeleteEventWorkflow({
      broadcastDataChanged: async () => {
        calls.push("broadcast");
      },
      deleteEvent: async () => ({ error: new Error("delete failed") }),
      id: "event-1",
      loadRemoteData: async () => {
        calls.push("load");
      },
      supabase: {} as SupabaseClient,
    });

    expect(result).toEqual({ status: "failed" });
    expect(calls).toEqual([]);
  });

  it("skips toggle mutation when the todo is missing", async () => {
    const calls: string[] = [];

    const result = await runToggleTodoWorkflow({
      broadcastDataChanged: async () => {
        calls.push("broadcast");
      },
      id: "missing",
      loadRemoteData: async () => {
        calls.push("load");
      },
      supabase: {} as SupabaseClient,
      todos: [],
      updateTodoCompleted: async () => {
        calls.push("toggle");
        return { error: null };
      },
    });

    expect(result).toEqual({ status: "not-found" });
    expect(calls).toEqual([]);
  });
});
