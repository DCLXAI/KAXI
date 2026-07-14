"use client";

import { Bubble } from "@typebot.io/react";
import { usePathname } from "next/navigation";
import { trackProductEvent } from "@/lib/analytics/client";
import { productLocale } from "@/lib/analytics/events";

const HIDDEN_PATH_PREFIXES = ["/admin", "/partner", "/student", "/login", "/agent", "/consult"];
const LOCALE_PREFIX_RE = /^\/(ko|en|vi|mn)(?=\/|$)/;

function shouldHideChatbot(pathname: string) {
  const publicPath = pathname.replace(LOCALE_PREFIX_RE, "") || "/";
  return HIDDEN_PATH_PREFIXES.some(
    (prefix) => publicPath === prefix || publicPath.startsWith(`${prefix}/`),
  );
}

export function TypebotBubble() {
  const pathname = usePathname();
  const locale = productLocale(pathname.match(LOCALE_PREFIX_RE)?.[1]);

  if (shouldHideChatbot(pathname)) return null;

  return (
    <div id="kaxi-typebot-launcher" data-chat-surface="typebot" className="contents">
      <Bubble
        typebot="kaxi-rag-typebot"
        apiHost="https://typebot.io"
        theme={{ button: { backgroundColor: "#111827" } }}
        onOpen={() => trackProductEvent("chatbot_opened", {
          locale,
          surface: "typebot_bubble",
          path: pathname,
        })}
      />
    </div>
  );
}
