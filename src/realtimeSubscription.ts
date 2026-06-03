import { createCoupleSyncChannel, type SyncChannel } from "./realtimeChannel";

type Ref<T> = {
  current: T;
};

type SupabaseRealtimeClient<TRawChannel> = {
  channel: (name: string) => TRawChannel;
  removeChannel: (channel: TRawChannel) => unknown;
};

type SetupCoupleRealtimeSubscriptionInput<TRawChannel> = {
  clearTimeout?: (timer: number) => void;
  clientId: string;
  coupleCode: string;
  createSyncChannel?: typeof createCoupleSyncChannel<TRawChannel>;
  handleMessageInsert: (payload?: unknown) => void;
  now?: () => string;
  onDisconnected: () => void;
  onSubscribed: () => void;
  queueRealtimeReconnect: () => void;
  reconnectTimerRef: Ref<number | null>;
  scheduleRemoteSync: (notice: string) => void;
  selectedMemberKey: string;
  supabase: SupabaseRealtimeClient<TRawChannel>;
  syncChannelRef: Ref<SyncChannel | null>;
  syncDebounceRef: Ref<number | null>;
};

export function setupCoupleRealtimeSubscription<TRawChannel>({
  clearTimeout = (timer) => window.clearTimeout(timer),
  clientId,
  coupleCode,
  createSyncChannel = createCoupleSyncChannel<TRawChannel>,
  handleMessageInsert,
  now = () => new Date().toISOString(),
  onDisconnected,
  onSubscribed,
  queueRealtimeReconnect,
  reconnectTimerRef,
  scheduleRemoteSync,
  selectedMemberKey,
  supabase,
  syncChannelRef,
  syncDebounceRef,
}: SetupCoupleRealtimeSubscriptionInput<TRawChannel>) {
  let isActiveChannel = true;
  const { rawChannel, syncChannel } = createSyncChannel(supabase, coupleCode);
  const isCurrentChannel = () => isActiveChannel && syncChannelRef.current === syncChannel;

  syncChannel
    .on("broadcast", { event: "data-changed" }, (message) => {
      if (!isCurrentChannel()) {
        return;
      }

      const payload = message?.payload;
      if (payload?.sourceId === clientId) {
        return;
      }

      scheduleRemoteSync("상대방 변경 반영됨");
    })
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "couple_events", filter: `couple_code=eq.${coupleCode}` },
      () => {
        if (isCurrentChannel()) {
          scheduleRemoteSync("변경사항 반영됨");
        }
      },
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "couple_photos", filter: `couple_code=eq.${coupleCode}` },
      () => {
        if (isCurrentChannel()) {
          scheduleRemoteSync("사진 변경사항 반영됨");
        }
      },
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "couple_todos", filter: `couple_code=eq.${coupleCode}` },
      () => {
        if (isCurrentChannel()) {
          scheduleRemoteSync("변경사항 반영됨");
        }
      },
    )
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "couple_messages", filter: `couple_code=eq.${coupleCode}` },
      (payload) => {
        if (isCurrentChannel()) {
          handleMessageInsert(payload);
        }
      },
    )
    .subscribe((status) => {
      if (!isCurrentChannel()) {
        return;
      }

      if (status === "SUBSCRIBED") {
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
        onSubscribed();
        syncChannel.track({
          clientId,
          memberKey: selectedMemberKey || undefined,
          onlineAt: now(),
        });
        return;
      }

      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        onDisconnected();
        queueRealtimeReconnect();
      }
    });
  syncChannelRef.current = syncChannel;

  return () => {
    isActiveChannel = false;
    if (syncChannelRef.current === syncChannel) {
      syncChannelRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (syncDebounceRef.current) {
      clearTimeout(syncDebounceRef.current);
      syncDebounceRef.current = null;
    }
    supabase.removeChannel(rawChannel);
  };
}
