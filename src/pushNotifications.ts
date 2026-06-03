import {
  bufferSourceToUint8Array,
  uint8ArrayToUrlBase64,
  urlBase64ToUint8Array,
} from "./pushUtils";

export type PokePermission = NotificationPermission | "unsupported";

const VAPID_PUBLIC_KEY =
  "BFmWl5dAGsXvNN5HErKBISVxg8Jp4YeKwn7pg11X5oFEZxBF28TNEeA0JjUqtLVIL_087uNjq8uvmTIWXrj5SsM";

type NotificationEnvironment = {
  Notification?: Pick<typeof Notification, "permission">;
};

type WebPushEnvironment = NotificationEnvironment & {
  navigator?: {
    serviceWorker?: unknown;
  };
  PushManager?: unknown;
};

export function getNotificationPermission(environment: NotificationEnvironment = globalThis): PokePermission {
  if (!environment.Notification) {
    return "unsupported";
  }

  return environment.Notification.permission;
}

export function isWebPushSupported(environment: WebPushEnvironment = globalThis) {
  return Boolean(environment.navigator?.serviceWorker && environment.PushManager && environment.Notification);
}

type RequestPokePermissionInput = {
  hasSelectedMember: boolean;
  isSupported?: () => boolean;
  requestPermission?: () => Promise<NotificationPermission>;
};

export async function requestPokePermission({
  hasSelectedMember,
  isSupported = isWebPushSupported,
  requestPermission = () => Notification.requestPermission(),
}: RequestPokePermissionInput): Promise<PokePermission | "missing-member"> {
  if (!hasSelectedMember) {
    return "missing-member";
  }

  if (!isSupported()) {
    return "unsupported";
  }

  return requestPermission();
}

export function isCurrentPushSubscription(
  subscription: PushSubscription,
  publicKey = VAPID_PUBLIC_KEY,
) {
  const applicationServerKey = subscription.options.applicationServerKey;
  if (!applicationServerKey) {
    return true;
  }

  return uint8ArrayToUrlBase64(bufferSourceToUint8Array(applicationServerKey)) === publicKey;
}

export async function getCurrentPushSubscription(
  registration: ServiceWorkerRegistration,
  forceRefresh = false,
  publicKey = VAPID_PUBLIC_KEY,
) {
  const existingSubscription = await registration.pushManager.getSubscription();
  if (existingSubscription) {
    if (!forceRefresh && isCurrentPushSubscription(existingSubscription, publicKey)) {
      return existingSubscription;
    }

    await existingSubscription.unsubscribe().catch(() => undefined);
  }

  return registration.pushManager.subscribe({
    applicationServerKey: urlBase64ToUint8Array(publicKey),
    userVisibleOnly: true,
  });
}
