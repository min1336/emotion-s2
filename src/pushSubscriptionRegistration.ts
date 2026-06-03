import type { SupabaseClient } from "@supabase/supabase-js";
import type { MemberKey } from "./domainTypes";
import { getCurrentPushSubscription } from "./pushNotifications";
import { savePushSubscriptionRecord } from "./pushSubscriptionData";

type SaveRecordInput = {
  clientId: string;
  coupleCode: string;
  deviceKey: string;
  memberKey: MemberKey;
  subscription: PushSubscription;
  userAgent: string;
};

type RegisterPushSubscriptionInput = {
  clientId: string;
  coupleCode: string;
  deviceKey: string;
  forceRefresh: boolean;
  getServiceWorkerRegistration?: () => Promise<ServiceWorkerRegistration>;
  getSubscription?: typeof getCurrentPushSubscription;
  memberKey: MemberKey;
  saveRecord?: (
    supabase: SupabaseClient,
    input: SaveRecordInput,
  ) => Promise<{ error: unknown; isValid: boolean }>;
  supabase: SupabaseClient;
  userAgent: string;
};

type RegisterPushSubscriptionResult =
  | { status: "saved" }
  | { status: "invalid" }
  | { error: unknown; status: "save-error" }
  | { status: "failed" };

export async function registerPushSubscription({
  clientId,
  coupleCode,
  deviceKey,
  forceRefresh,
  getServiceWorkerRegistration = () => navigator.serviceWorker.ready,
  getSubscription = getCurrentPushSubscription,
  memberKey,
  saveRecord = savePushSubscriptionRecord,
  supabase,
  userAgent,
}: RegisterPushSubscriptionInput): Promise<RegisterPushSubscriptionResult> {
  try {
    const registration = await getServiceWorkerRegistration();
    const subscription = await getSubscription(registration, forceRefresh);
    const { error, isValid } = await saveRecord(supabase, {
      clientId,
      coupleCode,
      deviceKey,
      memberKey,
      subscription,
      userAgent,
    });

    if (!isValid) {
      return { status: "invalid" };
    }

    if (error) {
      return { error, status: "save-error" };
    }

    return { status: "saved" };
  } catch {
    return { status: "failed" };
  }
}
