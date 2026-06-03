import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "supabase";
import webpush from "web-push";
import { createPushPayload } from "./payload.ts";

type PushSubscriptionRow = {
  client_id: string;
  device_key: string | null;
  id: string;
  member_key: string | null;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
};

type PushTargetGroup = {
  key: string;
  subscriptions: PushSubscriptionRow[];
};

type SendPokeBody = {
  coupleCode?: string;
  message?: string;
  pokeId?: string;
  senderMemberKey?: string;
  senderName?: string;
  senderId?: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-couple-code, x-couple-secret, x-member-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
);

const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") || "";
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") || "";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails("mailto:hello@emotion-s2.app", vapidPublicKey, vapidPrivateKey);
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

function getPushTargetKey(subscription: PushSubscriptionRow) {
  if (subscription.member_key) {
    return subscription.member_key;
  }

  if (subscription.device_key && subscription.device_key !== subscription.client_id) {
    return subscription.device_key;
  }

  return subscription.endpoint;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  if (!vapidPublicKey || !vapidPrivateKey) {
    return jsonResponse({ error: "Push notification keys are not configured" }, 500);
  }

  const body = (await req.json().catch(() => ({}))) as SendPokeBody;
  const coupleCode = body.coupleCode?.trim();
  const coupleSecret = req.headers.get("x-couple-secret")?.trim();
  const senderId = body.senderId?.trim();
  const senderMemberKey = body.senderMemberKey?.trim();
  const requestCode = req.headers.get("x-couple-code")?.trim();

  if (!coupleCode || !coupleSecret || !senderId || requestCode !== coupleCode) {
    return jsonResponse({ error: "Invalid couple request" }, 403);
  }

  const { data: couple, error: coupleError } = await supabase
    .from("couples")
    .select("code")
    .eq("code", coupleCode)
    .eq("invite_secret", coupleSecret)
    .maybeSingle();

  if (coupleError || !couple) {
    return jsonResponse({ error: "Invalid couple request" }, 403);
  }

  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("id,client_id,device_key,member_key,endpoint,p256dh,auth,user_agent,last_seen_at")
    .eq("couple_code", coupleCode)
    .order("last_seen_at", { ascending: false });

  if (error) {
    return jsonResponse({ error: "Could not load push subscriptions" }, 500);
  }

  const payload = createPushPayload({
    message: body.message,
    pokeId: body.pokeId,
    senderName: body.senderName,
  });

  const staleSubscriptionIds: string[] = [];
  const failedSubscriptionIds: string[] = [];
  const targetGroups = new Map<string, PushTargetGroup>();
  const targetSubscriptions = ((subscriptions || []) as PushSubscriptionRow[]).filter((subscription) => {
    if (senderMemberKey) {
      return Boolean(subscription.member_key) && subscription.member_key !== senderMemberKey;
    }

    return subscription.client_id !== senderId;
  });

  targetSubscriptions.forEach((subscription) => {
    const key = getPushTargetKey(subscription);
    const existingGroup = targetGroups.get(key);
    if (existingGroup) {
      existingGroup.subscriptions.push(subscription);
      return;
    }

    targetGroups.set(key, { key, subscriptions: [subscription] });
  });

  const results = await Promise.allSettled(
    Array.from(targetGroups.values()).map(async (group) => {
      for (const subscription of group.subscriptions) {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                auth: subscription.auth,
                p256dh: subscription.p256dh,
              },
            },
            payload,
          );

          return true;
        } catch (error) {
          const statusCode = (error as { statusCode?: number }).statusCode;
          failedSubscriptionIds.push(subscription.id);
          if (statusCode === 404 || statusCode === 410) {
            staleSubscriptionIds.push(subscription.id);
          }
        }
      }

      return false;
    }),
  );

  if (staleSubscriptionIds.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", staleSubscriptionIds);
  }

  const sent = results.filter((result) => result.status === "fulfilled" && result.value).length;

  return jsonResponse({
    sent,
    attempted: targetGroups.size,
    failed: failedSubscriptionIds.length,
    removed: staleSubscriptionIds.length,
  });
});
