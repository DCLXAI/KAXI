"use client";

import { ConsultChatHeader } from "./ConsultChatHeader";
import { ConsultComposer } from "./ConsultComposer";
import { ConsultLanding } from "./ConsultLanding";
import { ConsultMessageList } from "./ConsultMessageList";
import { useConsultChat } from "./useConsultChat";

export function ConsultExperience() {
  const chat = useConsultChat();

  if (!chat.started) {
    return (
      <ConsultLanding
        input={chat.input}
        inputRef={chat.inputRef}
        loading={chat.loading}
        locale={chat.locale}
        mode={chat.mode}
        onInputChange={chat.setInput}
        onModeChange={chat.setMode}
        onSend={chat.send}
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <ConsultChatHeader locale={chat.locale} mode={chat.mode} onReset={chat.reset} />
      <ConsultMessageList
        endRef={chat.endRef}
        loading={chat.loading}
        locale={chat.locale}
        messages={chat.messages}
        onSend={chat.send}
      />
      <ConsultComposer
        input={chat.input}
        inputRef={chat.inputRef}
        loading={chat.loading}
        locale={chat.locale}
        mode={chat.mode}
        onInputChange={chat.setInput}
        onModeChange={chat.setMode}
        onSend={() => chat.send()}
      />
    </div>
  );
}
