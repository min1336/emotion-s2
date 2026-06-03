import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ChatMessage,
  ChatMessageReactionRow,
  CoupleEvent,
  CoupleMessageRow,
  CouplePhoto,
  CouplePhotoRow,
  CoupleTodo,
  PhotoUrlSet,
} from "./domainTypes";
import { attachChatReactions } from "./chatMessageMetadata";
import {
  PHOTO_SIGNED_URL_TTL,
  getPhotoSignedUrlCacheKey,
  getPhotoTransformOptions,
  isFreshPhotoSignedUrl,
  readPhotoSignedUrlCache,
  writePhotoSignedUrlCache,
  type PhotoSignedUrlVariant,
} from "./photoUrlCache";
import { mapEvent, mapPhoto, mapTodo } from "./rowMappers";

type CacheStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

type FetchCoupleSnapshotOptions = {
  coupleCode: string;
  signChatMediaMessages: (messages: ChatMessage[]) => Promise<ChatMessage[]>;
  storage: CacheStorage;
  supabase: SupabaseClient;
};

type FetchRecentMessagesOptions = {
  coupleCode: string;
  limit?: number;
  signChatMediaMessages: (messages: ChatMessage[]) => Promise<ChatMessage[]>;
  since: string;
  supabase: SupabaseClient;
};

export type CoupleSnapshot = {
  events: CoupleEvent[];
  photos: CouplePhoto[];
  todos: CoupleTodo[];
  messages: ChatMessage[];
  latestMessageCreatedAt: string;
};

export const PHOTO_BUCKET = "couple-photos";
export const CHAT_MEDIA_BUCKET = "couple-chat-media";
export const CHAT_MEDIA_SIGNED_URL_TTL = 60 * 60;
export const CHAT_MESSAGE_SELECT =
  "id,body,sender_id,sender_member_key,message_type,media_storage_path,media_mime_type,media_size,media_file_name,reply_to_message_id,created_at";
export const CHAT_MESSAGE_FETCH_PAGE_SIZE = 1000;

const EMPTY_PHOTO_URL_SET: PhotoUrlSet = { displayUrl: "", thumbnailUrl: "", url: "" };
const PHOTO_SIGNED_URL_VARIANTS: PhotoSignedUrlVariant[] = ["original", "thumbnail", "display"];

async function createPhotoSignedUrl(
  supabase: SupabaseClient,
  storagePath: string,
  variant: PhotoSignedUrlVariant,
) {
  const { data, error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrl(storagePath, PHOTO_SIGNED_URL_TTL, getPhotoTransformOptions(variant));

  if (error || !data?.signedUrl) {
    return "";
  }

  return data.signedUrl;
}

async function fetchChatReactions(supabase: SupabaseClient, messageIds: string[]) {
  if (!messageIds.length) {
    return [];
  }

  const { data, error } = await supabase
    .from("couple_message_reactions")
    .select("message_id,member_key,emoji")
    .in("message_id", messageIds);

  if (error) {
    return [];
  }

  return (data || []) as ChatMessageReactionRow[];
}

async function fetchChatMessageRows({
  ascending,
  coupleCode,
  limit,
  since,
  supabase,
}: {
  ascending: boolean;
  coupleCode: string;
  limit?: number;
  since?: string;
  supabase: SupabaseClient;
}) {
  const rows: CoupleMessageRow[] = [];

  while (limit === undefined || rows.length < limit) {
    const from = rows.length;
    const remainingLimit = limit === undefined ? CHAT_MESSAGE_FETCH_PAGE_SIZE : limit - rows.length;
    const pageSize = Math.min(CHAT_MESSAGE_FETCH_PAGE_SIZE, remainingLimit);
    const query = supabase
      .from("couple_messages")
      .select(CHAT_MESSAGE_SELECT)
      .eq("couple_code", coupleCode);

    const rangedQuery = (since ? query.gte("created_at", since) : query)
      .order("created_at", { ascending })
      .order("id", { ascending })
      .range(from, from + pageSize - 1);
    const { data, error } = await rangedQuery;

    if (error) {
      throw new Error("Unable to load chat messages");
    }

    const pageRows = ((data || []) as CoupleMessageRow[]);
    rows.push(...pageRows);

    if (pageRows.length < pageSize) {
      break;
    }
  }

  return rows;
}

export async function getPhotoSignedUrlSets(
  supabase: SupabaseClient,
  storage: CacheStorage,
  storagePaths: string[],
) {
  const uniquePaths = Array.from(new Set(storagePaths));
  const cache = readPhotoSignedUrlCache(storage);
  const expiresAt = Date.now() + PHOTO_SIGNED_URL_TTL * 1000;

  await Promise.all(
    uniquePaths.flatMap((storagePath) =>
      PHOTO_SIGNED_URL_VARIANTS
        .filter((variant) => !isFreshPhotoSignedUrl(cache[getPhotoSignedUrlCacheKey(storagePath, variant)]))
        .map(async (variant) => {
          const cacheKey = getPhotoSignedUrlCacheKey(storagePath, variant);
          let signedUrl = await createPhotoSignedUrl(supabase, storagePath, variant);

          if (!signedUrl && variant !== "original") {
            signedUrl = cache[getPhotoSignedUrlCacheKey(storagePath, "original")]?.url || "";
            if (!signedUrl) {
              signedUrl = await createPhotoSignedUrl(supabase, storagePath, "original");
            }
          }

          if (signedUrl) {
            cache[cacheKey] = { expiresAt, url: signedUrl };
          }
        }),
    ),
  );

  writePhotoSignedUrlCache(cache, storage);

  return new Map<string, PhotoUrlSet>(
    uniquePaths.map((storagePath) => {
      const originalUrl = cache[getPhotoSignedUrlCacheKey(storagePath, "original")]?.url || "";
      const thumbnailUrl = cache[getPhotoSignedUrlCacheKey(storagePath, "thumbnail")]?.url || originalUrl;
      const displayUrl = cache[getPhotoSignedUrlCacheKey(storagePath, "display")]?.url || originalUrl;

      return [storagePath, { displayUrl, thumbnailUrl, url: originalUrl }];
    }),
  );
}

export async function fetchCoupleSnapshot({
  coupleCode,
  signChatMediaMessages,
  storage,
  supabase,
}: FetchCoupleSnapshotOptions): Promise<CoupleSnapshot> {
  const [eventResult, photoResult, todoResult, messageRows] = await Promise.all([
    supabase
      .from("couple_events")
      .select("id,title,event_date,event_end_date,event_time,memo,created_at")
      .eq("couple_code", coupleCode)
      .order("event_date", { ascending: true })
      .order("event_time", { ascending: true, nullsFirst: false }),
    supabase
      .from("couple_photos")
      .select("id,photo_date,storage_path,caption,uploaded_by,created_at")
      .eq("couple_code", coupleCode)
      .order("photo_date", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("couple_todos")
      .select("id,title,completed,created_at")
      .eq("couple_code", coupleCode)
      .order("completed", { ascending: true })
      .order("created_at", { ascending: true }),
    fetchChatMessageRows({ ascending: false, coupleCode, supabase }),
  ]);

  if (eventResult.error || photoResult.error || todoResult.error) {
    throw new Error("Unable to load couple data");
  }

  const photoRows = (photoResult.data || []) as CouplePhotoRow[];
  const photoUrlSets = photoRows.length
    ? await getPhotoSignedUrlSets(
        supabase,
        storage,
        photoRows.map((photo) => photo.storage_path),
      )
    : new Map<string, PhotoUrlSet>();
  const [signedMessages, reactionRows] = await Promise.all([
    signChatMediaMessages(messageRows as ChatMessage[]),
    fetchChatReactions(supabase, messageRows.map((message) => message.id)),
  ]);
  const messages = attachChatReactions(signedMessages, reactionRows);

  return {
    events: (eventResult.data || []).map(mapEvent),
    photos: photoRows.map((photo) => mapPhoto(photo, photoUrlSets.get(photo.storage_path) || EMPTY_PHOTO_URL_SET)),
    todos: (todoResult.data || []).map(mapTodo),
    messages,
    latestMessageCreatedAt: messageRows[0]?.created_at || "",
  };
}

export async function fetchRecentMessages({
  coupleCode,
  limit,
  signChatMediaMessages,
  since,
  supabase,
}: FetchRecentMessagesOptions) {
  let messageRows: CoupleMessageRow[];
  try {
    messageRows = await fetchChatMessageRows({
      ascending: true,
      coupleCode,
      limit,
      since,
      supabase,
    });
  } catch {
    return [];
  }

  if (!messageRows.length) {
    return [];
  }

  const [signedMessages, reactionRows] = await Promise.all([
    signChatMediaMessages(messageRows as ChatMessage[]),
    fetchChatReactions(supabase, messageRows.map((message) => message.id)),
  ]);

  return attachChatReactions(signedMessages, reactionRows);
}

export async function signChatMediaMessages(supabase: SupabaseClient, rows: ChatMessage[]) {
  const mediaRows = rows.filter((message) => message.media_storage_path);
  if (!mediaRows.length) {
    return rows;
  }

  const signedResult = await supabase.storage
    .from(CHAT_MEDIA_BUCKET)
    .createSignedUrls(
      mediaRows.map((message) => message.media_storage_path as string),
      CHAT_MEDIA_SIGNED_URL_TTL,
    );

  if (signedResult.error) {
    return rows;
  }

  const signedUrls = new Map<string, string>();
  (signedResult.data || []).forEach((item) => {
    if (item.path && item.signedUrl) {
      signedUrls.set(item.path, item.signedUrl);
    }
  });

  return rows.map((message) =>
    message.media_storage_path
      ? { ...message, media_url: signedUrls.get(message.media_storage_path) || message.media_url }
      : message,
  );
}
