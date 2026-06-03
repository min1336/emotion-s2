type ChatMessageOrderable = {
  id: string;
  created_at: string;
};

type ChatMessageIdentity = {
  sender_id: string;
  sender_member_key?: string | null;
};

type ChatMessageDelivery = {
  delivery_status?: "sending" | "failed";
  id: string;
};

function compareMessagesNewestFirst(first: ChatMessageOrderable, second: ChatMessageOrderable) {
  const dateOrder = second.created_at.localeCompare(first.created_at);
  if (dateOrder !== 0) {
    return dateOrder;
  }

  return second.id.localeCompare(first.id);
}

export function compareMessagesOldestFirst(first: ChatMessageOrderable, second: ChatMessageOrderable) {
  const dateOrder = first.created_at.localeCompare(second.created_at);
  if (dateOrder !== 0) {
    return dateOrder;
  }

  return first.id.localeCompare(second.id);
}

export function mergeChatMessages<T extends ChatMessageOrderable>(
  current: T[],
  incoming: T[],
  maxHistory?: number,
) {
  const uniqueMessages = new Map<string, T>();

  [...incoming, ...current].forEach((message) => {
    uniqueMessages.set(message.id, message);
  });

  const mergedMessages = Array.from(uniqueMessages.values()).sort(compareMessagesNewestFirst);

  return typeof maxHistory === "number" ? mergedMessages.slice(0, maxHistory) : mergedMessages;
}

export function replaceChatMessage<T extends ChatMessageOrderable>(
  current: T[],
  replaceId: string,
  message: T,
  maxHistory?: number,
) {
  return mergeChatMessages(
    current.filter((currentMessage) => currentMessage.id !== replaceId),
    [message],
    maxHistory,
  );
}

export function markChatMessageFailed<T extends ChatMessageDelivery>(current: T[], failedMessageId: string) {
  return current.map((currentMessage) =>
    currentMessage.id === failedMessageId
      ? { ...currentMessage, delivery_status: "failed" as const }
      : currentMessage,
  );
}

export function isMessageFromCurrentMember(
  message: ChatMessageIdentity,
  currentMemberKey: string,
  currentClientId: string,
) {
  if (message.sender_member_key && currentMemberKey) {
    return message.sender_member_key === currentMemberKey;
  }

  return message.sender_id === currentClientId;
}
