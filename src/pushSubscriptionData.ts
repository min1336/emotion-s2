import type { SupabaseClient } from "@supabase/supabase-js";
import type { MemberKey } from "./domainTypes";

type SavePushSubscriptionRecordInput = {
  clientId: string;
  coupleCode: string;
  deviceKey: string;
  memberKey: MemberKey;
  now?: () => string;
  subscription: PushSubscription;
  userAgent: string;
};

type RemovePushSubscriptionRecordInput = {
  coupleCode: string;
  deviceKey: string;
};

type PushSubscriptionJson = {
  endpoint?: string;
  keys?: {
    auth?: string;
    p256dh?: string;
  };
};

export async function savePushSubscriptionRecord(
  supabase: SupabaseClient,
  {
    clientId,
    coupleCode,
    deviceKey,
    memberKey,
    now = () => new Date().toISOString(),
    subscription,
    userAgent,
  }: SavePushSubscriptionRecordInput,
) {
  const subscriptionJson = subscription.toJSON() as PushSubscriptionJson;
  if (!subscriptionJson.endpoint || !subscriptionJson.keys?.auth || !subscriptionJson.keys.p256dh) {
    return { error: null, isValid: false };
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      auth: subscriptionJson.keys.auth,
      client_id: clientId,
      couple_code: coupleCode,
      device_key: deviceKey,
      endpoint: subscriptionJson.endpoint,
      last_seen_at: now(),
      member_key: memberKey,
      p256dh: subscriptionJson.keys.p256dh,
      user_agent: userAgent,
    },
    { onConflict: "couple_code,device_key" },
  );

  return { error, isValid: true };
}

export async function removePushSubscriptionRecord(
  supabase: SupabaseClient,
  { coupleCode, deviceKey }: RemovePushSubscriptionRecordInput,
) {
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("couple_code", coupleCode)
    .eq("device_key", deviceKey);

  return { error };
}
