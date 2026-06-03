import type { SupabaseClient } from "@supabase/supabase-js";
import { sendTextChatMessage, uploadChatMediaMessage } from "./coupleMutations";
import type { ChatMessage, CoupleMessageRow, MemberKey } from "./domainTypes";
import type { ChatMessageKind } from "./mediaUtils";
import { getChatMessageText } from "./mediaUtils";
import { sendPokeNotification } from "./pokeDelivery";
import { getPushDeliveryStatusMessage, type PushResult } from "./pushUtils";

type ChatMediaKind = Exclude<ChatMessageKind, "text">;

type SendTextMessageInput = {
  body: string;
  coupleCode: string;
  replyToMessageId?: string | null;
  senderId: string;
  senderMemberKey: MemberKey;
};

type SendTextMessage = (
  supabase: SupabaseClient,
  input: SendTextMessageInput,
) => Promise<{ data: CoupleMessageRow | null; error: unknown }>;

type SendPushInput = {
  coupleCode: string;
  coupleSecret: string;
  message: string;
  pokeId: string;
  senderId: string;
  senderMemberKey: MemberKey;
  senderName: string;
};

type SendPush = (supabase: SupabaseClient, input: SendPushInput) => Promise<PushResult | null | undefined>;

type SendTextChatWorkflowInput = {
  body: string;
  coupleCode: string;
  coupleSecret: string;
  getMessageText?: (message: CoupleMessageRow) => string;
  replyToMessageId?: string | null;
  senderId: string;
  senderMemberKey: MemberKey;
  senderName: string;
  sendMessage?: SendTextMessage;
  sendPush?: SendPush;
};

type SendTextChatWorkflowResult =
  | { status: "failed" }
  | { data: CoupleMessageRow; status: "sent"; statusMessage: string };

const TEXT_SENT_MESSAGE = "메시지를 보냈어요.";
const TEXT_PUSH_FAILED_MESSAGE = "메시지를 보냈어요. 핸드폰 푸시는 잠시 후 다시 확인해 주세요.";

type UploadMediaInput = {
  coupleCode: string;
  file: File;
  mediaKind: ChatMediaKind;
  replyToMessageId?: string | null;
  senderId: string;
  senderMemberKey: MemberKey;
  storagePath: string;
};

type UploadMediaMessage = (supabase: SupabaseClient, input: UploadMediaInput) => Promise<CoupleMessageRow>;
type SignMediaMessages = (messages: CoupleMessageRow[]) => Promise<ChatMessage[]>;

type SendMediaChatWorkflowInput = {
  coupleCode: string;
  coupleSecret: string;
  file: File;
  mediaKind: ChatMediaKind;
  mediaLabel: string;
  replyToMessageId?: string | null;
  senderId: string;
  senderMemberKey: MemberKey;
  senderName: string;
  sendPush?: SendPush;
  signMessages: SignMediaMessages;
  storagePath: string;
  uploadMessage?: UploadMediaMessage;
};

type SendMediaChatWorkflowResult =
  | { status: "failed" }
  | { data: ChatMessage; status: "sent"; statusMessage: string };

export async function sendTextChatWorkflow(
  supabase: SupabaseClient,
  {
    body,
    coupleCode,
    coupleSecret,
    getMessageText = getChatMessageText,
    replyToMessageId = null,
    senderId,
    senderMemberKey,
    senderName,
    sendMessage = async (client, input) => sendTextChatMessage(client, input),
    sendPush = sendPokeNotification,
  }: SendTextChatWorkflowInput,
): Promise<SendTextChatWorkflowResult> {
  const { data, error } = await sendMessage(supabase, {
    body,
    coupleCode,
    replyToMessageId,
    senderId,
    senderMemberKey,
  });

  if (error || !data) {
    return { status: "failed" };
  }

  try {
    const pushResult = await sendPush(supabase, {
      coupleCode,
      coupleSecret,
      message: getMessageText(data),
      pokeId: data.id,
      senderId,
      senderMemberKey,
      senderName,
    });

    return {
      data,
      status: "sent",
      statusMessage: getPushDeliveryStatusMessage(TEXT_SENT_MESSAGE, pushResult),
    };
  } catch {
    return {
      data,
      status: "sent",
      statusMessage: TEXT_PUSH_FAILED_MESSAGE,
    };
  }
}

export async function sendMediaChatWorkflow(
  supabase: SupabaseClient,
  {
    coupleCode,
    coupleSecret,
    file,
    mediaKind,
    mediaLabel,
    replyToMessageId = null,
    senderId,
    senderMemberKey,
    senderName,
    sendPush = sendPokeNotification,
    signMessages,
    storagePath,
    uploadMessage = uploadChatMediaMessage,
  }: SendMediaChatWorkflowInput,
): Promise<SendMediaChatWorkflowResult> {
  try {
    const data = await uploadMessage(supabase, {
      coupleCode,
      file,
      mediaKind,
      replyToMessageId,
      senderId,
      senderMemberKey,
      storagePath,
    });
    const [signedMessage] = await signMessages([data]);

    try {
      const pushMessage = `${mediaLabel}을 보냈어요`;
      const pushResult = await sendPush(supabase, {
        coupleCode,
        coupleSecret,
        message: pushMessage,
        pokeId: signedMessage.id,
        senderId,
        senderMemberKey,
        senderName,
      });

      return {
        data: signedMessage,
        status: "sent",
        statusMessage: getPushDeliveryStatusMessage(`${mediaLabel}을 보냈어요.`, pushResult),
      };
    } catch {
      return {
        data: signedMessage,
        status: "sent",
        statusMessage: `${mediaLabel}을 보냈어요. 핸드폰 푸시는 잠시 후 다시 확인해 주세요.`,
      };
    }
  } catch {
    return { status: "failed" };
  }
}
