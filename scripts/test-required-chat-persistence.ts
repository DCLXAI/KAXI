import {
  RequiredHandoffPersistenceError,
  persistRequiredChatState,
} from "../src/lib/chat/required-chat-persistence";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const exchange = { id: 42, mode: "canonical" as const };

{
  let handoffCalls = 0;
  const result = await persistRequiredChatState({
    needsHuman: false,
    persistExchange: async () => exchange,
    persistHandoff: async () => {
      handoffCalls += 1;
      return true;
    },
  });

  assert(result.persistenceAccepted, "a canonical non-handoff turn must be accepted");
  assert(!result.handoffTaskPersisted, "a non-handoff turn must not claim a handoff write");
  assert(handoffCalls === 0, "a non-handoff turn must not call the handoff repository");
}

{
  const result = await persistRequiredChatState({
    needsHuman: true,
    persistExchange: async () => exchange,
    persistHandoff: async () => true,
  });

  assert(result.persistenceAccepted, "a required handoff turn must be accepted after both writes");
  assert(result.handoffTaskPersisted, "a successful handoff write must be reported");
}

{
  const observed: unknown[] = [];
  const result = await persistRequiredChatState({
    needsHuman: true,
    persistExchange: async () => exchange,
    persistHandoff: async () => false,
    onHandoffFailure: async (error) => {
      observed.push(error);
    },
  });

  assert(!result.persistenceAccepted, "a false handoff result must never be acknowledged");
  assert(!result.handoffTaskPersisted, "a false handoff result must remain unpersisted");
  assert(observed.length === 1, "a false handoff result must emit one failure callback");
  assert(
    observed[0] instanceof RequiredHandoffPersistenceError,
    "a false handoff result must use the stable required-handoff failure type",
  );
}

{
  const injected = new Error("INJECTED_HANDOFF_WRITE_FAILURE");
  const observed: unknown[] = [];
  const result = await persistRequiredChatState({
    needsHuman: true,
    persistExchange: async () => exchange,
    persistHandoff: async () => {
      throw injected;
    },
    onHandoffFailure: async (error) => {
      observed.push(error);
    },
  });

  assert(!result.persistenceAccepted, "an injected handoff exception must never be acknowledged");
  assert(!result.handoffTaskPersisted, "an injected handoff exception must remain unpersisted");
  assert(observed[0] === injected, "the failure callback must receive the original repository error");
}

{
  const injected = new Error("INJECTED_CANONICAL_WRITE_FAILURE");
  let handoffCalls = 0;
  let rejected = false;
  try {
    await persistRequiredChatState({
      needsHuman: true,
      persistExchange: async () => {
        throw injected;
      },
      persistHandoff: async () => {
        handoffCalls += 1;
        return true;
      },
    });
  } catch (error) {
    rejected = error === injected;
  }

  assert(rejected, "a canonical exchange failure must reject with the original error");
  assert(handoffCalls === 0, "handoff persistence must not run after canonical persistence failed");
}

console.log("PASS required chat persistence acceptance and failure injection");
