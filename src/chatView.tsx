import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { compareMessagesOldestFirst, isMessageFromCurrentMember } from "./chatUtils";
import { getChatReplyPreview, summarizeChatReactions } from "./chatMessageMetadata";
import { formatSyncTime } from "./dateUtils";
import { CHAT_MEDIA_ACCEPT, getChatMediaLabel, type ChatMessageKind } from "./mediaUtils";
import { getMemberDisplayName } from "./profileUtils";

const CHAT_INPUT_PLACEHOLDER = "메시지를 입력하세요";
const MAX_CHAT_MESSAGE_LENGTH = 500;
const MESSAGE_ACTION_LONG_PRESS_MS = 520;
const REACTION_EMOJIS = ["❤️", "😂", "👍", "🥺"] as const;

type ChatMediaViewerDetails = {
  downloadLabel: string;
  fileName: string;
  kind: "image" | "video";
  openLabel: string;
  title: string;
  url: string;
};

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
  hasOlderMessages?: boolean;
  isLoadingOlderMessages?: boolean;
  loadOlderMessages?: () => void;
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

type ActivateChatReplyInput<TMessage> = {
  focusChatInput: () => void;
  message: TMessage;
  replyToMessage: (message: TMessage) => void;
  scheduleFocusRetry: (focusChatInput: () => void) => void;
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

export function isMessageActionShortcutKey(key: string) {
  return key === "Enter" || key === " ";
}

export function getChatMediaViewerDetails(
  message: Pick<ChatViewMessage, "media_file_name" | "media_url" | "message_type">,
): ChatMediaViewerDetails | null {
  if ((message.message_type !== "image" && message.message_type !== "video") || !message.media_url) {
    return null;
  }

  const title = getChatMediaLabel(message.message_type);
  const fallbackFileName = message.message_type === "video" ? "chat-video" : "chat-photo";

  return {
    downloadLabel: `${title} 다운로드`,
    fileName: message.media_file_name?.trim() || fallbackFileName,
    kind: message.message_type,
    openLabel: `${title} 크게 보기`,
    title,
    url: message.media_url,
  };
}

export function shouldCloseMessageActionsFromPointerTarget(
  target: Node | null,
  actionSurface: Pick<HTMLElement, "contains"> | null,
) {
  if (!target || !actionSurface) {
    return true;
  }

  return !actionSurface.contains(target);
}

export function activateChatReply<TMessage>({
  focusChatInput,
  message,
  replyToMessage,
  scheduleFocusRetry,
}: ActivateChatReplyInput<TMessage>) {
  focusChatInput();
  replyToMessage(message);
  scheduleFocusRetry(focusChatInput);
}

export function ChatView<TMessage extends ChatViewMessage>({
  messages,
  hasOlderMessages = false,
  isLoadingOlderMessages = false,
  loadOlderMessages = () => undefined,
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
  const pendingOlderScrollHeightRef = useRef<number | null>(null);
  const chatInputRef = useRef<HTMLInputElement | null>(null);
  const blurTimerRef = useRef<number | null>(null);
  const mediaInputRef = useRef<HTMLInputElement | null>(null);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);
  const actionPressTimerRef = useRef<number | null>(null);
  const didOpenActionFromPressRef = useRef(false);
  const [activeActionMessageId, setActiveActionMessageId] = useState<string | null>(null);
  const [mediaViewer, setMediaViewer] = useState<ChatMediaViewerDetails | null>(null);
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
  const loadOlderMessagesFromScroll = useCallback(() => {
    const chatList = chatListRef.current;
    if (!chatList || !hasOlderMessages || isLoadingOlderMessages || chatList.scrollTop > 80) {
      return;
    }

    pendingOlderScrollHeightRef.current = chatList.scrollHeight;
    loadOlderMessages();
  }, [hasOlderMessages, isLoadingOlderMessages, loadOlderMessages]);
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
  const scheduleChatInputFocusRetry = useCallback((focusInput: () => void) => {
    window.requestAnimationFrame(focusInput);
  }, []);
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
    didOpenActionFromPressRef.current = false;
    actionPressTimerRef.current = window.setTimeout(() => {
      actionPressTimerRef.current = null;
      didOpenActionFromPressRef.current = true;
      setActiveActionMessageId(messageId);
    }, MESSAGE_ACTION_LONG_PRESS_MS);
  }, [clearActionPressTimer]);
  const shouldSkipMediaViewerClick = useCallback(() => {
    if (!didOpenActionFromPressRef.current) {
      return false;
    }

    didOpenActionFromPressRef.current = false;
    return true;
  }, []);

  useLayoutEffect(() => {
    const previousScrollHeight = pendingOlderScrollHeightRef.current;
    if (previousScrollHeight !== null) {
      const chatList = chatListRef.current;
      pendingOlderScrollHeightRef.current = null;
      if (chatList) {
        chatList.scrollTop = Math.max(0, chatList.scrollHeight - previousScrollHeight);
      }
      return;
    }

    settleChatScrollToBottom();
  }, [chatMessages.length, settleChatScrollToBottom]);

  useEffect(() => {
    if (!isLoadingOlderMessages) {
      pendingOlderScrollHeightRef.current = null;
    }
  }, [isLoadingOlderMessages]);

  useEffect(() => {
    if (!activeActionMessageId) {
      return undefined;
    }

    function handleDocumentPointerDown(event: PointerEvent) {
      if (shouldCloseMessageActionsFromPointerTarget(event.target as Node | null, actionMenuRef.current)) {
        setActiveActionMessageId(null);
      }
    }

    window.addEventListener("pointerdown", handleDocumentPointerDown, true);
    return () => {
      window.removeEventListener("pointerdown", handleDocumentPointerDown, true);
    };
  }, [activeActionMessageId]);

  useEffect(() => {
    if (!mediaViewer) {
      return undefined;
    }

    function handleViewerKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMediaViewer(null);
      }
    }

    window.addEventListener("keydown", handleViewerKeyDown);
    return () => {
      window.removeEventListener("keydown", handleViewerKeyDown);
    };
  }, [mediaViewer]);

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
            <ol
              className="chat-list"
              aria-label="채팅 메시지 기록"
              ref={chatListRef}
              onScroll={loadOlderMessagesFromScroll}
            >
              {hasOlderMessages || isLoadingOlderMessages ? (
                <li className="chat-history-status">
                  {isLoadingOlderMessages ? "이전 메시지 불러오는 중" : "위로 올리면 이전 메시지를 불러와요"}
                </li>
              ) : null}
              {chatMessages.map((message) => {
                const isMine = isMessageFromCurrentMember(message, currentMemberKey, currentClientId);
                const senderName = isMine ? "나" : getMemberDisplayName(message.sender_member_key);
                const isMediaMessage = message.message_type === "image" || message.message_type === "video";
                const mediaViewerDetails = getChatMediaViewerDetails(message);
                const replyPreview = getChatReplyPreview(chatMessages, message.reply_to_message_id);
                const reactionSummaries = summarizeChatReactions(message.reactions, currentMemberKey);
                const isActionMenuOpen = activeActionMessageId === message.id;
                const messageMeta =
                  message.delivery_status === "sending" ? (
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
                  );

                return (
                  <li className={`chat-message ${isMine ? "mine" : "theirs"}`} key={message.id}>
                    <div className={`chat-message-stack ${isMine ? "side-end" : "side-start"}`}>
                      {replyPreview ? (
                        <div className="chat-message-context" aria-label="답장 대상">
                          <span>{getMemberDisplayName(replyPreview.sender_member_key)}</span>
                          <p>{replyPreview.text}</p>
                        </div>
                      ) : null}

                      <div className="chat-message-main">
                        {isMine ? <div className="chat-message-side-meta">{messageMeta}</div> : null}
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
                          onKeyDown={(event) => {
                            if (mediaViewerDetails) {
                              return;
                            }

                            if (!isMessageActionShortcutKey(event.key)) {
                              return;
                            }

                            event.preventDefault();
                            openMessageActions(message.id);
                          }}
                          role={mediaViewerDetails ? undefined : "button"}
                          tabIndex={mediaViewerDetails ? undefined : 0}
                          aria-label={mediaViewerDetails ? undefined : `${senderName} 메시지 작업`}
                        >
                          {isMediaMessage ? (
                            <div className={`chat-media-frame ${message.message_type}`}>
                              {mediaViewerDetails ? (
                                <button
                                  type="button"
                                  className="chat-media-open-button"
                                  aria-label={mediaViewerDetails.openLabel}
                                  onContextMenu={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    openMessageActions(message.id);
                                  }}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    if (shouldSkipMediaViewerClick()) {
                                      return;
                                    }

                                    setActiveActionMessageId(null);
                                    setMediaViewer(mediaViewerDetails);
                                  }}
                                  onPointerCancel={(event) => {
                                    event.stopPropagation();
                                    clearActionPressTimer();
                                  }}
                                  onPointerDown={(event) => {
                                    event.stopPropagation();
                                    startMessageActionPress(message.id);
                                  }}
                                  onPointerLeave={(event) => {
                                    event.stopPropagation();
                                    clearActionPressTimer();
                                  }}
                                  onPointerUp={(event) => {
                                    event.stopPropagation();
                                    clearActionPressTimer();
                                  }}
                                >
                                  {message.message_type === "image" ? (
                                    <img
                                      className="chat-media"
                                      src={mediaViewerDetails.url}
                                      alt={message.media_file_name || "보낸 사진"}
                                    />
                                  ) : (
                                    <video
                                      className="chat-media"
                                      src={mediaViewerDetails.url}
                                      playsInline
                                      preload="metadata"
                                    />
                                  )}
                                </button>
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
                        </div>
                        {!isMine ? <div className="chat-message-side-meta">{messageMeta}</div> : null}
                      </div>

                      {reactionSummaries.length || isActionMenuOpen ? (
                        <div className="chat-message-accessories">
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
                            <div className="chat-action-menu" role="menu" aria-label="메시지 작업" ref={actionMenuRef}>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveActionMessageId(null);
                                  activateChatReply({
                                    focusChatInput,
                                    message,
                                    replyToMessage,
                                    scheduleFocusRetry: scheduleChatInputFocusRetry,
                                  });
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
      {mediaViewer ? (
        <div
          className="chat-media-viewer"
          role="dialog"
          aria-modal="true"
          aria-label={`${mediaViewer.title} 크게 보기`}
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) {
              setMediaViewer(null);
            }
          }}
        >
          <div className="chat-media-viewer-shell">
            <div className="chat-media-viewer-toolbar">
              <strong>{mediaViewer.title}</strong>
              <div>
                <a
                  className="chat-media-viewer-button"
                  href={mediaViewer.url}
                  download={mediaViewer.fileName}
                  target="_blank"
                  rel="noreferrer"
                >
                  다운로드
                </a>
                <button type="button" className="chat-media-viewer-button" onClick={() => setMediaViewer(null)}>
                  닫기
                </button>
              </div>
            </div>
            <div className={`chat-media-viewer-stage ${mediaViewer.kind}`}>
              {mediaViewer.kind === "image" ? (
                <img className="chat-media-viewer-media" src={mediaViewer.url} alt={mediaViewer.fileName} />
              ) : (
                <video className="chat-media-viewer-media" src={mediaViewer.url} controls playsInline autoPlay />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
