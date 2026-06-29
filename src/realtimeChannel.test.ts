import { describe, expect, it } from "vitest";
import { createCoupleSyncChannel, sendDataChangedBroadcast, type SyncChannel } from "./realtimeChannel";

function createTestChannel() {
  const sentPayloads: unknown[] = [];
  const channel: SyncChannel = {
    on: () => channel,
    subscribe: () => channel,
    send: async (payload) => {
      sentPayloads.push(payload);
    },
    track: async () => undefined,
    presenceState: () => ({}),
  };

  return { channel, sentPayloads };
}

describe("realtimeChannel", () => {
  it("creates the couple sync channel with the expected topic", () => {
    const { channel } = createTestChannel();
    const channelNames: string[] = [];
    const supabase = {
      channel: (name: string) => {
        channelNames.push(name);
        return channel;
      },
    };

    const result = createCoupleSyncChannel(supabase, "S2-0526");

    expect(channelNames).toEqual(["couple-S2-0526"]);
    expect(result.rawChannel).toBe(channel);
    expect(result.syncChannel).toBe(channel);
  });

  it("sends a data-changed broadcast payload", async () => {
    const { channel, sentPayloads } = createTestChannel();

    await sendDataChangedBroadcast(channel, "client-1", "2026-06-01T00:00:00.000Z");

    expect(sentPayloads).toEqual([
      {
        type: "broadcast",
        event: "data-changed",
        payload: {
          changedAt: "2026-06-01T00:00:00.000Z",
          sourceId: "client-1",
        },
      },
    ]);
  });
});
