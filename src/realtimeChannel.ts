export type SyncBroadcastPayload = {
  payload?: {
    changedAt: string;
    sourceId: string;
  };
};

export type SyncPostgresPayload = {
  new?: {
    body?: string | null;
    id?: string;
    media_file_name?: string | null;
    media_mime_type?: string | null;
    media_size?: number | null;
    media_storage_path?: string | null;
    sender_id?: string;
    sender_member_key?: string | null;
    message_type?: string;
    created_at?: string;
  };
};

export type SyncChannel = {
  on: (
    type: "broadcast" | "presence" | "postgres_changes",
    filter: Record<string, string>,
    callback: (payload?: SyncBroadcastPayload & SyncPostgresPayload) => void,
  ) => SyncChannel;
  subscribe: (callback: (status: string) => void) => SyncChannel;
  send: (payload: {
    type: "broadcast";
    event: "data-changed";
    payload: { changedAt: string; sourceId: string };
  }) => Promise<unknown>;
  track: (payload: { clientId: string; memberKey?: string; onlineAt: string }) => Promise<unknown>;
  presenceState: () => Record<string, Array<{ clientId?: string }>>;
};

type SupabaseChannelFactory<TRawChannel> = {
  channel: (name: string) => TRawChannel;
};

export function createCoupleSyncChannel<TRawChannel>(
  supabase: SupabaseChannelFactory<TRawChannel>,
  coupleCode: string,
) {
  const rawChannel = supabase.channel(`couple-${coupleCode}`);

  return {
    rawChannel,
    syncChannel: rawChannel as unknown as SyncChannel,
  };
}

export function sendDataChangedBroadcast(
  channel: Pick<SyncChannel, "send">,
  sourceId: string,
  changedAt = new Date().toISOString(),
) {
  return channel.send({
    type: "broadcast",
    event: "data-changed",
    payload: { changedAt, sourceId },
  });
}
