type ClipboardNavigator = {
  clipboard?: {
    writeText?: (text: string) => Promise<void>;
  };
};

type ShareNavigator = {
  share?: (data: ShareData) => Promise<void>;
};

type ServiceWorkerNavigator = {
  serviceWorker?: {
    addEventListener?: (type: "controllerchange" | "message", listener: EventListener) => void;
    controller?: {
      postMessage: (message: unknown) => void;
    } | null;
    ready: Promise<{
      showNotification: (title: string, options?: NotificationOptions) => Promise<void>;
    }>;
    removeEventListener?: (type: "controllerchange" | "message", listener: EventListener) => void;
  };
};

type OnlineNavigator = {
  onLine: boolean;
};

type UserAgentNavigator = {
  userAgent: string;
};

type VibrateNavigator = {
  vibrate?: (pattern: VibratePattern) => boolean;
};

type WindowConfirm = {
  confirm: (message?: string) => boolean;
};

export function getClipboardTextWriter(navigatorLike: ClipboardNavigator = navigator) {
  const writeText = navigatorLike.clipboard?.writeText;
  return writeText ? (text: string) => writeText.call(navigatorLike.clipboard, text) : undefined;
}

export function getShareInvoker(navigatorLike: ShareNavigator = navigator) {
  const share = navigatorLike.share;
  return share ? (shareData: ShareData) => share.call(navigatorLike, shareData) : undefined;
}

export function getServiceWorkerNotificationPresenter(navigatorLike: ServiceWorkerNavigator = navigator) {
  if (!navigatorLike.serviceWorker) {
    return undefined;
  }

  return async (title: string, options?: NotificationOptions) => {
    const registration = await navigatorLike.serviceWorker?.ready;
    await registration?.showNotification(title, options);
  };
}

export function addServiceWorkerMessageListener(
  listener: (event: MessageEvent) => void,
  navigatorLike: ServiceWorkerNavigator = navigator,
) {
  const serviceWorker = navigatorLike.serviceWorker;
  if (!serviceWorker?.addEventListener || !serviceWorker.removeEventListener) {
    return () => undefined;
  }

  const eventListener = listener as EventListener;
  serviceWorker.addEventListener("message", eventListener);
  return () => serviceWorker.removeEventListener?.("message", eventListener);
}

export function notifyServiceWorkerActiveTab(tab: string, navigatorLike: ServiceWorkerNavigator = navigator) {
  const controller = navigatorLike.serviceWorker?.controller;
  if (!controller) {
    return false;
  }

  controller.postMessage({ type: "active-tab-change", tab });
  return true;
}

export function onServiceWorkerControllerChange(
  listener: () => void,
  navigatorLike: ServiceWorkerNavigator = navigator,
) {
  const serviceWorker = navigatorLike.serviceWorker;
  if (!serviceWorker?.addEventListener || !serviceWorker.removeEventListener) {
    return () => undefined;
  }

  const eventListener = listener as EventListener;
  serviceWorker.addEventListener("controllerchange", eventListener);
  return () => serviceWorker.removeEventListener?.("controllerchange", eventListener);
}

type WindowNotificationCtor = new (title: string, options?: NotificationOptions) => unknown;

export function showWindowNotification(
  title: string,
  options?: NotificationOptions,
  NotificationCtor: WindowNotificationCtor = Notification,
) {
  new NotificationCtor(title, options);
}

export function confirmWithWindow(message: string, windowLike: WindowConfirm = window) {
  return windowLike.confirm(message);
}

export function getBrowserOnlineStatus(navigatorLike: OnlineNavigator = navigator) {
  return navigatorLike.onLine;
}

export function getBrowserUserAgent(navigatorLike: UserAgentNavigator = navigator) {
  return navigatorLike.userAgent;
}

export function vibrateDevice(pattern: VibratePattern, navigatorLike: VibrateNavigator = navigator) {
  navigatorLike.vibrate?.(pattern);
}
