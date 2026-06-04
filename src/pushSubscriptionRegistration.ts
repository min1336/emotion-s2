import type { SupabaseClient } from "@supabase/supabase-js";
import type { MemberKey } from "./domainTypes";
import {
  getCurrentPushSubscription,
  unsubscribeCurrentPushSubscription,
} from "./pushNotifications";
import {
  removePushSubscriptionRecord,
  savePushSubscriptionRecord,
} from "./pushSubscriptionData";

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

type RemoveRecordInput = {
  coupleCode: string;
  deviceKey: string;
};

type UnregisterPushSubscriptionInput = {
  coupleCode: string;
  deviceKey: string;
  getServiceWorkerRegistration?: () => Promise<ServiceWorkerRegistration>;
  removeRecord?: (
    supabase: SupabaseClient,
    input: RemoveRecordInput,
  ) => Promise<{ error: unknown }>;
  supabase: SupabaseClient;
  unsubscribe?: (registration: ServiceWorkerRegistration) => Promise<boolean>;
};

type UnregisterPushSubscriptionResult =
  | { status: "removed" }
  | { error: unknown; status: "remove-error" }
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

export async function unregisterPushSubscription({
  coupleCode,
  deviceKey,
  getServiceWorkerRegistration = () => navigator.serviceWorker.ready,
  removeRecord = removePushSubscriptionRecord,
  supabase,
  unsubscribe = unsubscribeCurrentPushSubscription,
}: UnregisterPushSubscriptionInput): Promise<UnregisterPushSubscriptionResult> {
  try {
    const registration = await getServiceWorkerRegistration();
    await unsubscribe(registration);
    const { error } = await removeRecord(supabase, { coupleCode, deviceKey });
    if (error) {
      return { error, status: "remove-error" };
    }

    return { status: "removed" };
  } catch {
    return { status: "failed" };
  }
}
