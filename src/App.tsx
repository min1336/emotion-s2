import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { normalizeCoupleCode, normalizeCoupleSecret } from "./coupleAccess";
import { createCoupleSpaceRecords, findCoupleByCode } from "./coupleAccessData";
import { createCoupleClient } from "./supabaseClient";
import {
  buildInviteLink,
  getInitialCodeInput,
  getInitialSecretInput,
  getInitialTab,
} from "./urlState";
import {
  compareMessagesOldestFirst,
  isMessageFromCurrentMember,
  markChatMessageFailed,
  mergeChatMessages,
  replaceChatMessage,
} from "./chatUtils";
import {
  clearCoupleMember,
  clearCoupleSession,
  getStoredCoupleMember,
  getStoredCoupleSession,
  saveCoupleMember,
  saveCoupleSession,
} from "./coupleSessionStorage";
import {
  fetchRecentMessages,
  signChatMediaMessages as signChatMediaMessageUrls,
} from "./coupleData";
import { reactToCoupleMessage } from "./coupleMutations";
import { generateCoupleCode, generateCoupleSecret } from "./coupleCodeUtils";
import {
  HOUR_MS,
  dateFromKey,
  getMonthGrid,
  getRelationshipElapsed,
  getWeekRange,
  normalizeDateRange,
  toDateKey,
  type DateRange,
} from "./dateUtils";
import {
  getChatMediaExtension,
  getChatMediaLabel,
  getChatMessageText,
} from "./mediaUtils";
import { getChatMediaUploadSelection } from "./chatMediaSelection";
import type {
  ChatMessage,
  CoupleEvent,
  CouplePhoto,
  CoupleTodo,
  MemberKey,
} from "./domainTypes";
import { sortEvents, sortTodos } from "./listUtils";
import {
  sendMediaChatWorkflow,
  sendTextChatWorkflow,
} from "./chatSendWorkflow";
import {
  getNotificationPermission,
  isWebPushSupported,
  requestPokePermission,
  type PokePermission,
} from "./pushNotifications";
import { showChatNotificationIfNeeded } from "./chatNotificationDelivery";
import { registerPushSubscription } from "./pushSubscriptionRegistration";
import {
  createOptimisticMediaMessage,
  createOptimisticTextMessage,
} from "./optimisticChatMessages";
import { getMemberDisplayName, memberProfiles } from "./profileUtils";
import { TabButton } from "./listComponents";
import { SettingsPanel } from "./settingsPanel";
import { HomeView } from "./homeView";
import { TodoView } from "./todoView";
import { ScheduleModal } from "./scheduleModal";
import { PhotoModal } from "./photoModal";
import { ChatView } from "./chatView";
import { CalendarView } from "./calendarView";
import { CalendarMemoryDemo, isCalendarDemoMode } from "./calendarDemo";
import {
  sendDataChangedBroadcast,
  type SyncChannel,
} from "./realtimeChannel";
import { setupCoupleRealtimeSubscription } from "./realtimeSubscription";
import {
  getPushDeviceKey,
} from "./storageUtils";
import { getPhotoUploadSelection } from "./photoSelection";
import { runPhotoUploadWorkflow } from "./photoUploadWorkflow";
import { runPhotoDeleteWorkflow } from "./photoDeleteWorkflow";
import { mapRealtimeMessagePayload, type RealtimeMessagePayload } from "./rowMappers";
import { getInitialCoupleState, type JoinMode } from "./initialCoupleState";
import {
  getEventsForDate,
  getEventsOverlappingRange,
  groupPhotosByDate,
  splitTodosByCompletion,
} from "./viewData";
import {
  copyInviteLinkWithFallback,
  shareInviteLinkWithFallback,
} from "./inviteActions";
import {
  addServiceWorkerMessageListener,
  confirmWithWindow,
  getBrowserOnlineStatus,
  getBrowserUserAgent,
  getClipboardTextWriter,
  getServiceWorkerNotificationPresenter,
  getShareInvoker,
  showWindowNotification,
  vibrateDevice,
} from "./browserAdapters";
import {
  runAddEventWorkflow,
  runAddTodoWorkflow,
  runDeleteEventWorkflow,
  runDeleteTodoWorkflow,
  runToggleTodoWorkflow,
} from "./coupleMutationWorkflow";
import { runRemoteDataLoad } from "./remoteDataLoader";
import { copyTextWithTextarea } from "./clipboardFallback";
import { updateAppViewportMetrics, useAppViewportHeight } from "./appViewport";

type Tab = "home" | "calendar" | "chat" | "todos";
type RealtimeStatus = "connecting" | "connected" | "syncing" | "stale" | "offline" | "disconnected";

const PUSH_DEVICE_STORAGE_KEY = "couple-push-device-key";
const DEFAULT_COUPLE_CODE = "S2-0526";
const MAX_SEEN_CHAT_IDS = 300;
const CHAT_POLL_CONNECTED_MS = 8_000;
const CHAT_POLL_RECOVERY_MS = 3_000;
const RECENT_MESSAGE_OVERLAP_MS = 15_000;
const RECONNECT_ALERT_AFTER_ATTEMPTS = 10;

export default function App() {
  const todayKey = toDateKey(new Date());
  const isDemoMode = isCalendarDemoMode(window.location.search);
  const initialCodeInput = getInitialCodeInput(window.location.search);
  const initialSecretInput = getInitialSecretInput(window.location.search);
  const { coupleCode: storedCoupleCode, coupleSecret: storedCoupleSecret } = getStoredCoupleSession(localStorage);
  const initialCoupleState = getInitialCoupleState({
    initialCodeInput,
    initialSecretInput,
    storedCoupleCode,
    storedCoupleSecret,
  });
  const [activeTab, setActiveTab] = useState<Tab>(() => getInitialTab(window.location.search));
  const [coupleCode, setCoupleCode] = useState(() => initialCoupleState.coupleCode);
  const [coupleSecret, setCoupleSecret] = useState(() => initialCoupleState.coupleSecret);
  const [joinMode, setJoinMode] = useState<JoinMode>(initialCoupleState.joinMode);
  const [codeInput, setCodeInput] = useState(initialCoupleState.codeInput);
  const [secretInput, setSecretInput] = useState(initialCoupleState.secretInput);
  const [selectedMemberKey, setSelectedMemberKey] = useState<MemberKey | "">(() => getStoredCoupleMember(localStorage));
  const [events, setEvents] = useState<CoupleEvent[]>([]);
  const [photos, setPhotos] = useState<CouplePhoto[]>([]);
  const [todos, setTodos] = useState<CoupleTodo[]>([]);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [visibleMonth, setVisibleMonth] = useState(() => dateFromKey(todayKey));
  const [scheduleRange, setScheduleRange] = useState<DateRange | null>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventMemo, setEventMemo] = useState("");
  const [todoTitle, setTodoTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingChatMedia, setIsUploadingChatMedia] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>("connecting");
  const [connectionAlertMessage, setConnectionAlertMessage] = useState("");
  const [isOnline, setIsOnline] = useState(() => getBrowserOnlineStatus());
  const [relationshipTick, setRelationshipTick] = useState(() => Date.now());
  const [chatMessage, setChatMessage] = useState("");
  const [replyTargetMessageId, setReplyTargetMessageId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [notificationPermission, setNotificationPermission] = useState<PokePermission>(() =>
    getNotificationPermission(),
  );
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [isRegisteringPush, setIsRegisteringPush] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [photoModalIndex, setPhotoModalIndex] = useState<number | null>(null);
  const syncChannelRef = useRef<SyncChannel | null>(null);
  const clientIdRef = useRef(getPushDeviceKey(localStorage, PUSH_DEVICE_STORAGE_KEY));
  const pushDeviceKeyRef = useRef(clientIdRef.current);
  const syncRequestIdRef = useRef(0);
  const syncDebounceRef = useRef<number | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptRef = useRef(0);
  const connectionAlertShownRef = useRef(false);
  const scheduleRangeAnchorRef = useRef<string | null>(null);
  const seenMessageIdsRef = useRef<Set<string>>(new Set());
  const lastMessageCheckedAtRef = useRef(new Date().toISOString());
  const chatMessageRef = useRef("");
  const [realtimeRetryKey, setRealtimeRetryKey] = useState(0);
  useAppViewportHeight(activeTab);

  const supabase = useMemo(
    () => (coupleCode && coupleSecret ? createCoupleClient(coupleCode, coupleSecret, selectedMemberKey) : null),
    [coupleCode, coupleSecret, selectedMemberKey],
  );

  const signChatMediaMessages = useCallback(
    async (rows: ChatMessage[]) => {
      if (!supabase) {
        return rows;
      }

      return signChatMediaMessageUrls(supabase, rows);
    },
    [supabase],
  );

  const loadRemoteData = useCallback(async (notice = "방금 동기화됨") => {
    await runRemoteDataLoad({
      coupleCode,
      coupleSecret,
      latestMessageCheckedAtRef: lastMessageCheckedAtRef,
      notice,
      requestIdRef: syncRequestIdRef,
      setEvents,
      setIsLoading,
      setMessages,
      setPhotos,
      setStatusMessage,
      setTodos,
      signChatMediaMessages,
      storage: localStorage,
      supabase,
    });
  }, [coupleCode, coupleSecret, signChatMediaMessages, supabase]);

  const scheduleRemoteSync = useCallback(
    (notice = "변경사항 반영됨") => {
      if (syncDebounceRef.current) {
        window.clearTimeout(syncDebounceRef.current);
      }

      syncDebounceRef.current = window.setTimeout(() => {
        syncDebounceRef.current = null;
        loadRemoteData(notice);
      }, 350);
    },
    [loadRemoteData],
  );

  const updateLastMessageCheckedAt = useCallback((createdAt: string) => {
    if (!createdAt || createdAt <= lastMessageCheckedAtRef.current) {
      return;
    }

    lastMessageCheckedAtRef.current = createdAt;
  }, []);

  const rememberSeenMessageId = useCallback((id: string) => {
    seenMessageIdsRef.current.add(id);
    if (seenMessageIdsRef.current.size <= MAX_SEEN_CHAT_IDS) {
      return;
    }

    const [oldestId] = seenMessageIdsRef.current;
    seenMessageIdsRef.current.delete(oldestId);
  }, []);

  const handleIncomingMessages = useCallback(
    (incomingMessages: ChatMessage[]) => {
      const unseenIncoming = incomingMessages.filter(
        (message) =>
          !isMessageFromCurrentMember(message, selectedMemberKey, clientIdRef.current) &&
          !seenMessageIdsRef.current.has(message.id),
      );

      if (!unseenIncoming.length) {
        return;
      }

      unseenIncoming.forEach((message) => rememberSeenMessageId(message.id));
      const sortedUnseen = [...unseenIncoming].sort(compareMessagesOldestFirst);
      const latestMessage = sortedUnseen[sortedUnseen.length - 1];
      if (!latestMessage) {
        return;
      }

      const notice = getChatMessageText(latestMessage);
      setStatusMessage(notice);
      vibrateDevice([45, 30, 45]);
      if (!isPushEnabled && !isWebPushSupported()) {
        showChatNotification(notice);
      }
    },
    [isPushEnabled, rememberSeenMessageId, selectedMemberKey],
  );

  const checkRecentMessages = useCallback(async () => {
    if (!supabase || !coupleCode || !coupleSecret) {
      return;
    }

    const lastCheckedAt = new Date(lastMessageCheckedAtRef.current).getTime();
    const since = new Date(Math.max(0, lastCheckedAt - RECENT_MESSAGE_OVERLAP_MS)).toISOString();
    const incomingMessages = await fetchRecentMessages({
      coupleCode,
      signChatMediaMessages,
      since,
      supabase,
    });

    if (!incomingMessages.length) {
      return;
    }

    updateLastMessageCheckedAt(incomingMessages[incomingMessages.length - 1].created_at);
    setMessages((current) => mergeChatMessages(current, incomingMessages));
    handleIncomingMessages(incomingMessages);
  }, [coupleCode, coupleSecret, handleIncomingMessages, signChatMediaMessages, supabase, updateLastMessageCheckedAt]);

  const queueRealtimeReconnect = useCallback(() => {
    if (!getBrowserOnlineStatus()) {
      return;
    }

    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
    }

    reconnectAttemptRef.current += 1;
    const delay = Math.min(10_000, 1_000 * 2 ** Math.min(reconnectAttemptRef.current - 1, 3));
    if (
      reconnectAttemptRef.current > RECONNECT_ALERT_AFTER_ATTEMPTS &&
      !connectionAlertShownRef.current
    ) {
      connectionAlertShownRef.current = true;
      setConnectionAlertMessage("실시간 연결이 오래 지연되고 있어요. 네트워크를 확인하거나 다시 맞추기를 눌러주세요.");
      vibrateDevice([45, 30, 45]);
    }
    reconnectTimerRef.current = window.setTimeout(() => {
      reconnectTimerRef.current = null;
      setRealtimeStatus("connecting");
      setRealtimeRetryKey((retryKey) => retryKey + 1);
      checkRecentMessages();
    }, delay);
  }, [checkRecentMessages]);

  useEffect(() => {
    loadRemoteData();
  }, [loadRemoteData]);

  useEffect(() => {
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type !== "open-tab") {
        return;
      }

      if (event.data.tab === "chat") {
        setIsSettingsOpen(false);
        setActiveTab("chat");
      }
    };

    return addServiceWorkerMessageListener(handleServiceWorkerMessage);
  }, []);

  useEffect(() => {
    if (!isDemoMode && coupleCode && coupleSecret && window.location.search) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [coupleCode, coupleSecret, isDemoMode]);

  useEffect(() => {
    const updateRelationshipTick = () => setRelationshipTick(Date.now());
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(now.getHours() + 1, 0, 0, 0);
    let hourlyTimer = 0;
    const firstTimer = window.setTimeout(() => {
      updateRelationshipTick();
      hourlyTimer = window.setInterval(updateRelationshipTick, HOUR_MS);
    }, nextHour.getTime() - now.getTime());

    return () => {
      window.clearTimeout(firstTimer);
      if (hourlyTimer) {
        window.clearInterval(hourlyTimer);
      }
    };
  }, []);

  useEffect(() => {
    if (!supabase || !coupleCode || !coupleSecret) {
      return undefined;
    }

    setRealtimeStatus("connecting");
    return setupCoupleRealtimeSubscription({
      clientId: clientIdRef.current,
      coupleCode,
      handleMessageInsert: (payload) => {
          void (async () => {
            const nextMessageRow = mapRealtimeMessagePayload(
              (payload as { new?: RealtimeMessagePayload } | undefined)?.new,
            );
            if (!nextMessageRow) {
              return;
            }
            const [signedMessage] = await signChatMediaMessages([nextMessageRow]);
            updateLastMessageCheckedAt(signedMessage.created_at);
            setMessages((current) => mergeChatMessages(current, [signedMessage]));
            if (isMessageFromCurrentMember(signedMessage, selectedMemberKey, clientIdRef.current)) {
              return;
            }

            handleIncomingMessages([signedMessage]);
          })().catch(() => undefined);
      },
      onDisconnected: () => setRealtimeStatus("disconnected"),
      onSubscribed: () => {
        reconnectAttemptRef.current = 0;
        connectionAlertShownRef.current = false;
        setConnectionAlertMessage("");
        setRealtimeStatus("connected");
        checkRecentMessages();
      },
      queueRealtimeReconnect,
      reconnectTimerRef,
      scheduleRemoteSync,
      selectedMemberKey,
      supabase,
      syncChannelRef,
      syncDebounceRef,
    });
  }, [
    checkRecentMessages,
    coupleCode,
    coupleSecret,
    handleIncomingMessages,
    queueRealtimeReconnect,
    realtimeRetryKey,
    scheduleRemoteSync,
    selectedMemberKey,
    signChatMediaMessages,
    supabase,
    updateLastMessageCheckedAt,
  ]);

  useEffect(() => {
    if (!coupleCode || !coupleSecret) {
      return undefined;
    }

    const intervalMs = isOnline && realtimeStatus === "connected" ? CHAT_POLL_CONNECTED_MS : CHAT_POLL_RECOVERY_MS;
    const timer = window.setInterval(checkRecentMessages, intervalMs);
    return () => window.clearInterval(timer);
  }, [checkRecentMessages, coupleCode, coupleSecret, isOnline, realtimeStatus]);

  useEffect(() => {
    if (!coupleCode || !coupleSecret) {
      return undefined;
    }

    const updateOnlineStatus = () => {
      const nextIsOnline = getBrowserOnlineStatus();
      setIsOnline(nextIsOnline);

      if (nextIsOnline) {
        reconnectAttemptRef.current = 0;
        connectionAlertShownRef.current = false;
        setConnectionAlertMessage("");
        if (reconnectTimerRef.current) {
          window.clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
        setRealtimeStatus("connecting");
        setRealtimeRetryKey((retryKey) => retryKey + 1);
        loadRemoteData("다시 연결됨");
      }
    };
    const refreshWhenVisible = () => {
      if (!document.hidden && getBrowserOnlineStatus()) {
        loadRemoteData("앱 다시 열림");
        checkRecentMessages();
      }
    };

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [checkRecentMessages, coupleCode, coupleSecret, loadRemoteData]);

  useEffect(() => {
    if (!coupleCode || !coupleSecret || !selectedMemberKey || !supabase || getNotificationPermission() !== "granted") {
      return;
    }

    savePushSubscription(true);
  }, [coupleCode, coupleSecret, selectedMemberKey, supabase]);

  const sortedEvents = useMemo(() => sortEvents(events), [events]);
  const sortedTodos = useMemo(() => sortTodos(todos), [todos]);
  const weekRange = useMemo(() => getWeekRange(new Date()), []);
  const monthDays = useMemo(() => getMonthGrid(visibleMonth), [visibleMonth]);
  const relationshipElapsed = useMemo(() => getRelationshipElapsed(relationshipTick), [relationshipTick]);
  const photosByDate = useMemo(() => groupPhotosByDate(photos), [photos]);
  const todayEvents = getEventsForDate(sortedEvents, todayKey);
  const weekEvents = getEventsOverlappingRange(sortedEvents, weekRange);
  const selectedDateEvents = getEventsForDate(sortedEvents, selectedDate);
  const { completedTodos, openTodos } = splitTodosByCompletion(sortedTodos);
  const selectedDatePhotos = photosByDate.get(selectedDate) || [];

  useEffect(() => {
    if (photoModalIndex !== null && selectedDatePhotos.length > 0 && photoModalIndex >= selectedDatePhotos.length) {
      setPhotoModalIndex(0);
    }
  }, [photoModalIndex, selectedDatePhotos.length]);
  const currentMemberName = getMemberDisplayName(selectedMemberKey);
  const inviteLink = buildInviteLink({
    coupleCode,
    coupleSecret,
    origin: window.location.origin,
    pathname: window.location.pathname,
  });

  function activateCouple(nextCode: string, nextSecret: string, message: string) {
    saveCoupleSession(localStorage, nextCode, nextSecret);
    setCoupleCode(nextCode);
    setCoupleSecret(nextSecret);
    setCodeInput(nextCode);
    setSecretInput(nextSecret);
    setActiveTab("home");
    setStatusMessage(message);
    window.history.replaceState(null, "", window.location.pathname);
  }

  function selectVisibleInviteLink(textLength: number) {
    const inviteInput = document.querySelector<HTMLInputElement>("[data-invite-link-input]");
    inviteInput?.focus();
    inviteInput?.select();
    inviteInput?.setSelectionRange(0, textLength);
  }

  async function runCopyInviteLinkAction() {
    return copyInviteLinkWithFallback({
      copyTextWithFallback: copyTextWithTextarea,
      inviteLink,
      selectInviteLink: selectVisibleInviteLink,
      writeClipboardText: getClipboardTextWriter(),
    });
  }

  async function joinCouple(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextCode = normalizeCoupleCode(codeInput);
    const nextSecret = normalizeCoupleSecret(secretInput);
    if (!nextCode) {
      setStatusMessage("커플 코드를 입력해 주세요.");
      return;
    }

    if (!nextSecret) {
      setStatusMessage("커플 비밀키를 입력해 주세요.");
      return;
    }

    const nextClient = createCoupleClient(nextCode, nextSecret);
    if (!nextClient) {
      setStatusMessage("Supabase 환경변수가 아직 설정되지 않았어요.");
      return;
    }

    setIsLoading(true);
    const { data: existingCouple, error: selectError } = await findCoupleByCode(nextClient, nextCode);

    if (selectError) {
      setIsLoading(false);
      setStatusMessage("커플 코드를 확인하지 못했어요.");
      return;
    }

    if (!existingCouple) {
      setIsLoading(false);
      setStatusMessage("아직 없는 코드예요. 새 공간을 만들고 초대 링크를 보내주세요.");
      return;
    }

    activateCouple(nextCode, nextSecret, "둘만의 공간에 연결됐어요. 이제 프로필을 선택해 주세요.");
    setIsLoading(false);
  }

  async function createCoupleSpace() {
    const nextCode = generateCoupleCode();
    const nextSecret = generateCoupleSecret();
    const nextClient = createCoupleClient(nextCode, nextSecret);
    if (!nextClient) {
      setStatusMessage("Supabase 환경변수가 아직 설정되지 않았어요.");
      return;
    }

    setIsLoading(true);
    const { error } = await createCoupleSpaceRecords(nextClient, {
      code: nextCode,
      displayName: "정서 S2 민혁",
      inviteSecret: nextSecret,
    });

    setIsLoading(false);
    if (error) {
      setStatusMessage("커플 공간을 만들지 못했어요. 다시 시도해 주세요.");
      return;
    }

    activateCouple(nextCode, nextSecret, "새 커플 공간을 만들었어요. 프로필을 선택해 주세요.");
  }

  async function copyInviteLink() {
    const result = await runCopyInviteLinkAction();
    if (result.message) {
      setStatusMessage(result.message);
    }
  }

  async function shareInviteLink() {
    const result = await shareInviteLinkWithFallback({
      copyInviteLink: runCopyInviteLinkAction,
      inviteLink,
      share: getShareInvoker(),
    });
    if (result.message) {
      setStatusMessage(result.message);
    }
  }

  async function requestPokeNotifications() {
    const nextPermission = await requestPokePermission({
      hasSelectedMember: Boolean(selectedMemberKey),
    });

    if (nextPermission === "missing-member") {
      setStatusMessage("먼저 정서 또는 민혁 프로필을 선택해 주세요.");
      return;
    }

    if (nextPermission === "unsupported") {
      setNotificationPermission("unsupported");
      setStatusMessage("이 브라우저는 핸드폰 푸시 알림을 지원하지 않아요.");
      return;
    }

    setNotificationPermission(nextPermission);
    if (nextPermission !== "granted") {
      setIsPushEnabled(false);
      setStatusMessage("알림 권한이 꺼져 있어요.");
      return;
    }

    await savePushSubscription();
  }

  async function savePushSubscription(silent = false) {
    if (!supabase || !coupleCode || !coupleSecret || !selectedMemberKey) {
      if (!silent) {
        setStatusMessage("프로필을 먼저 선택해 주세요.");
      }
      return false;
    }

    if (!isWebPushSupported()) {
      setNotificationPermission("unsupported");
      setIsPushEnabled(false);
      if (!silent) {
        setStatusMessage("이 브라우저는 핸드폰 푸시 알림을 지원하지 않아요.");
      }
      return false;
    }

    if (getNotificationPermission() !== "granted") {
      setIsPushEnabled(false);
      return false;
    }

    setIsRegisteringPush(true);
    const result = await registerPushSubscription({
      clientId: clientIdRef.current,
      coupleCode,
      deviceKey: pushDeviceKeyRef.current,
      forceRefresh: !silent,
      memberKey: selectedMemberKey,
      supabase,
      userAgent: getBrowserUserAgent(),
    });
    try {
      if (result.status === "invalid") {
        setIsPushEnabled(false);
        if (!silent) {
          setStatusMessage("푸시 알림 정보를 저장하지 못했어요.");
        }
        return false;
      }

      if (result.status === "save-error") {
        setIsPushEnabled(false);
        if (!silent) {
          setStatusMessage("푸시 알림 저장에 실패했어요.");
        }
        return false;
      }

      if (result.status === "failed") {
        setIsPushEnabled(false);
        if (!silent) {
          setStatusMessage("푸시 알림을 켜지 못했어요. 홈 화면 앱에서 다시 시도해 주세요.");
        }
        return false;
      }

      setIsPushEnabled(true);
      setNotificationPermission("granted");
      if (!silent) {
        setStatusMessage("핸드폰 푸시 알림을 켰어요.");
      }
      return true;
    } finally {
      setIsRegisteringPush(false);
    }
  }

  async function showChatNotification(message: string) {
    await showChatNotificationIfNeeded(message, {
      getPermission: getNotificationPermission,
      isDocumentHidden: () => document.hidden,
      showServiceWorkerNotification: getServiceWorkerNotificationPresenter(),
      showWindowNotification: (title, options) => {
        showWindowNotification(title, options);
      },
    });
  }

  function updateChatMessage(message: string) {
    chatMessageRef.current = message;
    setChatMessage(message);
  }

  async function sendChatMessage(messageOverride?: string, failedMessageId?: string, replyToMessageIdOverride?: string | null) {
    if (!supabase || !coupleCode || !coupleSecret) {
      return;
    }

    if (!selectedMemberKey) {
      setStatusMessage("먼저 정서 또는 민혁 프로필을 선택해 주세요.");
      return;
    }

    const message = (messageOverride ?? chatMessageRef.current).trim();
    if (!message) {
      return;
    }

    const failedMessage = failedMessageId ? messages.find((item) => item.id === failedMessageId) : null;
    const replyToMessageId = replyToMessageIdOverride ?? failedMessage?.reply_to_message_id ?? replyTargetMessageId;
    const optimisticMessage = createOptimisticTextMessage({
      body: message,
      failedMessageId,
      replyToMessageId,
      senderId: clientIdRef.current,
      senderMemberKey: selectedMemberKey,
    });
    const localMessageId = optimisticMessage.id;
    updateChatMessage("");
    if (!failedMessageId) {
      setReplyTargetMessageId(null);
    }
    setMessages((current) => replaceChatMessage(current, localMessageId, optimisticMessage));
    const sendResult = await sendTextChatWorkflow(supabase, {
      body: message,
      coupleCode,
      coupleSecret,
      replyToMessageId,
      senderId: clientIdRef.current,
      senderMemberKey: selectedMemberKey,
      senderName: currentMemberName,
    });

    if (sendResult.status === "failed") {
      setMessages((current) => markChatMessageFailed(current, localMessageId));
      setStatusMessage("메시지를 보내지 못했어요.");
      return;
    }

    const data = sendResult.data;
    rememberSeenMessageId(data.id);
    updateLastMessageCheckedAt(data.created_at);
    setMessages((current) => replaceChatMessage(current, localMessageId, data));
    setStatusMessage(sendResult.statusMessage);
  }

  async function sendChatMedia(file: File, failedMessageId?: string, replyToMessageIdOverride?: string | null) {
    if (!supabase || !coupleCode || !coupleSecret) {
      return;
    }

    if (!selectedMemberKey) {
      setStatusMessage("먼저 정서 또는 민혁 프로필을 선택해 주세요.");
      return;
    }

    const mediaSelection = getChatMediaUploadSelection(file);
    if (mediaSelection.status === "invalid-type") {
      setStatusMessage("사진은 JPG/PNG/WebP/GIF, 동영상은 MP4/WebM/MOV만 보낼 수 있어요.");
      return;
    }

    if (mediaSelection.status === "oversized") {
      setStatusMessage("채팅 파일은 50MB 이하로 보내 주세요.");
      return;
    }

    const mediaKind = mediaSelection.mediaKind;
    const mediaLabel = getChatMediaLabel(mediaKind);
    const failedMessage = failedMessageId ? messages.find((item) => item.id === failedMessageId) : null;
    const replyToMessageId = replyToMessageIdOverride ?? failedMessage?.reply_to_message_id ?? replyTargetMessageId;
    const { message: optimisticMessage, storagePath } = createOptimisticMediaMessage({
      coupleCode,
      extension: getChatMediaExtension(file),
      failedMessageId,
      file,
      mediaKind,
      mediaLabel,
      replyToMessageId,
      senderId: clientIdRef.current,
      senderMemberKey: selectedMemberKey,
    });
    const localMessageId = optimisticMessage.id;

    if (!failedMessageId) {
      setReplyTargetMessageId(null);
    }
    setMessages((current) => replaceChatMessage(current, localMessageId, optimisticMessage));
    setIsUploadingChatMedia(true);

    try {
      const sendResult = await sendMediaChatWorkflow(supabase, {
        coupleCode,
        coupleSecret,
        file,
        mediaKind,
        mediaLabel,
        replyToMessageId,
        senderId: clientIdRef.current,
        senderMemberKey: selectedMemberKey,
        senderName: currentMemberName,
        signMessages: signChatMediaMessages,
        storagePath,
      });

      if (sendResult.status === "failed") {
        setMessages((current) => markChatMessageFailed(current, localMessageId));
        setStatusMessage(`${mediaLabel}을 보내지 못했어요.`);
        return;
      }

      const signedMessage = sendResult.data;
      rememberSeenMessageId(signedMessage.id);
      updateLastMessageCheckedAt(signedMessage.created_at);
      setMessages((current) => replaceChatMessage(current, localMessageId, signedMessage));
      setStatusMessage(sendResult.statusMessage);
    } catch {
      setMessages((current) => markChatMessageFailed(current, localMessageId));
      setStatusMessage(`${mediaLabel}을 보내지 못했어요.`);
    } finally {
      setIsUploadingChatMedia(false);
    }
  }

  function retryChatMessage(message: ChatMessage) {
    if (message.message_type === "text") {
      sendChatMessage(message.body || "", message.id, message.reply_to_message_id || null);
      return;
    }

    if (message.local_file) {
      sendChatMedia(message.local_file, message.id, message.reply_to_message_id || null);
      return;
    }

    setStatusMessage("파일을 다시 선택해서 보내 주세요.");
  }

  async function broadcastDataChanged() {
    const channel = syncChannelRef.current;
    if (!channel) {
      return;
    }

    try {
      await sendDataChangedBroadcast(channel, clientIdRef.current);
    } catch {
      setRealtimeStatus("disconnected");
    }
  }

  async function reactToChatMessage(message: ChatMessage, emoji: string) {
    if (!supabase || !coupleCode || !selectedMemberKey) {
      setStatusMessage("먼저 정서 또는 민혁 프로필을 선택해 주세요.");
      return;
    }

    setMessages((current) =>
      current.map((currentMessage) => {
        if (currentMessage.id !== message.id) {
          return currentMessage;
        }

        const reactions = (currentMessage.reactions || []).filter(
          (reaction) => reaction.member_key !== selectedMemberKey,
        );
        return {
          ...currentMessage,
          reactions: [
            ...reactions,
            {
              emoji,
              member_key: selectedMemberKey,
              message_id: currentMessage.id,
            },
          ],
        };
      }),
    );

    const { error } = await reactToCoupleMessage(supabase, {
      coupleCode,
      emoji,
      memberKey: selectedMemberKey,
      messageId: message.id,
    });

    if (error) {
      setStatusMessage("이모티콘을 남기지 못했어요.");
      await loadRemoteData("다시 동기화됨");
      return;
    }

    await loadRemoteData("이모티콘을 남겼어요.");
    await broadcastDataChanged();
  }

  function leaveCouple() {
    clearCoupleSession(localStorage);
    setCoupleCode("");
    setCoupleSecret("");
    setSelectedMemberKey("");
    setEvents([]);
    setPhotos([]);
    setTodos([]);
    setMessages([]);
    setReplyTargetMessageId(null);
    setConnectionAlertMessage("");
    setRealtimeStatus("connecting");
    updateChatMessage("");
    setIsPushEnabled(false);
    setIsRegisteringPush(false);
    setIsUploadingChatMedia(false);
    setPhotoModalIndex(null);
    setStatusMessage("");
  }

  function chooseMember(memberKey: MemberKey) {
    saveCoupleMember(localStorage, memberKey);
    setSelectedMemberKey(memberKey);
    setStatusMessage(`${getMemberDisplayName(memberKey)} 프로필로 들어왔어요.`);
  }

  function changeMember() {
    clearCoupleMember(localStorage);
    setSelectedMemberKey("");
    setReplyTargetMessageId(null);
    setIsPushEnabled(false);
    setActiveTab("home");
    setStatusMessage("프로필을 다시 선택해 주세요.");
  }

  function retrySync() {
    reconnectAttemptRef.current = 0;
    connectionAlertShownRef.current = false;
    setConnectionAlertMessage("");
    if (!getBrowserOnlineStatus()) {
      setIsOnline(false);
      setConnectionAlertMessage("인터넷 연결이 꺼져 있어요. 연결 후 다시 맞춰주세요.");
      return;
    }

    setRealtimeStatus("connecting");
    setRealtimeRetryKey((retryKey) => retryKey + 1);
    loadRemoteData("다시 동기화됨");
    checkRecentMessages();
  }

  async function deleteEvent(id: string) {
    if (!supabase) {
      return;
    }

    const result = await runDeleteEventWorkflow({
      broadcastDataChanged,
      id,
      loadRemoteData,
      supabase,
    });
    if (result.status === "failed") {
      setStatusMessage("일정을 삭제하지 못했어요.");
    }
  }

  async function addScheduleEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = eventTitle.trim();
    if (!title || !supabase || !coupleCode || !scheduleRange) {
      return;
    }

    const result = await runAddEventWorkflow({
      broadcastDataChanged,
      coupleCode,
      endDate: scheduleRange.end,
      loadRemoteData,
      memo: eventMemo.trim(),
      startDate: scheduleRange.start,
      supabase,
      time: eventTime,
      title,
    });

    if (result.status === "failed") {
      setStatusMessage("일정을 저장하지 못했어요.");
      return;
    }

    setEventTitle("");
    setEventTime("");
    setEventMemo("");
    setIsScheduleModalOpen(false);
    setScheduleRange(null);
    scheduleRangeAnchorRef.current = null;
  }

  async function addPhotos(event: ChangeEvent<HTMLInputElement>) {
    const photoSelection = getPhotoUploadSelection(Array.from(event.target.files || []));
    event.target.value = "";
    if (photoSelection.status === "empty") {
      return;
    }

    if (!supabase || !coupleCode) {
      setStatusMessage("사진을 저장하지 못했어요.");
      return;
    }

    if (photoSelection.status === "invalid-type") {
      setStatusMessage("이미지 파일만 올릴 수 있어요.");
      return;
    }

    if (photoSelection.status === "oversized") {
      setStatusMessage("사진은 한 장당 5MB 이하로 올려 주세요.");
      return;
    }

    setIsUploadingPhoto(true);

    try {
      const result = await runPhotoUploadWorkflow({
        broadcastDataChanged,
        coupleCode,
        date: selectedDate,
        files: photoSelection.files,
        loadRemoteData,
        supabase,
        uploadedBy: selectedMemberKey || null,
      });

      if (result.status === "failed") {
        setStatusMessage("사진을 저장하지 못했어요.");
      }
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  async function deletePhoto(photo: CouplePhoto) {
    if (!supabase) {
      setStatusMessage("사진을 삭제하지 못했어요.");
      return;
    }

    const remainingPhotoCount = selectedDatePhotos.filter((datePhoto) => datePhoto.id !== photo.id).length;

    const result = await runPhotoDeleteWorkflow({
      broadcastDataChanged,
      confirmDeletePhoto: () => confirmWithWindow("이 사진을 삭제할까요?"),
      loadRemoteData,
      photo,
      remainingPhotoCount,
      setPhotoModalIndex,
      storage: localStorage,
      supabase,
    });

    if (result.status === "cancelled") {
      return;
    }

    if (result.status === "failed") {
      setStatusMessage("사진을 삭제하지 못했어요.");
      return;
    }

    if (result.status === "deleted-with-storage-warning") {
      setStatusMessage("사진 기록은 삭제했지만 파일 정리는 다시 확인해 주세요.");
    }
  }

  async function addTodo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = todoTitle.trim();
    if (!title || !supabase || !coupleCode) {
      return;
    }

    const result = await runAddTodoWorkflow({
      broadcastDataChanged,
      coupleCode,
      loadRemoteData,
      supabase,
      title,
    });

    if (result.status === "failed") {
      setStatusMessage("투두를 저장하지 못했어요.");
      return;
    }

    setTodoTitle("");
  }

  async function toggleTodo(id: string) {
    if (!supabase) {
      return;
    }

    const result = await runToggleTodoWorkflow({
      broadcastDataChanged,
      id,
      loadRemoteData,
      supabase,
      todos,
    });

    if (result.status === "failed") {
      setStatusMessage("투두 상태를 바꾸지 못했어요.");
    }
  }

  async function deleteTodo(id: string) {
    if (!supabase) {
      return;
    }

    const result = await runDeleteTodoWorkflow({
      broadcastDataChanged,
      id,
      loadRemoteData,
      supabase,
    });
    if (result.status === "failed") {
      setStatusMessage("투두를 삭제하지 못했어요.");
    }
  }

  function moveMonth(direction: number) {
    setVisibleMonth((currentMonth) => {
      const nextMonth = new Date(currentMonth);
      nextMonth.setMonth(currentMonth.getMonth() + direction);
      return nextMonth;
    });
  }

  function startScheduleRange(date: string) {
    scheduleRangeAnchorRef.current = date;
    setSelectedDate(date);
    setPhotoModalIndex(null);
    setIsScheduleModalOpen(false);
    setScheduleRange({ start: date, end: date });
  }

  function previewScheduleRange(date: string) {
    const anchorDate = scheduleRangeAnchorRef.current || scheduleRange?.start || date;
    setSelectedDate(date);
    setScheduleRange(normalizeDateRange(anchorDate, date));
  }

  function completeScheduleRange(date: string) {
    const anchorDate = scheduleRangeAnchorRef.current || scheduleRange?.start || date;
    const nextRange = normalizeDateRange(anchorDate, date);
    setSelectedDate(date);
    setScheduleRange(nextRange);
    setPhotoModalIndex(null);
    setIsScheduleModalOpen(true);
    setStatusMessage("");
  }

  function cancelScheduleModal() {
    setIsScheduleModalOpen(false);
    setScheduleRange(null);
    scheduleRangeAnchorRef.current = null;
    setEventTitle("");
    setEventTime("");
    setEventMemo("");
  }

  function openDatePhotosModal(date: string) {
    if (scheduleRange && !isScheduleModalOpen) {
      completeScheduleRange(date);
      return;
    }

    setSelectedDate(date);
    setPhotoModalIndex(0);
  }

  function closePhotoModal() {
    setPhotoModalIndex(null);
  }

  function movePhotoSlide(direction: number) {
    setPhotoModalIndex((currentIndex) => {
      if (currentIndex === null || selectedDatePhotos.length === 0) {
        return null;
      }

      return (currentIndex + direction + selectedDatePhotos.length) % selectedDatePhotos.length;
    });
  }

  if (isDemoMode) {
    return <CalendarMemoryDemo />;
  }

  if (!coupleCode || !coupleSecret) {
    return (
      <main className="app-shell">
        <section className="join-card">
          <div className="heart-mark large" aria-hidden="true">
            S2
          </div>
          <p className="eyebrow">둘만의 공간</p>
          <h1>정서 S2 민혁</h1>
          <p>새 커플 공간을 만들거나 받은 초대 코드로 들어가요.</p>
          <div className="mode-switch" aria-label="입장 방식">
            <button
              type="button"
              className={joinMode === "create" ? "active" : ""}
              onClick={() => setJoinMode("create")}
            >
              새 공간 만들기
            </button>
            <button
              type="button"
              className={joinMode === "join" ? "active" : ""}
              onClick={() => setJoinMode("join")}
            >
              코드로 들어가기
            </button>
          </div>
          {joinMode === "create" ? (
            <div className="join-actions">
              <p>둘만 아는 초대 코드를 만들고, 상대방에게 링크를 보내면 바로 함께 쓸 수 있어요.</p>
              <button type="button" onClick={createCoupleSpace} disabled={isLoading}>
                {isLoading ? "만드는 중..." : "우리 공간 만들기"}
              </button>
            </div>
          ) : null}
          {joinMode === "join" ? (
            <form className="form-stack" onSubmit={joinCouple}>
              <label>
                초대 코드
                <input
                  value={codeInput}
                  onChange={(event) => setCodeInput(event.target.value)}
                  placeholder={DEFAULT_COUPLE_CODE}
                />
              </label>
              <label>
                커플 비밀키
                <input
                  value={secretInput}
                  onChange={(event) => setSecretInput(event.target.value)}
                  placeholder="둘만 아는 비밀키"
                />
              </label>
              <button type="submit" disabled={isLoading}>
                {isLoading ? "연결 중..." : "코드로 들어가기"}
              </button>
            </form>
          ) : null}
          {statusMessage ? <p className="status-message">{statusMessage}</p> : null}
        </section>
      </main>
    );
  }

  if (!selectedMemberKey) {
    return (
      <main className="app-shell">
        <section className="join-card profile-card">
          <div className="heart-mark large" aria-hidden="true">
            S2
          </div>
          <p className="eyebrow">프로필 선택</p>
          <h1>누구로 들어갈까요?</h1>
          <p>이 기기를 정서 또는 민혁에게 연결해요. 여러 기기를 써도 같은 사람으로 묶입니다.</p>
          <div className="profile-options">
            {memberProfiles.map((member) => (
              <button
                type="button"
                className={`profile-option ${member.key}`}
                key={member.key}
                onClick={() => chooseMember(member.key)}
              >
                <strong>{member.label}</strong>
                <span>{member.caption}</span>
              </button>
            ))}
          </div>
          <button type="button" className="text-button" onClick={leaveCouple}>
            다른 코드로 들어가기
          </button>
          {statusMessage ? <p className="status-message">{statusMessage}</p> : null}
        </section>
      </main>
    );
  }

  return (
    <main className={`app-shell ${activeTab === "chat" ? "chat-app-shell" : ""}`}>
      {activeTab !== "chat" ? (
        <header className="app-header">
          <div>
            <p className="eyebrow">우리 둘의 하루 · {coupleCode} · {currentMemberName}</p>
            <h1>정서 S2 민혁</h1>
          </div>
          <div className="header-actions">
            <button
              type="button"
              className={`header-icon-button settings-icon-button ${isSettingsOpen ? "active" : ""}`}
              aria-label="설정 열기"
              onClick={() => setIsSettingsOpen((current) => !current)}
              title="설정"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
                <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2 3.4-.2-.1a1.7 1.7 0 0 0-2 .4l-.2.2a1.7 1.7 0 0 0-.5 1.1H9.1a1.7 1.7 0 0 0-.5-1.1l-.2-.2a1.7 1.7 0 0 0-2-.4l-.2.1-2-3.4.1-.1A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.4-1H3v-4h.2a1.7 1.7 0 0 0 1.4-1 1.7 1.7 0 0 0-.3-1.9L4.2 7l2-3.4.2.1a1.7 1.7 0 0 0 2-.4l.2-.2A1.7 1.7 0 0 0 9.1 2h5.8a1.7 1.7 0 0 0 .5 1.1l.2.2a1.7 1.7 0 0 0 2 .4l.2-.1 2 3.4-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.4 1h.2v4h-.2a1.7 1.7 0 0 0-1.4 1Z" />
              </svg>
            </button>
            <button
              type="button"
              className={[
                "header-icon-button",
                "notification-icon-button",
                isPushEnabled ? "active" : "",
                notificationPermission === "unsupported" ? "muted" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-label={
                isPushEnabled
                  ? "핸드폰 알림 켜짐"
                  : notificationPermission === "unsupported"
                    ? "핸드폰 알림 미지원"
                    : "핸드폰 알림 켜기"
              }
              disabled={isRegisteringPush || notificationPermission === "unsupported"}
              onClick={requestPokeNotifications}
              title={
                isPushEnabled
                  ? "핸드폰 알림 켜짐"
                  : notificationPermission === "unsupported"
                    ? "핸드폰 알림 미지원"
                    : "핸드폰 알림 켜기"
              }
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18 9.8a6 6 0 0 0-12 0v3.9l-1.4 2.4a1 1 0 0 0 .9 1.5h13a1 1 0 0 0 .9-1.5L18 13.7V9.8Z" />
                <path d="M9.6 19.2a2.6 2.6 0 0 0 4.8 0" />
              </svg>
            </button>
            <div className="heart-mark" aria-label="현재 커플 공간">
              S2
            </div>
          </div>
        </header>
      ) : null}

      {statusMessage && activeTab !== "chat" ? <p className="status-message app-content">{statusMessage}</p> : null}

      {isSettingsOpen && activeTab !== "chat" ? (
        <SettingsPanel
          coupleCode={coupleCode}
          inviteLink={inviteLink}
          copyInviteLink={copyInviteLink}
          shareInviteLink={shareInviteLink}
          currentMemberName={currentMemberName}
          changeMember={changeMember}
          leaveCouple={leaveCouple}
          onClose={() => setIsSettingsOpen(false)}
        />
      ) : null}

      <section className={`app-content ${activeTab === "chat" ? "chat-content" : ""}`} aria-live="polite">
        {activeTab === "home" && (
          <HomeView
            relationshipElapsed={relationshipElapsed}
            todayEvents={todayEvents}
            weekEvents={weekEvents}
            openTodos={openTodos}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === "calendar" && (
          <CalendarView
            events={sortedEvents}
            selectedDate={selectedDate}
            scheduleRange={scheduleRange}
            visibleMonth={visibleMonth}
            monthDays={monthDays}
            photosByDate={photosByDate}
            selectedDateEvents={selectedDateEvents}
            deleteEvent={deleteEvent}
            moveMonth={moveMonth}
            openDatePhotosModal={openDatePhotosModal}
            previewScheduleRange={previewScheduleRange}
            startScheduleRange={startScheduleRange}
            completeScheduleRange={completeScheduleRange}
            cancelScheduleRange={cancelScheduleModal}
          />
        )}

        {activeTab === "chat" && (
          <ChatView
            messages={messages}
            currentClientId={clientIdRef.current}
            currentMemberKey={selectedMemberKey}
            chatMessage={chatMessage}
            sendChatMessage={sendChatMessage}
            sendChatMedia={sendChatMedia}
            retryChatMessage={retryChatMessage}
            reactToMessage={reactToChatMessage}
            replyTargetMessageId={replyTargetMessageId}
            replyToMessage={(message) => setReplyTargetMessageId(message.id)}
            clearReplyTarget={() => setReplyTargetMessageId(null)}
            setChatMessage={updateChatMessage}
            isUploadingChatMedia={isUploadingChatMedia}
            refreshViewportMetrics={updateAppViewportMetrics}
          />
        )}

        {activeTab === "todos" && (
          <TodoView
            openTodos={openTodos}
            completedTodos={completedTodos}
            todoTitle={todoTitle}
            setTodoTitle={setTodoTitle}
            addTodo={addTodo}
            toggleTodo={toggleTodo}
            deleteTodo={deleteTodo}
          />
        )}
      </section>

      {connectionAlertMessage ? (
        <section className="connection-alert" role="alert">
          <span>{connectionAlertMessage}</span>
          <button type="button" onClick={retrySync}>
            다시 맞추기
          </button>
        </section>
      ) : null}

      <nav className="bottom-tabs" aria-label="주요 화면">
        <TabButton active={activeTab === "home"} label="홈" onClick={() => setActiveTab("home")} />
        <TabButton
          active={activeTab === "calendar"}
          label="캘린더"
          onClick={() => setActiveTab("calendar")}
        />
        <TabButton active={activeTab === "chat"} label="채팅" onClick={() => setActiveTab("chat")} />
        <TabButton
          active={activeTab === "todos"}
          label="투두"
          onClick={() => setActiveTab("todos")}
        />
      </nav>

      <PhotoModal
        photos={selectedDatePhotos}
        activeIndex={photoModalIndex}
        selectedDate={selectedDate}
        addPhotos={addPhotos}
        closePhotoModal={closePhotoModal}
        deletePhoto={deletePhoto}
        isUploadingPhoto={isUploadingPhoto}
        movePhotoSlide={movePhotoSlide}
      />
      <ScheduleModal
        eventMemo={eventMemo}
        eventTime={eventTime}
        eventTitle={eventTitle}
        isOpen={isScheduleModalOpen}
        onClose={cancelScheduleModal}
        onSubmit={addScheduleEvent}
        range={scheduleRange}
        setEventMemo={setEventMemo}
        setEventTime={setEventTime}
        setEventTitle={setEventTitle}
      />
    </main>
  );
}
