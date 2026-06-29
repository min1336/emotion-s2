import { describe, expect, it } from "vitest";
import type { SyncChannel } from "./realtimeChannel";
import { setupCoupleRealtimeSubscription } from "./realtimeSubscription";

function createRecordedChannel() {
  const handlers: Array<{ callback: (payload?: unknown) => void; filter: Record<string, string>; type: string }> = [];
  let subscribeHandler: ((status: string) => void) | null = null;
  const tracked: unknown[] = [];
  const channel: SyncChannel = {
    on: (type, filter, callback) => {
      handlers.push({ callback: callback as (payload?: unknown) => void, filter, type });
      return channel;
    },
    subscribe: (callback) => {
      subscribeHandler = callback;
      return channel;
    },
    send: async () => undefined,
    track: async (payload) => {
      tracked.push(payload);
    },
    presenceState: () => ({}),
  };

  return { channel, handlers, subscribe: (status: string) => subscribeHandler?.(status), tracked };
}

describe("realtimeSubscription", () => {
  it("registers realtime handlers and ignores self broadcasts", () => {
    const { channel, handlers } = createRecordedChannel();
    const notices: string[] = [];
    const messagePayloads: unknown[] = [];

    setupCoupleRealtimeSubscription({
      clientId: "client-1",
      coupleCode: "S2-0526",
      createSyncChannel: () => ({ rawChannel: channel, syncChannel: channel }),
      handleMessageInsert: (payload) => messagePayloads.push(payload),
      onDisconnected: () => undefined,
      onSubscribed: () => undefined,
      queueRealtimeReconnect: () => undefined,
      reconnectTimerRef: { current: null },
      scheduleRemoteSync: (notice) => notices.push(notice),
      selectedMemberKey: "jungseo",
      supabase: { channel: () => channel, removeChannel: () => undefined },
      syncChannelRef: { current: null },
      syncDebounceRef: { current: null },
    });

    expect(handlers.map((handler) => [handler.type, handler.filter.table || handler.filter.event])).toEqual([
      ["broadcast", "data-changed"],
      ["postgres_changes", "couple_events"],
      ["postgres_changes", "couple_photos"],
      ["postgres_changes", "couple_todos"],
      ["postgres_changes", "couple_messages"],
    ]);

    handlers[0].callback({ payload: { sourceId: "client-1" } });
    handlers[0].callback({ payload: { sourceId: "other-client" } });
    handlers[4].callback({ new: { id: "message-1" } });

    expect(notices).toEqual(["상대방 변경 반영됨"]);
    expect(messagePayloads).toEqual([{ new: { id: "message-1" } }]);
  });

  it("tracks presence on subscribed and ignores stale callbacks after cleanup", () => {
    const { channel, handlers, subscribe, tracked } = createRecordedChannel();
    const statuses: string[] = [];
    const notices: string[] = [];
    const messagePayloads: unknown[] = [];
    const syncChannelRef = { current: null as SyncChannel | null };

    const cleanup = setupCoupleRealtimeSubscription({
      clientId: "client-1",
      coupleCode: "S2-0526",
      createSyncChannel: () => ({ rawChannel: channel, syncChannel: channel }),
      handleMessageInsert: (payload) => messagePayloads.push(payload),
      now: () => "2026-05-26T00:00:00.000Z",
      onDisconnected: () => statuses.push("disconnected"),
      onSubscribed: () => statuses.push("connected"),
      queueRealtimeReconnect: () => statuses.push("reconnect"),
      reconnectTimerRef: { current: null },
      scheduleRemoteSync: (notice) => notices.push(notice),
      selectedMemberKey: "minhyeok",
      supabase: { channel: () => channel, removeChannel: () => undefined },
      syncChannelRef,
      syncDebounceRef: { current: null },
    });

    subscribe("SUBSCRIBED");
    cleanup();
    subscribe("CHANNEL_ERROR");
    handlers[0].callback({ payload: { sourceId: "other-client" } });
    handlers[4].callback({ new: { id: "message-1" } });

    expect(statuses).toEqual(["connected"]);
    expect(notices).toEqual([]);
    expect(messagePayloads).toEqual([]);
    expect(tracked).toEqual([
      {
        clientId: "client-1",
        memberKey: "minhyeok",
        onlineAt: "2026-05-26T00:00:00.000Z",
      },
    ]);
    expect(syncChannelRef.current).toBeNull();
  });

  it("cleans timers and removes the raw channel", () => {
    const { channel } = createRecordedChannel();
    const clearedTimers: number[] = [];
    const removedChannels: unknown[] = [];
    const syncChannelRef = { current: null as SyncChannel | null };
    const reconnectTimerRef = { current: 1 as number | null };
    const syncDebounceRef = { current: 2 as number | null };

    const cleanup = setupCoupleRealtimeSubscription({
      clearTimeout: (timer) => clearedTimers.push(timer),
      clientId: "client-1",
      coupleCode: "S2-0526",
      createSyncChannel: () => ({ rawChannel: channel, syncChannel: channel }),
      handleMessageInsert: () => undefined,
      onDisconnected: () => undefined,
      onSubscribed: () => undefined,
      queueRealtimeReconnect: () => undefined,
      reconnectTimerRef,
      scheduleRemoteSync: () => undefined,
      selectedMemberKey: "",
      supabase: {
        channel: () => channel,
        removeChannel: (rawChannel) => removedChannels.push(rawChannel),
      },
      syncChannelRef,
      syncDebounceRef,
    });

    cleanup();

    expect(clearedTimers).toEqual([1, 2]);
    expect(reconnectTimerRef.current).toBeNull();
    expect(syncDebounceRef.current).toBeNull();
    expect(removedChannels).toEqual([channel]);
  });
});
