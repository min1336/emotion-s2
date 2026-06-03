import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { sendPokeNotification } from "./pokeDelivery";

describe("pokeDelivery", () => {
  it("invokes the send-poke edge function with couple headers and payload", async () => {
    const calls: Array<{ name: string; options: unknown }> = [];
    const supabase = {
      functions: {
        async invoke(name: string, options: unknown) {
          calls.push({ name, options });
          return { data: { sent: 1 }, error: null };
        },
      },
    } as unknown as SupabaseClient;

    const result = await sendPokeNotification(supabase, {
      coupleCode: "S2-0526",
      coupleSecret: "secret",
      message: "안녕",
      pokeId: "message-1",
      senderId: "client-a",
      senderMemberKey: "jungseo",
      senderName: "정서",
    });

    expect(result).toEqual({ sent: 1 });
    expect(calls).toEqual([
      {
        name: "send-poke",
        options: {
          body: {
            coupleCode: "S2-0526",
            message: "안녕",
            pokeId: "message-1",
            senderId: "client-a",
            senderMemberKey: "jungseo",
            senderName: "정서",
          },
          headers: {
            "x-couple-code": "S2-0526",
            "x-couple-secret": "secret",
          },
        },
      },
    ]);
  });
});
