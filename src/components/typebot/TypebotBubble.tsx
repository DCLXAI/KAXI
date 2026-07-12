"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { MessageCircle, X } from "lucide-react";

const HIDDEN_PATH_PREFIXES = ["/admin", "/partner", "/student", "/login"];
const LOCALE_PREFIX_RE = /^\/(ko|en|vi|mn)(?=\/|$)/;

type WidgetLocale = "ko" | "en" | "vi" | "mn";

type WidgetCopy = {
  regionLabel: string;
  openLabel: string;
  closeLabel: string;
  prompt: string;
  unavailable: string;
};

const WIDGET_COPY: Record<WidgetLocale, WidgetCopy> = {
  ko: {
    regionLabel: "KAXI 상담 채팅",
    openLabel: "KAXI 상담 열기",
    closeLabel: "KAXI 상담 닫기",
    prompt: "KAXI에게 궁금한 내용을 물어보세요!",
    unavailable: "상담 연결을 준비하지 못했습니다. 잠시 후 다시 시도해주세요.",
  },
  en: {
    regionLabel: "KAXI consultation chat",
    openLabel: "Open KAXI chat",
    closeLabel: "Close KAXI chat",
    prompt: "Ask KAXI anything about studying in Korea!",
    unavailable: "We could not prepare the chat. Please try again shortly.",
  },
  vi: {
    regionLabel: "Tư vấn KAXI",
    openLabel: "Mở tư vấn KAXI",
    closeLabel: "Đóng tư vấn KAXI",
    prompt: "Hãy hỏi KAXI về việc du học Hàn Quốc!",
    unavailable: "Không thể chuẩn bị cuộc trò chuyện. Vui lòng thử lại sau.",
  },
  mn: {
    regionLabel: "KAXI зөвлөгөөний чат",
    openLabel: "KAXI чатыг нээх",
    closeLabel: "KAXI чатыг хаах",
    prompt: "Солонгост суралцах талаар KAXI-аас асуугаарай!",
    unavailable: "Чатыг бэлдэж чадсангүй. Түр хүлээгээд дахин оролдоно уу.",
  },
};

function KaxiFlowerMark({ className = "" }: { className?: string }) {
  const petals = [
    "left-1/2 top-[6px] -translate-x-1/2 bg-[#8B5CF6]",
    "right-[7px] top-[11px] bg-[#6366F1]",
    "right-[10px] bottom-[8px] bg-[#60A5FA]",
    "left-1/2 bottom-[5px] -translate-x-1/2 bg-[#A78BFA]",
    "left-[10px] bottom-[8px] bg-[#F472B6]",
    "left-[7px] top-[11px] bg-[#FB7185]",
  ];

  return (
    <span
      className={[
        "relative inline-flex shrink-0 items-center justify-center rounded-full bg-white shadow-[0_2px_10px_rgba(15,23,42,0.12)] ring-1 ring-zinc-100",
        className,
      ].join(" ")}
      aria-hidden="true"
    >
      {petals.map((petal) => (
        <span
          key={petal}
          className={[
            "absolute h-[34%] w-[34%] rounded-full blur-[0.1px]",
            petal,
          ].join(" ")}
        />
      ))}
      <span className="absolute h-[23%] w-[23%] rounded-full bg-white shadow-sm" />
    </span>
  );
}

function shouldHideChatbot(pathname: string) {
  const publicPath = pathname.replace(LOCALE_PREFIX_RE, "") || "/";
  return HIDDEN_PATH_PREFIXES.some(
    (prefix) => publicPath === prefix || publicPath.startsWith(`${prefix}/`),
  );
}

export function TypebotBubble({ publicUrl }: { publicUrl: string | null }) {
  const pathname = usePathname();
  const locale = (pathname.match(LOCALE_PREFIX_RE)?.[1] ?? "ko") as WidgetLocale;
  const copy = WIDGET_COPY[locale];
  const prefersReducedMotion = useReducedMotion();
  const [isOpen, setIsOpen] = useState(false);
  const isHidden = shouldHideChatbot(pathname);
  const publicPath = pathname.replace(LOCALE_PREFIX_RE, "") || "/";
  const hideOnMobile = publicPath === "/diagnose";

  // Reset open state during render when the widget becomes hidden, so it does
  // not reappear already-open after navigating back to a visible route.
  const [wasHidden, setWasHidden] = useState(isHidden);
  if (isHidden !== wasHidden) {
    setWasHidden(isHidden);
    if (isHidden && isOpen) {
      setIsOpen(false);
    }
  }

  if (isHidden) return null;

  return (
    <div className={`fixed bottom-4 right-4 z-[424243] sm:bottom-6 sm:right-6 ${hideOnMobile ? "max-sm:hidden" : ""}`}>
      <AnimatePresence>
        {isOpen && (
          <motion.section
            lang={locale}
            aria-label={copy.regionLabel}
            initial={
              prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, transform: "translateY(8px) scale(0.97)" }
            }
            animate={
              prefersReducedMotion
                ? { opacity: 1, transition: { duration: 0.2, ease: [0.23, 1, 0.32, 1] } }
                : {
                    opacity: 1,
                    transform: "translateY(0px) scale(1)",
                    transition: { duration: 0.2, ease: [0.23, 1, 0.32, 1] },
                  }
            }
            exit={
              prefersReducedMotion
                ? { opacity: 0, transition: { duration: 0.15, ease: [0.23, 1, 0.32, 1] } }
                : {
                    opacity: 0,
                    transform: "translateY(8px) scale(0.97)",
                    transition: { duration: 0.15, ease: [0.23, 1, 0.32, 1] },
                  }
            }
            style={{ transformOrigin: "bottom right" }}
            className="relative mb-3 flex h-[min(680px,calc(100dvh-7rem))] w-[calc(100vw-2rem)] max-w-[430px] flex-col overflow-hidden rounded-[32px] border border-white/80 bg-white px-5 pb-4 pt-5 shadow-[0_22px_70px_rgba(15,23,42,0.16),-20px_24px_70px_rgba(236,72,153,0.14),20px_22px_70px_rgba(99,102,241,0.15)] max-[359px]:fixed max-[359px]:inset-x-2 max-[359px]:bottom-20 max-[359px]:top-2 max-[359px]:mb-0 max-[359px]:h-auto max-[359px]:w-auto max-[359px]:rounded-[24px] max-[359px]:px-4 max-[359px]:pb-3 max-[359px]:pt-4"
          >
            <div className="flex shrink-0 items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <KaxiFlowerMark className="h-8 w-8 max-[359px]:h-7 max-[359px]:w-7" />
                <span className="text-[22px] font-bold leading-none text-zinc-900 max-[359px]:text-[19px]">KAXI</span>
              </div>
              <button
                type="button"
                aria-label={copy.closeLabel}
                onClick={() => setIsOpen(false)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-zinc-100 text-zinc-900 transition hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-zinc-200 max-[359px]:h-9 max-[359px]:w-9"
              >
                <X className="size-5 text-zinc-600" aria-hidden="true" />
              </button>
            </div>

            <div className="relative mb-4 mt-5 max-w-[78%] shrink-0 self-start rounded-[16px] bg-[#333436] px-4 py-3 text-[16px] font-bold leading-tight text-white shadow-[0_10px_28px_rgba(15,23,42,0.14)] after:absolute after:-bottom-2.5 after:left-7 after:h-5 after:w-5 after:rotate-45 after:bg-[#333436] max-[359px]:mb-3 max-[359px]:mt-3 max-[359px]:max-w-[88%] max-[359px]:px-3 max-[359px]:py-2.5 max-[359px]:text-[13px]">
              {copy.prompt}
            </div>

            <div className="relative min-h-0 flex-1 overflow-hidden rounded-[20px]">
              {publicUrl ? (
                <iframe
                  src={publicUrl}
                  title="KAXI chat"
                  className="h-full w-full border-0"
                  allow="microphone; camera"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center px-6 text-center text-[14px] font-semibold leading-relaxed text-red-600">
                  {copy.unavailable}
                </div>
              )}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <button
        type="button"
        aria-label={isOpen ? copy.closeLabel : copy.openLabel}
        aria-pressed={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className={[
          "group relative flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-zinc-950 text-white shadow-[0_12px_34px_rgba(15,23,42,0.28)] transition-[transform,background-color,box-shadow] duration-100 ease-snappy",
          "hover:-translate-y-0.5 hover:bg-zinc-900 hover:shadow-[0_16px_40px_rgba(15,23,42,0.32)]",
          "active:scale-[0.97]",
          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-zinc-300",
        ].join(" ")}
      >
        {isOpen ? (
          <X className="size-5 transition-transform group-hover:scale-105" />
        ) : (
          <>
            <MessageCircle className="size-6 transition-transform group-hover:scale-105" />
            <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-white text-[10px] font-bold text-zinc-950">
              K
            </span>
          </>
        )}
      </button>
    </div>
  );
}
