export class RequiredHandoffPersistenceError extends Error {
  constructor() {
    super("REQUIRED_HANDOFF_NOT_PERSISTED");
    this.name = "RequiredHandoffPersistenceError";
  }
}

type RequiredChatPersistenceOptions<TExchange> = {
  needsHuman: boolean;
  persistExchange: () => Promise<TExchange>;
  persistHandoff: (exchange: TExchange) => Promise<boolean>;
  onHandoffFailure?: (error: unknown) => void | Promise<void>;
};

export type RequiredChatPersistenceResult<TExchange> = {
  exchange: TExchange;
  handoffTaskPersisted: boolean;
  persistenceAccepted: boolean;
};

/**
 * Phase-0 safety boundary for the public persistence contract.
 *
 * The canonical exchange still precedes the handoff until Phase 1 replaces
 * both writes with one database transaction. This helper prevents the gateway
 * from acknowledging a human-review turn when its required handoff write
 * failed or returned false, and gives the failure path one testable home.
 */
export async function persistRequiredChatState<TExchange>(
  options: RequiredChatPersistenceOptions<TExchange>,
): Promise<RequiredChatPersistenceResult<TExchange>> {
  const exchange = await options.persistExchange();

  if (!options.needsHuman) {
    return {
      exchange,
      handoffTaskPersisted: false,
      persistenceAccepted: true,
    };
  }

  let handoffFailure: unknown;
  try {
    const handoffTaskPersisted = await options.persistHandoff(exchange);
    if (handoffTaskPersisted) {
      return { exchange, handoffTaskPersisted: true, persistenceAccepted: true };
    }
    handoffFailure = new RequiredHandoffPersistenceError();
  } catch (error) {
    handoffFailure = error;
  }

  await options.onHandoffFailure?.(handoffFailure);
  return { exchange, handoffTaskPersisted: false, persistenceAccepted: false };
}
