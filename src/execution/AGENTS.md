# EXECUTION MODULE

## OVERVIEW

Transaction execution with retry logic, exponential backoff, and event-driven status tracking.

## WHERE TO LOOK

| Task                  | File                                 | Notes                                      |
| --------------------- | ------------------------------------ | ------------------------------------------ |
| Transaction execution | transactionExecutor.ts               | 479 lines - core executor with retry logic |
| Type definitions      | types.ts                             | ExecuteTransactionResult, ExecutionStatus  |
| Retry with backoff    | transactionExecutor.ts               | Exponential backoff for failed txns        |
| Event emissions       | transactionExecutor.ts               | success/error/timeout events               |
| Timeout handling      | transactionExecutor.ts               | Promise<never> returns for timed out ops   |
| Advanced tests        | transactionExecutor.advanced.test.ts | Untracked (not in git)                     |

## CONVENTIONS

- **Retry strategy**: Exponential backoff with configurable max attempts
- **Event-driven**: Emits execution events (success, error, timeout) for monitoring
- **Promise<never>**: Returns never type for timed-out operations (prevents accidental usage)
- **Status tracking**: ExecutionStatus enum tracks txn state (pending, success, failed, timeout)

## ANTI-PATTERNS

- Never block indefinitely - always use timeout with Promise<never> return
- Never swallow retry errors - emit error events for observability
- Never ignore execution status - check before proceeding with dependent ops
- Never assume immediate success - handle retry/backoff in calling code
