import type { PokePermission } from "./pushNotifications";

export const CHAT_NOTIFICATION_TITLE = "정서 S2 민혁";
export const SERVICE_WORKER_CHAT_NOTIFICATION_OPTIONS = {
  badge: "/icon-192.png",
  data: { url: "/?tab=chat" },
  icon: "/icon-192.png",
  tag: "couple-chat",
} satisfies Omit<NotificationOptions, "body">;
export const WINDOW_CHAT_NOTIFICATION_OPTIONS = {
  icon: "/icon-192.png",
} satisfies Omit<NotificationOptions, "body">;

type ChatNotificationDeliveryEnvironment = {
  getPermission: () => PokePermission;
  isDocumentHidden: () => boolean;
  showServiceWorkerNotification?: (title: string, options: NotificationOptions) => Promise<void>;
  showWindowNotification?: (title: string, options: NotificationOptions) => void;
};

type ChatNotificationDeliveryStatus = "skipped" | "service-worker" | "window";

export function shouldAlertForIncomingChatMessage(_input: {
  activeTab: string;
  isDocumentHidden: boolean;
}) {
  return true;
}

export async function showChatNotificationIfNeeded(
  message: string,
  {
    getPermission,
    showServiceWorkerNotification,
    showWindowNotification,
  }: ChatNotificationDeliveryEnvironment,
): Promise<ChatNotificationDeliveryStatus> {
  if (getPermission() !== "granted") {
    return "skipped";
  }

  if (showServiceWorkerNotification) {
    await showServiceWorkerNotification(CHAT_NOTIFICATION_TITLE, {
      ...SERVICE_WORKER_CHAT_NOTIFICATION_OPTIONS,
      body: message,
    });
    return "service-worker";
  }

  if (showWindowNotification) {
    showWindowNotification(CHAT_NOTIFICATION_TITLE, {
      ...WINDOW_CHAT_NOTIFICATION_OPTIONS,
      body: message,
    });
    return "window";
  }

  return "skipped";
}
