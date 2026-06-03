import type { SupabaseClient } from "@supabase/supabase-js";
import { CHAT_MEDIA_BUCKET, CHAT_MESSAGE_SELECT, PHOTO_BUCKET } from "./coupleData";
import type { CoupleMessageRow, MemberKey } from "./domainTypes";
import { getPhotoExtension, type ChatMessageKind } from "./mediaUtils";

const PHOTO_UPLOAD_CACHE_CONTROL = "604800";

type AddCoupleEventInput = {
  coupleCode: string;
  title: string;
  startDate: string;
  endDate: string;
  time: string;
  memo: string;
};

type UpdateCoupleEventInput = Omit<AddCoupleEventInput, "coupleCode"> & {
  id: string;
};

type AddCoupleTodoInput = {
  coupleCode: string;
  title: string;
};

type UploadCouplePhotosInput = {
  coupleCode: string;
  createId?: () => string;
  date: string;
  files: File[];
  uploadedBy: MemberKey | null;
};

type DeleteCouplePhotoInput = {
  id: string;
  storagePath: string;
};

type SendTextChatMessageInput = {
  body: string;
  coupleCode: string;
  replyToMessageId?: string | null;
  senderId: string;
  senderMemberKey: MemberKey;
};

type UploadChatMediaMessageInput = {
  coupleCode: string;
  file: File;
  mediaKind: Exclude<ChatMessageKind, "text">;
  replyToMessageId?: string | null;
  senderId: string;
  senderMemberKey: MemberKey;
  storagePath: string;
};

type ReactToCoupleMessageInput = {
  coupleCode: string;
  emoji: string;
  memberKey: MemberKey;
  messageId: string;
};

export function addCoupleEvent(
  supabase: SupabaseClient,
  { coupleCode, title, startDate, endDate, time, memo }: AddCoupleEventInput,
) {
  return supabase.from("couple_events").insert({
    couple_code: coupleCode,
    title,
    event_date: startDate,
    event_end_date: endDate === startDate ? null : endDate,
    event_time: time || null,
    memo: memo || null,
  });
}

export function deleteCoupleEvent(supabase: SupabaseClient, id: string) {
  return supabase.from("couple_events").delete().eq("id", id);
}

export function updateCoupleEvent(
  supabase: SupabaseClient,
  { id, title, startDate, endDate, time, memo }: UpdateCoupleEventInput,
) {
  return supabase
    .from("couple_events")
    .update({
      title,
      event_date: startDate,
      event_end_date: endDate === startDate ? null : endDate,
      event_time: time || null,
      memo: memo || null,
    })
    .eq("id", id);
}

export function addCoupleTodo(supabase: SupabaseClient, { coupleCode, title }: AddCoupleTodoInput) {
  return supabase.from("couple_todos").insert({
    couple_code: coupleCode,
    title,
    completed: false,
  });
}

export function updateCoupleTodoCompleted(supabase: SupabaseClient, id: string, completed: boolean) {
  return supabase
    .from("couple_todos")
    .update({ completed })
    .eq("id", id);
}

export function deleteCoupleTodo(supabase: SupabaseClient, id: string) {
  return supabase.from("couple_todos").delete().eq("id", id);
}

export async function uploadCouplePhotos(
  supabase: SupabaseClient,
  { coupleCode, createId = () => crypto.randomUUID(), date, files, uploadedBy }: UploadCouplePhotosInput,
) {
  const uploadedPaths: string[] = [];
  const rows = [];

  try {
    for (const file of files) {
      const storagePath = `${coupleCode}/${date}/${createId()}.${getPhotoExtension(file)}`;
      const { error: uploadError } = await supabase.storage.from(PHOTO_BUCKET).upload(storagePath, file, {
        cacheControl: PHOTO_UPLOAD_CACHE_CONTROL,
        contentType: file.type || "image/jpeg",
        upsert: false,
      });

      if (uploadError) {
        throw uploadError;
      }

      uploadedPaths.push(storagePath);
      rows.push({
        couple_code: coupleCode,
        photo_date: date,
        storage_path: storagePath,
        uploaded_by: uploadedBy,
      });
    }

    const { error: insertError } = await supabase.from("couple_photos").insert(rows);
    if (insertError) {
      throw insertError;
    }

    return {
      uploadedCount: rows.length,
      storagePaths: uploadedPaths,
    };
  } catch (error) {
    if (uploadedPaths.length) {
      await supabase.storage.from(PHOTO_BUCKET).remove(uploadedPaths);
    }
    throw error;
  }
}

export async function deleteCouplePhoto(supabase: SupabaseClient, { id, storagePath }: DeleteCouplePhotoInput) {
  const { error: deleteError } = await supabase.from("couple_photos").delete().eq("id", id);
  if (deleteError) {
    return { deleteError, storageError: null };
  }

  const { error: storageError } = await supabase.storage.from(PHOTO_BUCKET).remove([storagePath]);
  return {
    deleteError: null,
    storageError: storageError || null,
  };
}

export function sendTextChatMessage(
  supabase: SupabaseClient,
  { body, coupleCode, replyToMessageId, senderId, senderMemberKey }: SendTextChatMessageInput,
) {
  return supabase
    .from("couple_messages")
    .insert({
      couple_code: coupleCode,
      sender_id: senderId,
      sender_member_key: senderMemberKey,
      body,
      message_type: "text",
      ...(replyToMessageId ? { reply_to_message_id: replyToMessageId } : {}),
    })
    .select(CHAT_MESSAGE_SELECT)
    .single<CoupleMessageRow>();
}

export async function uploadChatMediaMessage(
  supabase: SupabaseClient,
  { coupleCode, file, mediaKind, replyToMessageId, senderId, senderMemberKey, storagePath }: UploadChatMediaMessageInput,
) {
  let uploadedPath = "";

  try {
    const { error: uploadError } = await supabase.storage.from(CHAT_MEDIA_BUCKET).upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

    if (uploadError) {
      throw uploadError;
    }

    uploadedPath = storagePath;
    const { data, error: insertError } = await supabase
      .from("couple_messages")
      .insert({
        couple_code: coupleCode,
        sender_id: senderId,
        sender_member_key: senderMemberKey,
        body: file.name || null,
        message_type: mediaKind,
        media_storage_path: storagePath,
        media_mime_type: file.type,
        media_size: file.size,
        media_file_name: file.name || null,
        ...(replyToMessageId ? { reply_to_message_id: replyToMessageId } : {}),
      })
      .select(CHAT_MESSAGE_SELECT)
      .single<CoupleMessageRow>();

    if (insertError || !data) {
      throw insertError || new Error("Unable to save chat media message");
    }

    return data;
  } catch (error) {
    if (uploadedPath) {
      await supabase.storage.from(CHAT_MEDIA_BUCKET).remove([uploadedPath]);
    }

    throw error;
  }
}

export function reactToCoupleMessage(
  supabase: SupabaseClient,
  { coupleCode, emoji, memberKey, messageId }: ReactToCoupleMessageInput,
) {
  return supabase.from("couple_message_reactions").upsert(
    {
      couple_code: coupleCode,
      message_id: messageId,
      member_key: memberKey,
      emoji,
    },
    { onConflict: "message_id,member_key" },
  );
}
