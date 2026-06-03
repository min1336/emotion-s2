import { useCallback, useEffect, useRef, useState } from "react";
import { compareMessagesOldestFirst, isMessageFromCurrentMember } from "./chatUtils";
import { getChatReplyPreview, summarizeChatReactions } from "./chatMessageMetadata";
import { formatSyncTime } from "./dateUtils";
import { CHAT_MEDIA_ACCEPT, getChatMediaLabel, type ChatMessageKind } from "./mediaUtils";
import { getMemberDisplayName } from "./profileUtils";

const CHAT_INPUT_PLACEHOLDER = "메시지를 입력하세요";
const MAX_CHAT_MESSAGE_LENGTH = 500;
const MESSAGE_ACTION_LONG_PRESS_MS = 520;
const REACTION_EMOJIS = ["❤️", "😂", "👍", "🥺"] as const;

type ChatViewMessage = {
  id: string;
  body: string | null;
  sender_id: string;
  sender_member_key?: string | null;
  message_type: ChatMessageKind;
  media_url?: string;
  media_file_name?: string | null;
  reactions?: Array<{ emoji: string; member_key: string; message_id: string }>;
  reply_to_message_id?: string | null;
  created_at: string;
  delivery_status?: "sending" | "failed";
};

type ChatViewProps<TMessage extends ChatViewMessage> = {
  messages: TMessage[];
  currentClientId: string;
  currentMemberKey: string;
  chatMessage: string;
  sendChatMessage: (messageOverride?: string, failedMessageId?: string) => void;
  sendChatMedia: (file: File) => void;
  retryChatMessage: (message: TMessage) => void;
  reactToMessage?: (message: TMessage, emoji: string) => void;
  replyTargetMessageId?: string | null;
  replyToMessage?: (message: TMessage) => void;
  clearReplyTarget?: () => void;
  setChatMessage: (message: string) => void;
  isUploadingChatMedia: boolean;
  refreshViewportMetrics?: () => void;
};

type SubmitChatComposerInput = {
  focusChatInput: () => void;
  preventDefault: () => void;
  sendChatMessage: () => void;
};

function setChatInputFocusState(isFocused: boolean, refreshViewportMetrics: () => void) {
  document.documentElement.classList.toggle("chat-input-focused", isFocused);
  document.body.classList.toggle("chat-input-focused", isFocused);
  refreshViewportMetrics();
  [80, 240, 520].forEach((delay) => {
    window.setTimeout(refreshViewportMetrics, delay);
  });
}

export function submitChatComposer({
  focusChatInput,
  preventDefault,
  sendChatMessage,
}: SubmitChatComposerInput) {
  preventDefault();
  sendChatMessage();
  focusChatInput();
}

export function ChatView<TMessage extends ChatViewMessage>({
  messages,
  currentClientId,
  currentMemberKey,
  chatMessage,
  sendChatMessage,
  sendChatMedia,
  retryChatMessage,
  reactToMessage = () => undefined,
  replyTargetMessageId = null,
  replyToMessage = () => undefined,
  clearReplyTarget = () => undefined,
  setChatMessage,
  isUploadingChatMedia,
  refreshViewportMetrics = () => undefined,
}: ChatViewProps<TMessage>) {
  const chatListRef = useRef<HTMLOListElement | null>(null);
  const chatInputRef = useRef<HTMLInputElement | null>(null);
  const blurTimerRef = useRef<number | null>(null);
  const mediaInputRef = useRef<HTMLInputElement | null>(null);
  const actionPressTimerRef = useRef<number | null>(null);
  const [activeActionMessageId, setActiveActionMessageId] = useState<string | null>(null);
  const chatMessages = [...messages].sort(compareMessagesOldestFirst);
  const sendingCount = messages.filter((message) => message.delivery_status === "sending").length;
  const failedCount = messages.filter((message) => message.delivery_status === "failed").length;
  const shouldShowSyncRow = sendingCount > 0 || failedCount > 0;
  const scrollChatToBottom = useCallback(() => {
    const chatList = chatListRef.current;
    if (!chatList) {
      return;
    }

    const lastMessage = chatList.lastElementChild;
    if (!(lastMessage instanceof HTMLElement)) {
      chatList.scrollTop = chatList.scrollHeight;
      return;
    }

    chatList.scrollTop = Math.max(0, lastMessage.offsetTop + lastMessage.offsetHeight - chatList.clientHeight + 18);
  }, []);
  const settleChatScrollToBottom = useCallback(() => {
    scrollChatToBottom();
    window.requestAnimationFrame(scrollChatToBottom);
    [180, 420].forEach((delay) => window.setTimeout(scrollChatToBottom, delay));
  }, [scrollChatToBottom]);
  const clearChatInputBlurTimer = useCallback(() => {
    if (!blurTimerRef.current) {
      return;
    }

    window.clearTimeout(blurTimerRef.current);
    blurTimerRef.current = null;
  }, []);
  const focusChatInput = useCallback(() => {
    clearChatInputBlurTimer();
    chatInputRef.current?.focus({ preventScroll: true });
    setChatInputFocusState(true, refreshViewportMetrics);
    window.requestAnimationFrame(refreshViewportMetrics);
  }, [clearChatInputBlurTimer, refreshViewportMetrics]);
  const clearActionPressTimer = useCallback(() => {
    if (!actionPressTimerRef.current) {
      return;
    }

    window.clearTimeout(actionPressTimerRef.current);
    actionPressTimerRef.current = null;
  }, []);
  const openMessageActions = useCallback((messageId: string) => {
    clearActionPressTimer();
    setActiveActionMessageId(messageId);
  }, [clearActionPressTimer]);
  const startMessageActionPress = useCallback((messageId: string) => {
    clearActionPressTimer();
    actionPressTimerRef.current = window.setTimeout(() => {
      actionPressTimerRef.current = null;
      setActiveActionMessageId(messageId);
    }, MESSAGE_ACTION_LONG_PRESS_MS);
  }, [clearActionPressTimer]);

  useEffect(() => {
    settleChatScrollToBottom();
  }, [chatMessages.length, settleChatScrollToBottom]);

  useEffect(() => {
    return () => {
      clearActionPressTimer();
      clearChatInputBlurTimer();
      setChatInputFocusState(false, refreshViewportMetrics);
    };
  }, [clearActionPressTimer, clearChatInputBlurTimer, refreshViewportMetrics]);

  return (
    <div className="screen-stack chat-screen">
      <section className="chat-panel">
        <div className="chat-stage">
          {chatMessages.length ? (
            <ol className="chat-list" aria-label="채팅 메시지 기록" ref={chatListRef}>
              {chatMessages.map((message) => {
                const isMine = isMessageFromCurrentMember(message, currentMemberKey, currentClientId);
                const senderName = isMine ? "나" : getMemberDisplayName(message.sender_member_key);
                const isMediaMessage = message.message_type === "image" || message.message_type === "video";
                const replyPreview = getChatReplyPreview(chatMessages, message.reply_to_message_id);
                const reactionSummaries = summarizeChatReactions(message.reactions, currentMemberKey);
                const isActionMenuOpen = activeActionMessageId === message.id;

                return (
                  <li className={`chat-message ${isMine ? "mine" : "theirs"}`} key={message.id}>
                    <div
                      className="chat-bubble"
                      onContextMenu={(event) => {
                        event.preventDefault();
                        openMessageActions(message.id);
                      }}
                      onPointerCancel={clearActionPressTimer}
                      onPointerDown={() => startMessageActionPress(message.id)}
                      onPointerLeave={clearActionPressTimer}
                      onPointerUp={clearActionPressTimer}
                      role="button"
                      tabIndex={0}
                      aria-label={`${senderName} 메시지 작업`}
                    >
                      <span className="chat-sender">{senderName}</span>
                      {replyPreview ? (
                        <div className="chat-reply-preview" aria-label="답장 대상">
                          <span>{getMemberDisplayName(replyPreview.sender_member_key)}</span>
                          <p>{replyPreview.text}</p>
                        </div>
                      ) : null}
                      {isMediaMessage ? (
                        <div className={`chat-media-frame ${message.message_type}`}>
                          {message.message_type === "image" && message.media_url ? (
                            <img
                              className="chat-media"
                              src={message.media_url}
                              alt={message.media_file_name || "보낸 사진"}
                            />
                          ) : null}
                          {message.message_type === "video" && message.media_url ? (
                            <video className="chat-media" src={message.media_url} controls playsInline preload="metadata" />
                          ) : null}
                          {!message.media_url ? (
                            <span className="chat-media-placeholder">
                              {getChatMediaLabel(message.message_type)} 불러오는 중
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <p>{message.body}</p>
                      )}
                      <div className="chat-message-meta">
                        {message.delivery_status === "sending" ? (
                          <span>전송 중</span>
                        ) : message.delivery_status === "failed" ? (
                          <>
                            <span>전송 실패</span>
                            <button type="button" onClick={() => retryChatMessage(message)}>
                              다시 보내기
                            </button>
                          </>
                        ) : (
                          <time dateTime={message.created_at}>{formatSyncTime(message.created_at)}</time>
                        )}
                      </div>
                      {reactionSummaries.length ? (
                        <div className="chat-reaction-row" aria-label="이모티콘 반응">
                          {reactionSummaries.map((reaction) => (
                            <span
                              className={`chat-reaction-chip ${reaction.reactedByMe ? "mine" : ""}`}
                              key={reaction.emoji}
                            >
                              {reaction.emoji} {reaction.count}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {isActionMenuOpen ? (
                        <div className="chat-action-menu" role="menu" aria-label="메시지 작업">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveActionMessageId(null);
                              replyToMessage(message);
                              focusChatInput();
                            }}
                          >
                            답장하기
                          </button>
                          <div className="chat-reaction-picker" aria-label="이모티콘">
                            {REACTION_EMOJIS.map((emoji) => (
                              <button
                                type="button"
                                key={emoji}
                                onClick={() => {
                                  setActiveActionMessageId(null);
                                  reactToMessage(message, emoji);
                                }}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="empty-state chat-empty">아직 주고받은 메시지가 없어요.</p>
          )}
        </div>

        <div className="chat-composer-card">
          {replyTargetMessageId ? (
            <div className="chat-composer-reply">
              {(() => {
                const replyPreview = getChatReplyPreview(chatMessages, replyTargetMessageId);
                return replyPreview ? (
                  <>
                    <div>
                      <span>답장 중</span>
                      <p>{getMemberDisplayName(replyPreview.sender_member_key)} · {replyPreview.text}</p>
                    </div>
                    <button type="button" aria-label="답장 취소" onClick={clearReplyTarget}>
                      ×
                    </button>
                  </>
                ) : null;
              })()}
            </div>
          ) : null}
          {shouldShowSyncRow ? (
            <div className="chat-sync-row">
              {sendingCount ? <span>전송 중 {sendingCount}</span> : null}
              {failedCount ? <strong>실패 {failedCount}</strong> : null}
            </div>
          ) : null}
          <form
            className="chat-composer"
            onSubmit={(event) => {
              submitChatComposer({
                focusChatInput,
                preventDefault: () => event.preventDefault(),
                sendChatMessage,
              });
            }}
            aria-busy={sendingCount > 0 || isUploadingChatMedia}
          >
            <button
              type="button"
              className="chat-media-button"
              disabled={isUploadingChatMedia}
              onClick={() => mediaInputRef.current?.click()}
              aria-label="사진 또는 동영상 보내기"
            >
              +
            </button>
            <input
              ref={mediaInputRef}
              className="sr-only"
              type="file"
              accept={CHAT_MEDIA_ACCEPT}
              onChange={(event) => {
                const [file] = Array.from(event.target.files || []);
                event.target.value = "";
                if (file) {
                  sendChatMedia(file);
                }
              }}
            />
            <label className="chat-message-field">
              <span className="sr-only">채팅 메시지</span>
              <input
                ref={chatInputRef}
                className="chat-message-input"
                aria-label="채팅 메시지"
                value={chatMessage}
                onChange={(event) => setChatMessage(event.target.value.slice(0, MAX_CHAT_MESSAGE_LENGTH))}
                onFocus={() => {
                  clearChatInputBlurTimer();
                  setChatInputFocusState(true, refreshViewportMetrics);
                }}
                onBlur={() => {
                  clearChatInputBlurTimer();
                  blurTimerRef.current = window.setTimeout(() => {
                    blurTimerRef.current = null;
                    if (document.activeElement === chatInputRef.current) {
                      return;
                    }

                    setChatInputFocusState(false, refreshViewportMetrics);
                    settleChatScrollToBottom();
                  }, 120);
                }}
                placeholder={CHAT_INPUT_PLACEHOLDER}
                maxLength={MAX_CHAT_MESSAGE_LENGTH}
              />
            </label>
            <button type="submit" disabled={!chatMessage.trim()}>
              보내기
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
