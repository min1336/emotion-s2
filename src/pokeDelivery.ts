import type { SupabaseClient } from "@supabase/supabase-js";
import type { MemberKey } from "./domainTypes";
import type { PushResult } from "./pushUtils";

type SendPokeNotificationInput = {
  coupleCode: string;
  coupleSecret: string;
  message: string;
  pokeId: string;
  senderId: string;
  senderMemberKey: MemberKey;
  senderName: string;
};

export async function sendPokeNotification(
  supabase: SupabaseClient,
  {
    coupleCode,
    coupleSecret,
    message,
    pokeId,
    senderId,
    senderMemberKey,
    senderName,
  }: SendPokeNotificationInput,
) {
  const { data, error } = await supabase.functions.invoke<PushResult>("send-poke", {
    body: {
      coupleCode,
      message,
      pokeId,
      senderId,
      senderMemberKey,
      senderName,
    },
    headers: {
      "x-couple-code": coupleCode,
      "x-couple-secret": coupleSecret,
    },
  });
  if (error) {
    throw error;
  }

  return data;
}
