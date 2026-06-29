import type { ChatMessage, ChatMessageReactionRow, ChatReactionSummary, MemberKey } from "./domainTypes";
import { getChatMediaLabel } from "./mediaUtils";
import type { ChatMessageKind } from "./mediaUtils";

type ReplyPreviewMessage = {
  body: string | null;
  id: string;
  message_type: ChatMessageKind;
  sender_member_key?: string | null;
};

type ReactionLike = {
  emoji: string;
  member_key: string;
  message_id: string;
};

type ReplyPreview = {
  id: string;
  sender_member_key: MemberKey;
  text: string;
};

export function getChatReplyPreview<TMessage extends ReplyPreviewMessage>(
  messages: TMessage[],
  replyToMessageId: string | null | undefined,
): ReplyPreview | null {
  if (!replyToMessageId) {
    return null;
  }

  const message = messages.find((item) => item.id === replyToMessageId);
  if (!message) {
    return null;
  }

  const mediaText = message.message_type === "text" ? "" : `${getChatMediaLabel(message.message_type)} 메시지`;
  return {
    id: message.id,
    sender_member_key: message.sender_member_key === "minhyeok" ? "minhyeok" : "jungseo",
    text: message.body || mediaText || "메시지",
  };
}

export function summarizeChatReactions(
  reactions: ReactionLike[] = [],
  currentMemberKey: string,
): ChatReactionSummary[] {
  const summaries = new Map<string, ChatReactionSummary>();

  reactions.forEach((reaction) => {
    const current = summaries.get(reaction.emoji) || {
      count: 0,
      emoji: reaction.emoji,
      reactedByMe: false,
    };

    current.count += 1;
    current.reactedByMe = current.reactedByMe || reaction.member_key === currentMemberKey;
    summaries.set(reaction.emoji, current);
  });

  return Array.from(summaries.values()).sort((first, second) => {
    const countOrder = second.count - first.count;
    return countOrder || first.emoji.localeCompare(second.emoji);
  });
}

export function attachChatReactions<TMessage extends ChatMessage>(
  messages: TMessage[],
  reactionRows: ChatMessageReactionRow[],
) {
  const reactionsByMessageId = new Map<string, ChatMessageReactionRow[]>();

  reactionRows.forEach((reaction) => {
    const reactions = reactionsByMessageId.get(reaction.message_id) || [];
    reactions.push(reaction);
    reactionsByMessageId.set(reaction.message_id, reactions);
  });

  return messages.map((message) => ({
    ...message,
    reactions: reactionsByMessageId.get(message.id) || [],
  }));
}
