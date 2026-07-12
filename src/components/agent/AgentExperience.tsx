"use client";

import { AgentLanding } from "./AgentLanding";
import { AgentChatHeader } from "./AgentChatHeader";
import { AgentComposer } from "./AgentComposer";
import { AgentMessageList } from "./AgentMessageList";
import { useAgentChat } from "./useAgentChat";

export function AgentExperience({ embedded = false }: { embedded?: boolean }) {
  const chat = useAgentChat();

  if (!chat.started) {
    return (
      <AgentLanding
        agentStatus={chat.agentStatus}
        input={chat.input}
        inputRef={chat.inputRef}
        loading={chat.loading}
        locale={chat.locale}
        embedded={embedded}
        onInputChange={chat.setInput}
        onSend={chat.send}
      />
    );
  }

  return (
    <div className={embedded ? "mx-auto w-full max-w-3xl text-left" : "mx-auto max-w-3xl px-4 py-6"}>
      <AgentChatHeader agentStatus={chat.agentStatus} locale={chat.locale} onReset={chat.reset} />
      <AgentMessageList
        clarifyDrafts={chat.clarifyDrafts}
        endRef={chat.endRef}
        loading={chat.loading}
        locale={chat.locale}
        messages={chat.messages}
        compact={embedded}
        onDraftChange={chat.updateClarifyDraft}
        onSend={chat.send}
        onSendDraft={chat.sendClarifyDraft}
      />
      <AgentComposer
        input={chat.input}
        inputRef={chat.inputRef}
        loading={chat.loading}
        locale={chat.locale}
        fixed={!embedded}
        onInputChange={chat.setInput}
        onSend={() => chat.send()}
      />
    </div>
  );
}
