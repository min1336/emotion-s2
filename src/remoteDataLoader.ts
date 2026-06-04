import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchCoupleSnapshot } from "./coupleData";
import { mergeChatMessages } from "./chatUtils";
import type { ChatMessage, CoupleEvent, CouplePhoto, CoupleTodo } from "./domainTypes";

type MutableRef<T> = {
  current: T;
};

type FetchSnapshot = typeof fetchCoupleSnapshot;
type MergeMessages = (current: ChatMessage[], incoming: ChatMessage[]) => ChatMessage[];

type RunRemoteDataLoadInput = {
  coupleCode: string;
  coupleSecret: string;
  fetchSnapshot?: FetchSnapshot;
  latestMessageCheckedAtRef: MutableRef<string>;
  mergeMessages?: MergeMessages;
  notice?: string;
  requestIdRef: MutableRef<number>;
  setEvents: (events: CoupleEvent[]) => void;
  setHasOlderMessages?: (hasOlderMessages: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  setMessages: (updater: (current: ChatMessage[]) => ChatMessage[]) => void;
  setPhotos: (photos: CouplePhoto[]) => void;
  setStatusMessage: (message: string) => void;
  setTodos: (todos: CoupleTodo[]) => void;
  signChatMediaMessages: (rows: ChatMessage[]) => Promise<ChatMessage[]>;
  storage: Storage;
  supabase: SupabaseClient | null;
};

type RunRemoteDataLoadResult =
  | { status: "failed" }
  | { status: "loaded" }
  | { status: "skipped" }
  | { status: "stale" };

export async function runRemoteDataLoad({
  coupleCode,
  coupleSecret,
  fetchSnapshot = fetchCoupleSnapshot,
  latestMessageCheckedAtRef,
  mergeMessages = mergeChatMessages,
  notice = "",
  requestIdRef,
  setEvents,
  setHasOlderMessages = () => undefined,
  setIsLoading,
  setMessages,
  setPhotos,
  setStatusMessage,
  setTodos,
  signChatMediaMessages,
  storage,
  supabase,
}: RunRemoteDataLoadInput): Promise<RunRemoteDataLoadResult> {
  const requestId = requestIdRef.current + 1;
  requestIdRef.current = requestId;

  if (!supabase || !coupleCode || !coupleSecret) {
    setIsLoading(false);
    return { status: "skipped" };
  }

  setIsLoading(true);

  try {
    const snapshot = await fetchSnapshot({
      coupleCode,
      signChatMediaMessages,
      storage,
      supabase,
    });

    if (requestId !== requestIdRef.current) {
      return { status: "stale" };
    }

    setEvents(snapshot.events);
    setPhotos(snapshot.photos);
    setTodos(snapshot.todos);
    setHasOlderMessages(snapshot.hasOlderMessages);
    setMessages((current) => mergeMessages(current, snapshot.messages));
    if (snapshot.latestMessageCreatedAt) {
      latestMessageCheckedAtRef.current = snapshot.latestMessageCreatedAt;
    }
    setStatusMessage(notice);
    return { status: "loaded" };
  } catch {
    if (requestId !== requestIdRef.current) {
      return { status: "stale" };
    }

    setStatusMessage("데이터를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
    return { status: "failed" };
  } finally {
    if (requestId === requestIdRef.current) {
      setIsLoading(false);
    }
  }
}
