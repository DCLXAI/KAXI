"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowUp, MessageCircle, Paperclip, RefreshCcw, Smile, X } from "lucide-react";
import { KaxiRunningCat } from "@/components/brand/KaxiRunningCat";

const HIDDEN_PATH_PREFIXES = ["/admin", "/partner", "/student", "/login", "/agent", "/consult"];
const LOCALE_PREFIX_RE = /^\/(ko|en|vi|mn)(?=\/|$)/;

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
  nextStep?: string;
  sources?: ChatSource[];
  retryQuestion?: string;
  retryRequestId?: string;
};

type ChatSource = {
  title?: string;
  source?: string;
  sourceUrl?: string;
  checkedAt?: string;
};

type RagResponse = {
  answer?: string;
  nextStep?: string;
  sources?: ChatSource[];
  error?: string;
};

type RestoredExchange = {
  id: string;
  requestId: string;
  question: string;
  answer: string;
  status: "completed" | "failed";
  errorCode?: string;
  nextStep?: string;
  sources?: ChatSource[];
};

type RestoredAttachment = {
  id: string;
  bucket: string;
  storageKey: string;
  name: string;
  size: number;
  type: string;
  sha256: string;
  status: "processing" | "ready" | "error";
  error?: string;
};

type ChatSessionSnapshotResponse = {
  sessionId?: string;
  messages?: RestoredExchange[];
  attachments?: RestoredAttachment[];
  error?: string;
};

type UploadedAttachment = {
  id: string;
  attachmentId?: string;
  name: string;
  size: number;
  type: string;
  status: "uploading" | "processing" | "ready" | "deleting" | "error";
  bucket?: string;
  storageKey?: string;
  sha256?: string;
  error?: string;
  localFile?: File;
};

type WidgetLocale = "ko" | "en" | "vi" | "mn";

type WidgetCopy = {
  regionLabel: string;
  openLabel: string;
  closeLabel: string;
  resetLabel: string;
  greeting: [string, string, string];
  statusLabel: string;
  prompt: string;
  placeholder: string;
  inputLabel: string;
  attachLabel: string;
  emojiLabel: string;
  sendLabel: string;
  footer: string;
  sessionError: string;
  nextStep: string;
  officialSource: string;
  checked: string;
  retry: string;
  loading: string;
  restoredAnswerMissing: string;
  restoredSendFailed: string;
  answerMissing: string;
  connectionError: string;
  attachmentSummary: string;
  attachmentOnlyQuestion: string;
  attachmentReadFailed: string;
  attachmentTimedOut: string;
  processingFailed: string;
  uploadFailed: string;
  deleteFailed: string;
  fileStatus: Record<UploadedAttachment["status"], string>;
  retryUpload: (name: string) => string;
  deleteFile: (name: string) => string;
  insertEmoji: (emoji: string) => string;
};

const WIDGET_COPY: Record<WidgetLocale, WidgetCopy> = {
  ko: {
    regionLabel: "KAXI 상담 채팅",
    openLabel: "KAXI 상담 열기",
    closeLabel: "KAXI 상담 닫기",
    resetLabel: "다시 시작",
    greeting: [
      "안녕하세요! 반가워요 👋",
      "한국 유학 준비 상담, KAXI 데모에 오신 것을 환영합니다.",
      "KAXI가 질문을 이해하고 공식 자료를 바탕으로 필요한 정보를 안내해 드릴게요.",
    ],
    statusLabel: "KAXI Demo v1 · 상담 가능",
    prompt: "KAXI에게 궁금한 내용을 물어보세요!",
    placeholder: "KAXI에게 질문해 주세요.",
    inputLabel: "KAXI 상담 질문",
    attachLabel: "파일 첨부",
    emojiLabel: "이모지",
    sendLabel: "질문 보내기",
    footer: "KAXI는 공식 지식 기반 안내를 제공합니다.",
    sessionError: "상담 연결을 준비하지 못했습니다. 다시 시작을 눌러주세요.",
    nextStep: "다음 단계",
    officialSource: "공식 출처",
    checked: "확인",
    retry: "다시 시도",
    loading: "공식 문서를 기준으로 확인하고 있어요.",
    restoredAnswerMissing: "답변 기록을 복원하지 못했습니다.",
    restoredSendFailed: "이전 질문 전송이 완료되지 않았습니다.",
    answerMissing: "확인된 답변을 가져오지 못했습니다. 질문을 조금 더 구체적으로 입력해주세요.",
    connectionError: "잠시 연결이 매끄럽지 않습니다. 조금 뒤 다시 질문해주세요.",
    attachmentSummary: "첨부파일",
    attachmentOnlyQuestion: "첨부파일을 확인해 주세요.",
    attachmentReadFailed: "첨부 내용을 읽지 못했습니다.",
    attachmentTimedOut: "첨부 처리 시간이 초과되었습니다.",
    processingFailed: "처리 실패",
    uploadFailed: "업로드 실패",
    deleteFailed: "삭제하지 못했습니다.",
    fileStatus: { uploading: "업로드 중", processing: "검사 중", ready: "준비됨", deleting: "삭제 중", error: "실패" },
    retryUpload: (name) => `${name} 다시 업로드`,
    deleteFile: (name) => `${name} 삭제`,
    insertEmoji: (emoji) => `${emoji} 이모지 입력`,
  },
  en: {
    regionLabel: "KAXI consultation chat",
    openLabel: "Open KAXI chat",
    closeLabel: "Close KAXI chat",
    resetLabel: "Start over",
    greeting: [
      "Hello! Nice to meet you 👋",
      "Welcome to the KAXI study-in-Korea consultation demo.",
      "KAXI will understand your question and guide you using verified official sources.",
    ],
    statusLabel: "KAXI Demo v1 · Online",
    prompt: "Ask KAXI anything about studying in Korea!",
    placeholder: "Ask KAXI a question.",
    inputLabel: "Question for KAXI",
    attachLabel: "Attach file",
    emojiLabel: "Emoji",
    sendLabel: "Send question",
    footer: "KAXI provides guidance grounded in official sources.",
    sessionError: "We could not prepare the chat. Please select Start over.",
    nextStep: "Next step",
    officialSource: "Official source",
    checked: "checked",
    retry: "Try again",
    loading: "Checking the relevant official sources.",
    restoredAnswerMissing: "We could not restore this answer.",
    restoredSendFailed: "The previous question was not delivered.",
    answerMissing: "No verified answer was returned. Please make your question a little more specific.",
    connectionError: "The connection is temporarily unavailable. Please try again shortly.",
    attachmentSummary: "Attachments",
    attachmentOnlyQuestion: "Please review the attached file.",
    attachmentReadFailed: "We could not read the attachment.",
    attachmentTimedOut: "Attachment processing timed out.",
    processingFailed: "Processing failed",
    uploadFailed: "Upload failed",
    deleteFailed: "Could not delete the file.",
    fileStatus: { uploading: "Uploading", processing: "Checking", ready: "Ready", deleting: "Deleting", error: "Failed" },
    retryUpload: (name) => `Upload ${name} again`,
    deleteFile: (name) => `Delete ${name}`,
    insertEmoji: (emoji) => `Insert ${emoji}`,
  },
  vi: {
    regionLabel: "Tư vấn KAXI",
    openLabel: "Mở tư vấn KAXI",
    closeLabel: "Đóng tư vấn KAXI",
    resetLabel: "Bắt đầu lại",
    greeting: [
      "Xin chào! Rất vui được gặp bạn 👋",
      "Chào mừng bạn đến với bản demo tư vấn du học Hàn Quốc của KAXI.",
      "KAXI sẽ hiểu câu hỏi và hướng dẫn dựa trên các nguồn chính thức đã kiểm chứng.",
    ],
    statusLabel: "KAXI Demo v1 · Đang trực tuyến",
    prompt: "Hãy hỏi KAXI về việc du học Hàn Quốc!",
    placeholder: "Đặt câu hỏi cho KAXI.",
    inputLabel: "Câu hỏi cho KAXI",
    attachLabel: "Đính kèm tệp",
    emojiLabel: "Biểu tượng cảm xúc",
    sendLabel: "Gửi câu hỏi",
    footer: "KAXI cung cấp hướng dẫn dựa trên nguồn chính thức.",
    sessionError: "Không thể chuẩn bị cuộc trò chuyện. Vui lòng chọn Bắt đầu lại.",
    nextStep: "Bước tiếp theo",
    officialSource: "Nguồn chính thức",
    checked: "đã kiểm tra",
    retry: "Thử lại",
    loading: "Đang kiểm tra các tài liệu chính thức liên quan.",
    restoredAnswerMissing: "Không thể khôi phục câu trả lời này.",
    restoredSendFailed: "Câu hỏi trước chưa được gửi thành công.",
    answerMissing: "Chưa nhận được câu trả lời đã xác minh. Vui lòng hỏi cụ thể hơn.",
    connectionError: "Kết nối đang tạm gián đoạn. Vui lòng thử lại sau.",
    attachmentSummary: "Tệp đính kèm",
    attachmentOnlyQuestion: "Vui lòng kiểm tra tệp đính kèm.",
    attachmentReadFailed: "Không thể đọc tệp đính kèm.",
    attachmentTimedOut: "Quá thời gian xử lý tệp đính kèm.",
    processingFailed: "Xử lý thất bại",
    uploadFailed: "Tải lên thất bại",
    deleteFailed: "Không thể xóa tệp.",
    fileStatus: { uploading: "Đang tải", processing: "Đang kiểm tra", ready: "Sẵn sàng", deleting: "Đang xóa", error: "Thất bại" },
    retryUpload: (name) => `Tải lại ${name}`,
    deleteFile: (name) => `Xóa ${name}`,
    insertEmoji: (emoji) => `Chèn ${emoji}`,
  },
  mn: {
    regionLabel: "KAXI зөвлөгөөний чат",
    openLabel: "KAXI чатыг нээх",
    closeLabel: "KAXI чатыг хаах",
    resetLabel: "Дахин эхлэх",
    greeting: [
      "Сайн байна уу! Танилцахад таатай байна 👋",
      "KAXI-ийн Солонгост суралцах зөвлөгөөний демод тавтай морилно уу.",
      "KAXI таны асуултыг ойлгож, баталгаажсан албан эх сурвалжид тулгуурлан чиглүүлнэ.",
    ],
    statusLabel: "KAXI Demo v1 · Онлайн",
    prompt: "Солонгост суралцах талаар KAXI-аас асуугаарай!",
    placeholder: "KAXI-аас асуултаа асууна уу.",
    inputLabel: "KAXI-д өгөх асуулт",
    attachLabel: "Файл хавсаргах",
    emojiLabel: "Эможи",
    sendLabel: "Асуулт илгээх",
    footer: "KAXI албан эх сурвалжид тулгуурласан мэдээлэл өгдөг.",
    sessionError: "Чатыг бэлдэж чадсангүй. Дахин эхлэхийг сонгоно уу.",
    nextStep: "Дараагийн алхам",
    officialSource: "Албан эх сурвалж",
    checked: "шалгасан",
    retry: "Дахин оролдох",
    loading: "Холбогдох албан материалыг шалгаж байна.",
    restoredAnswerMissing: "Энэ хариултыг сэргээж чадсангүй.",
    restoredSendFailed: "Өмнөх асуулт илгээгдээгүй байна.",
    answerMissing: "Баталгаажсан хариулт ирсэнгүй. Асуултаа арай тодорхой болгоно уу.",
    connectionError: "Холболт түр саатлаа. Удалгүй дахин оролдоно уу.",
    attachmentSummary: "Хавсралт",
    attachmentOnlyQuestion: "Хавсаргасан файлыг шалгана уу.",
    attachmentReadFailed: "Хавсралтыг уншиж чадсангүй.",
    attachmentTimedOut: "Хавсралт боловсруулах хугацаа дууслаа.",
    processingFailed: "Боловсруулж чадсангүй",
    uploadFailed: "Байршуулж чадсангүй",
    deleteFailed: "Файлыг устгаж чадсангүй.",
    fileStatus: { uploading: "Байршуулж байна", processing: "Шалгаж байна", ready: "Бэлэн", deleting: "Устгаж байна", error: "Алдаа" },
    retryUpload: (name) => `${name} файлыг дахин байршуулна`,
    deleteFile: (name) => `${name} файлыг устгана`,
    insertEmoji: (emoji) => `${emoji} оруулах`,
  },
};

const EMOJI_OPTIONS = ["🙂", "😊", "👍", "🙏", "📄", "✈️", "🏫", "💬"];

const INITIAL_MESSAGE_ID = "welcome";

function initialMessage(copy: WidgetCopy): ChatMessage {
  return { id: INITIAL_MESSAGE_ID, role: "assistant", text: copy.greeting.join("\n") };
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function restoredMessages(exchanges: RestoredExchange[], copy: WidgetCopy): ChatMessage[] {
  return exchanges.flatMap((exchange) => {
    const userMessage: ChatMessage = {
      id: `history-${exchange.id}-user`,
      role: "user",
      text: exchange.question,
    };
    const assistantMessage: ChatMessage = exchange.status === "completed"
      ? {
          id: `history-${exchange.id}-assistant`,
          role: "assistant",
          text: exchange.answer || copy.restoredAnswerMissing,
          nextStep: exchange.nextStep,
          sources: exchange.sources,
        }
      : {
          id: `history-${exchange.id}-failed`,
          role: "assistant",
          text: copy.restoredSendFailed,
          retryQuestion: exchange.question,
          retryRequestId: exchange.requestId,
        };
    return [userMessage, assistantMessage];
  });
}

function restoredAttachments(attachments: RestoredAttachment[]): UploadedAttachment[] {
  return attachments.map((attachment) => ({
    id: attachment.id,
    attachmentId: attachment.id,
    name: attachment.name,
    size: attachment.size,
    type: attachment.type,
    status: attachment.status,
    bucket: attachment.bucket,
    storageKey: attachment.storageKey,
    sha256: attachment.sha256,
    error: attachment.error,
  }));
}

function waitForPoll(signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const onAbort = () => {
      window.clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    const timer = window.setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, 1500);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

async function waitForAttachment(
  sessionId: string,
  attachmentId: string,
  copy: WidgetCopy,
  signal?: AbortSignal,
) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await waitForPoll(signal);
    const statusResponse = await fetch(
      `/api/chat-attachments?sessionId=${encodeURIComponent(sessionId)}&attachmentId=${encodeURIComponent(attachmentId)}`,
      { signal },
    );
    const statusData = (await statusResponse.json().catch(() => ({}))) as {
      attachment?: {
        status?: string;
        processing_status?: string;
        storage_key?: string;
      };
      error?: string;
    };
    if (!statusResponse.ok || !statusData.attachment) {
      throw new Error(statusData.error || "attachment status failed");
    }
    if (statusData.attachment.status === "ready") {
      return { storageKey: statusData.attachment.storage_key };
    }
    if (statusData.attachment.processing_status === "failed") {
      throw new Error(copy.attachmentReadFailed);
    }
  }
  throw new Error(copy.attachmentTimedOut);
}

function shouldHideChatbot(pathname: string) {
  const publicPath = pathname.replace(LOCALE_PREFIX_RE, "") || "/";
  return HIDDEN_PATH_PREFIXES.some(
    (prefix) => publicPath === prefix || publicPath.startsWith(`${prefix}/`),
  );
}

export function TypebotBubble() {
  const pathname = usePathname();
  const locale = (pathname.match(LOCALE_PREFIX_RE)?.[1] ?? "ko") as WidgetLocale;
  const copy = WIDGET_COPY[locale];
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [initialMessage(copy)]);
  const [attachedFiles, setAttachedFiles] = useState<UploadedAttachment[]>([]);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [sessionError, setSessionError] = useState(false);
  const [attachmentsEnabled, setAttachmentsEnabled] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isHidden = shouldHideChatbot(pathname);
  const publicPath = pathname.replace(LOCALE_PREFIX_RE, "") || "/";
  const hideOnMobile = publicPath === "/diagnose";
  const conversationMessages = messages.filter((message) => message.id !== INITIAL_MESSAGE_ID);
  const uploadedAttachments = attachedFiles.filter((file) => file.status === "ready" && file.storageKey && file.bucket);
  const hasPendingAttachments = attachedFiles.some((file) => ["uploading", "processing", "deleting"].includes(file.status));

  useEffect(() => {
    if (isHidden) return;

    let active = true;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch("/api/chat-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale }),
          signal: controller.signal,
        });
        const data = (await response.json()) as {
          sessionId?: string;
          error?: string;
          capabilities?: { attachments?: boolean };
        };
        if (!response.ok || !data.sessionId) throw new Error(data.error || "chat session failed");
        if (!active) return;
        setSessionId(data.sessionId);
        setAttachmentsEnabled(data.capabilities?.attachments === true);
        setSessionError(false);

        const historyResponse = await fetch("/api/chat-session", {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });
        const snapshot = (await historyResponse.json().catch(() => ({}))) as ChatSessionSnapshotResponse;
        if (!historyResponse.ok) {
          console.warn("[KAXI chat history]", snapshot.error || "chat history restore failed");
          return;
        }
        if (!active || snapshot.sessionId !== data.sessionId) return;

        const hydratedAttachments = restoredAttachments(snapshot.attachments || []);
        setMessages([initialMessage(copy), ...restoredMessages(snapshot.messages || [], copy)]);
        setAttachedFiles(hydratedAttachments);

        for (const attachment of hydratedAttachments) {
          if (attachment.status !== "processing" || !attachment.attachmentId) continue;
          void waitForAttachment(data.sessionId, attachment.attachmentId, copy, controller.signal)
            .then((result) => {
              if (!active) return;
              setAttachedFiles((current) => current.map((item) =>
                item.id === attachment.id
                  ? { ...item, status: "ready", storageKey: result.storageKey || item.storageKey }
                  : item,
              ));
            })
            .catch((error) => {
              if (!active || (error instanceof DOMException && error.name === "AbortError")) return;
              console.error("[KAXI attachment resume]", error);
              setAttachedFiles((current) => current.map((item) =>
                item.id === attachment.id
                  ? { ...item, status: "error", error: error instanceof Error ? error.message : copy.processingFailed }
                  : item,
              ));
            });
        }
      } catch (error) {
        if (!active || (error instanceof DOMException && error.name === "AbortError")) return;
        console.error("[KAXI chat session]", error);
        setSessionError(true);
      }
    })();
    return () => {
      active = false;
      controller.abort();
    };
  }, [copy, isHidden, locale]);

  useEffect(() => {
    if (isHidden) {
      setIsOpen(false);
    }
  }, [isHidden]);

  useEffect(() => {
    if (isOpen && (conversationMessages.length > 0 || isLoading)) {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [conversationMessages.length, isLoading, isOpen]);

  useEffect(() => {
    if (!isOpen || !sessionId) return;
    const frame = window.requestAnimationFrame(() => textareaRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [isOpen, sessionId]);

  if (isHidden) return null;

  const sendQuestion = async (question: string, retryRequestId?: string) => {
    const trimmed = question.trim();
    if ((!trimmed && uploadedAttachments.length === 0) || !sessionId || isLoading || hasPendingAttachments) return;

    const requestAttachments = uploadedAttachments;
    const attachmentSummary =
      requestAttachments.length > 0
        ? `\n\n${copy.attachmentSummary}: ${requestAttachments.map((file) => file.name).join(", ")}`
        : "";
    const messageText = `${trimmed || copy.attachmentOnlyQuestion}${attachmentSummary}`;
    setInput("");
    setIsEmojiOpen(false);
    setMessages((current) => retryRequestId
      ? current.filter((message) => message.retryRequestId !== retryRequestId)
      : [...current, { id: createId(), role: "user", text: messageText }]);
    setIsLoading(true);
    const requestId = retryRequestId || createId();

    try {
      const response = await fetch("/api/typebot-rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: messageText,
          sessionId,
          requestId,
          source: "kaxi-site",
          locale,
          attachments: requestAttachments.map((file) => ({
            id: file.attachmentId,
            bucket: file.bucket,
            storageKey: file.storageKey,
            name: file.name,
            size: file.size,
            type: file.type,
            sha256: file.sha256,
          })),
        }),
      });
      const data = (await response.json()) as RagResponse;

      if (!response.ok || data.error) {
        throw new Error(data.error || "KAXI chat failed");
      }

      setMessages((current) => [
        ...current,
        {
          id: createId(),
          role: "assistant",
          text: data.answer || copy.answerMissing,
          nextStep: data.nextStep,
          sources: (data.sources || []).filter((source) => source.sourceUrl?.startsWith("https://")).slice(0, 3),
        },
      ]);
      const sentIds = new Set(requestAttachments.map((file) => file.id));
      setAttachedFiles((current) => current.filter((file) => !sentIds.has(file.id)));
    } catch (error) {
      console.error("[KAXI chat widget]", error);
      setMessages((current) => [
        ...current,
        {
          id: createId(),
          role: "assistant",
          text: copy.connectionError,
          retryQuestion: messageText,
          retryRequestId: requestId,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendQuestion(input);
  };

  const resetChat = async () => {
    setSessionId("");
    setSessionError(false);
    setAttachmentsEnabled(false);
    setInput("");
    setAttachedFiles([]);
    setIsEmojiOpen(false);
    setMessages([initialMessage(copy)]);
    try {
      const response = await fetch("/api/chat-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          forceNew: true,
          locale,
        }),
      });
      const data = (await response.json()) as {
        sessionId?: string;
        error?: string;
        capabilities?: { attachments?: boolean };
      };
      if (!response.ok || !data.sessionId) throw new Error(data.error || "chat session reset failed");
      setSessionId(data.sessionId);
      setAttachmentsEnabled(data.capabilities?.attachments === true);
    } catch (error) {
      console.error("[KAXI chat reset]", error);
      setSessionError(true);
    }
  };

  const uploadAttachment = async (file: File, localId: string) => {
    setAttachedFiles((current) => current.map((item) =>
      item.id === localId ? { ...item, status: "uploading", error: undefined, localFile: file } : item,
    ));
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sessionId", sessionId);
      const response = await fetch("/api/chat-attachments", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json().catch(() => ({}))) as {
        attachment?: {
          id?: string;
          bucket?: string;
          storageKey?: string;
          name?: string;
          size?: number;
          type?: string;
          sha256?: string;
        };
        error?: string;
      };
      if (!response.ok || !data.attachment?.id || !data.attachment.storageKey || !data.attachment.bucket) {
        throw new Error(data.error || "attachment upload failed");
      }

      setAttachedFiles((current) => current.map((item) =>
        item.id === localId
          ? {
              ...item,
              attachmentId: data.attachment?.id,
              status: "processing",
              bucket: data.attachment?.bucket,
              storageKey: data.attachment?.storageKey,
              sha256: data.attachment?.sha256,
              type: data.attachment?.type || item.type,
              size: data.attachment?.size || item.size,
            }
          : item,
      ));

      const processing = await waitForAttachment(sessionId, data.attachment.id, copy);
      setAttachedFiles((current) => current.map((item) =>
        item.id === localId
          ? { ...item, status: "ready", storageKey: processing.storageKey || item.storageKey }
          : item,
      ));
    } catch (error) {
      console.error("[KAXI attachment upload]", error);
      setAttachedFiles((current) => current.map((item) =>
        item.id === localId
          ? { ...item, status: "error", error: error instanceof Error ? error.message : copy.uploadFailed }
          : item,
      ));
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []).slice(0, Math.max(0, 3 - attachedFiles.length));
    event.target.value = "";
    if (selectedFiles.length === 0 || !sessionId) return;

    const pendingFiles = selectedFiles.map((file) => ({
      id: createId(),
      name: file.name,
      size: file.size,
      type: file.type,
      status: "uploading" as const,
      localFile: file,
    }));
    setAttachedFiles((current) => [...current, ...pendingFiles]);
    for (const [index, file] of selectedFiles.entries()) {
      void uploadAttachment(file, pendingFiles[index].id);
    }
  };

  const removeAttachment = async (attachment: UploadedAttachment) => {
    if (!attachment.attachmentId) {
      setAttachedFiles((current) => current.filter((item) => item.id !== attachment.id));
      return;
    }
    setAttachedFiles((current) => current.map((item) =>
      item.id === attachment.id ? { ...item, status: "deleting" } : item,
    ));
    try {
      const response = await fetch("/api/chat-attachments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, attachmentId: attachment.attachmentId }),
      });
      if (!response.ok) throw new Error("attachment delete failed");
      setAttachedFiles((current) => current.filter((item) => item.id !== attachment.id));
    } catch (error) {
      console.error("[KAXI attachment delete]", error);
      setAttachedFiles((current) => current.map((item) =>
        item.id === attachment.id ? { ...item, status: "error", error: copy.deleteFailed } : item,
      ));
    }
  };

  const retryAttachment = async (attachment: UploadedAttachment) => {
    if (attachment.localFile) {
      await uploadAttachment(attachment.localFile, attachment.id);
      return;
    }
    if (!attachment.attachmentId) return;
    setAttachedFiles((current) => current.map((item) =>
      item.id === attachment.id ? { ...item, status: "processing", error: undefined } : item,
    ));
    try {
      const response = await fetch("/api/chat-attachments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, attachmentId: attachment.attachmentId }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || copy.processingFailed);
      const processing = await waitForAttachment(sessionId, attachment.attachmentId, copy);
      setAttachedFiles((current) => current.map((item) =>
        item.id === attachment.id
          ? { ...item, status: "ready", storageKey: processing.storageKey || item.storageKey }
          : item,
      ));
    } catch (error) {
      setAttachedFiles((current) => current.map((item) =>
        item.id === attachment.id
          ? { ...item, status: "error", error: error instanceof Error ? error.message : copy.processingFailed }
          : item,
      ));
    }
  };

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? input.length;
    const end = textarea?.selectionEnd ?? input.length;
    const nextInput = `${input.slice(0, start)}${emoji}${input.slice(end)}`;
    const nextCursor = start + emoji.length;

    setInput(nextInput);
    setIsEmojiOpen(false);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(nextCursor, nextCursor);
    });
  };

  return (
    <div className={`fixed bottom-4 right-4 z-[424243] sm:bottom-6 sm:right-6 ${hideOnMobile ? "max-sm:hidden" : ""}`}>
      {isOpen && (
        <section
          lang={locale}
          aria-label={copy.regionLabel}
          className="relative mb-3 flex h-[min(680px,calc(100dvh-7rem))] w-[calc(100vw-2rem)] max-w-[430px] flex-col overflow-hidden rounded-[32px] border border-white/80 bg-white px-5 pb-4 pt-5 shadow-[0_22px_70px_rgba(15,23,42,0.16),-20px_24px_70px_rgba(236,72,153,0.14),20px_22px_70px_rgba(99,102,241,0.15)] max-[359px]:fixed max-[359px]:inset-x-2 max-[359px]:bottom-20 max-[359px]:top-2 max-[359px]:mb-0 max-[359px]:h-auto max-[359px]:w-auto max-[359px]:rounded-[24px] max-[359px]:px-4 max-[359px]:pb-3 max-[359px]:pt-4"
        >
          <div className="flex shrink-0 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                data-testid="kaxi-chat-mascot"
                className="flex h-10 w-[52px] shrink-0 items-end justify-center max-[359px]:h-9 max-[359px]:w-11"
              >
                <KaxiRunningCat size={42} />
              </span>
              <span className="text-[22px] font-bold leading-none text-zinc-900 max-[359px]:text-[19px]">KAXI</span>
            </div>
            <button
              type="button"
              aria-label={copy.resetLabel}
              onClick={() => void resetChat()}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-[14px] bg-zinc-100 px-4 text-[16px] font-bold leading-none text-zinc-900 transition hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-zinc-200 max-[359px]:h-9 max-[359px]:gap-1.5 max-[359px]:px-3 max-[359px]:text-[13px]"
            >
              <RefreshCcw className="size-5 text-zinc-600 max-[359px]:size-4" aria-hidden="true" />
              <span>{copy.resetLabel}</span>
            </button>
          </div>

          <div className="mt-7 shrink-0 space-y-0.5 text-[14px] font-semibold leading-[1.72] text-black max-[399px]:text-[13px] max-[359px]:mt-3 max-[359px]:text-[12px] max-[359px]:leading-[1.5]">
            {copy.greeting.map((line) => <p key={line}>{line}</p>)}
          </div>

          <div className="mt-4 flex shrink-0 items-center gap-2 text-[15px] font-semibold leading-none text-zinc-400 max-[359px]:mt-3 max-[359px]:text-[12px]">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#5B35F5] text-white">
              <MessageCircle className="size-3" aria-hidden="true" />
            </span>
            <span>{copy.statusLabel}</span>
          </div>

          <div
            aria-live="polite"
            aria-relevant="additions text"
            aria-busy={isLoading}
            className="mt-4 min-h-0 flex-1 overflow-y-auto px-1 max-[359px]:mt-2"
          >
            {(conversationMessages.length > 0 || isLoading) && (
              <div className="space-y-3 py-1">
                {conversationMessages.map((message) => (
                  <div
                    key={message.id}
                    className={message.role === "user" ? "flex justify-end" : "flex justify-start"}
                  >
                    <div
                      className={[
                        "max-w-[88%] rounded-[16px] px-3.5 py-2.5 text-sm leading-relaxed",
                        message.role === "user" ? "bg-zinc-950 text-white" : "bg-zinc-100 text-zinc-900",
                      ].join(" ")}
                    >
                      <p className="whitespace-pre-wrap">{message.text}</p>
                      {message.nextStep && (
                        <p className="mt-2 border-t border-current/10 pt-2 text-xs opacity-80">
                          {copy.nextStep}: {message.nextStep}
                        </p>
                      )}
                      {message.sources && message.sources.length > 0 && (
                        <div className="mt-2 border-t border-current/10 pt-2 text-[11px] leading-relaxed opacity-80">
                          {message.sources.map((source, index) => (
                            <a
                              key={`${source.sourceUrl}-${index}`}
                              href={source.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="block truncate underline decoration-current/40 underline-offset-2 hover:opacity-70"
                            >
                              {source.title || source.source || copy.officialSource}
                              {source.checkedAt ? ` · ${source.checkedAt.slice(0, 10)} ${copy.checked}` : ""}
                            </a>
                          ))}
                        </div>
                      )}
                      {message.retryQuestion && (
                        <button
                          type="button"
                          onClick={() => void sendQuestion(message.retryQuestion || "", message.retryRequestId)}
                          className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
                        >
                          <RefreshCcw className="size-3.5" aria-hidden="true" />
                          {copy.retry}
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div role="status" className="rounded-[16px] bg-zinc-100 px-3.5 py-2.5 text-sm text-zinc-600">
                      {copy.loading}
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </div>
            )}
          </div>

          <div className="relative mb-5 mt-3 max-w-[78%] shrink-0 self-start rounded-[16px] bg-[#333436] px-4 py-3 text-[16px] font-bold leading-tight text-white shadow-[0_10px_28px_rgba(15,23,42,0.14)] after:absolute after:-bottom-2.5 after:left-7 after:h-5 after:w-5 after:rotate-45 after:bg-[#333436] max-[359px]:mb-3 max-[359px]:mt-2 max-[359px]:max-w-[88%] max-[359px]:px-3 max-[359px]:py-2.5 max-[359px]:text-[13px]">
            {copy.prompt}
          </div>

          <form
            onSubmit={handleSubmit}
            className={[
              "relative w-full shrink-0 rounded-[28px] bg-zinc-100 focus-within:bg-zinc-50 focus-within:ring-2 focus-within:ring-zinc-300",
              attachedFiles.length > 0 ? "h-32" : "h-24",
            ].join(" ")}
          >
            {attachmentsEnabled && (
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                aria-label={copy.attachLabel}
                className="hidden"
                multiple
                onChange={handleFileChange}
              />
            )}
            <textarea
              ref={textareaRef}
              aria-label={copy.inputLabel}
              aria-describedby="kaxi-chat-disclaimer"
              value={input}
              disabled={isLoading || !sessionId}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              rows={1}
              placeholder={copy.placeholder}
              className="absolute left-4 right-20 top-3.5 h-7 resize-none bg-transparent text-[16px] font-semibold leading-7 text-zinc-950 outline-none placeholder:text-zinc-400 disabled:opacity-60 max-[359px]:right-16 max-[359px]:text-[14px]"
            />
            {attachedFiles.length > 0 && (
              <div className="absolute left-4 right-16 top-11 flex gap-1 overflow-x-auto pb-1">
                {attachedFiles.map((file) => (
                  <div
                    key={file.id}
                    className={[
                      "flex h-9 shrink-0 items-center gap-1 rounded-full bg-white pl-2.5 text-[11px] font-semibold shadow-sm",
                      file.status === "error" ? "text-red-600" : "text-zinc-600",
                    ].join(" ")}
                    title={file.error || file.name}
                  >
                    <span className="max-w-28 truncate">
                      {copy.fileStatus[file.status]} · {file.name}
                    </span>
                    {file.status === "error" && (file.localFile || file.attachmentId) && (
                      <button
                        type="button"
                        aria-label={copy.retryUpload(file.name)}
                        onClick={() => void retryAttachment(file)}
                        className="flex h-11 w-9 items-center justify-center rounded-full hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
                      >
                        <RefreshCcw className="size-3.5" aria-hidden="true" />
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label={copy.deleteFile(file.name)}
                      disabled={file.status === "deleting"}
                      onClick={() => void removeAttachment(file)}
                      className="flex h-11 w-9 items-center justify-center rounded-full hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 disabled:opacity-40"
                    >
                      <X className="size-3.5" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {isEmojiOpen && (
              <div className="absolute bottom-12 left-12 z-10 grid grid-cols-4 gap-1 rounded-2xl bg-white p-2 shadow-[0_12px_32px_rgba(15,23,42,0.16)] ring-1 ring-zinc-100 max-[359px]:left-2">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    aria-label={copy.insertEmoji(emoji)}
                    onClick={() => insertEmoji(emoji)}
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-lg transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-200"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            <div className="absolute bottom-1 left-2 flex items-center gap-0.5">
              {attachmentsEnabled && (
                <button
                  type="button"
                  aria-label={copy.attachLabel}
                  disabled={isLoading || !sessionId}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-11 w-11 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-zinc-200 disabled:pointer-events-none disabled:opacity-40"
                >
                  <Paperclip className="size-5" aria-hidden="true" />
                </button>
              )}
              <button
                type="button"
                aria-label={copy.emojiLabel}
                aria-expanded={isEmojiOpen}
                disabled={isLoading}
                onClick={() => setIsEmojiOpen((current) => !current)}
                className="flex h-11 w-11 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-zinc-200 disabled:pointer-events-none disabled:opacity-40"
              >
                <Smile className="size-5" aria-hidden="true" />
              </button>
            </div>
            <button
              type="submit"
              aria-label={copy.sendLabel}
              disabled={!sessionId || (!input.trim() && uploadedAttachments.length === 0) || isLoading || hasPendingAttachments}
              className="absolute bottom-2 right-2 flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-zinc-950 text-white transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-zinc-300 disabled:pointer-events-none disabled:bg-slate-300 max-[359px]:h-11 max-[359px]:w-11"
            >
              <ArrowUp className="size-7" aria-hidden="true" />
            </button>
          </form>

          <p id="kaxi-chat-disclaimer" className="mt-3 shrink-0 text-center text-[13px] font-medium leading-tight text-zinc-400 max-[359px]:mt-2 max-[359px]:text-[11px]">
            {sessionError ? copy.sessionError : copy.footer}
          </p>
        </section>
      )}

      <button
        type="button"
        data-testid="kaxi-typebot-launcher"
        aria-label={isOpen ? copy.closeLabel : copy.openLabel}
        aria-pressed={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className={[
          "group relative flex h-14 w-14 items-center justify-center rounded-full border border-white/30 bg-primary text-primary-foreground shadow-[0_12px_34px_rgba(201,100,66,0.28)] transition-all",
          "hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-[0_16px_40px_rgba(201,100,66,0.34)]",
          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30",
        ].join(" ")}
      >
        {isOpen ? (
          <X className="size-5 transition-transform group-hover:scale-105" />
        ) : (
          <>
            <MessageCircle className="size-6 transition-transform group-hover:scale-105" />
            <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-white text-[10px] font-bold text-primary">
              K
            </span>
          </>
        )}
      </button>
    </div>
  );
}
