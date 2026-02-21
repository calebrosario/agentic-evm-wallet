# AGENT MODULE

## OVERVIEW

Multi-agent orchestration system with task scheduling, timeout handling, and retry logic.

## WHERE TO LOOK

| Task                | File            | Key Details                                                |
| ------------------- | --------------- | ---------------------------------------------------------- |
| Agent orchestration | agentManager.ts | Scheduler, event emission, agent lifecycle                 |
| Task queue          | taskQueue.ts    | Priority-based (Critical>High>Normal>Low), status tracking |
| Timeout handling    | agent.ts        | Promise.race wrapper, task.timeoutMs support               |
| Retry logic         | agent.ts        | Exponential backoff: delay = baseDelayMs \* 2^(attempt-1)  |
| Types & errors      | types.ts        | AgentStatus, TaskStatus, TaskPriority, AgentErrorCode      |

## CONVENTIONS

- **Event emissions**: All state changes emit events (agent_created, task_assigned, task_completed, task_failed, task_timeout, task_retry)
- **Retry policy**: Configurable via RetryPolicy (maxRetries, baseDelayMs, maxDelayMs, retryableErrors[])
- **Priority scheduling**: TaskPriority enum (Critical=3, High=2, Normal=1, Low=0)
- **Agent selection**: findBestAgent() selects first idle agent with matching capabilities
- **Error handling**: AgentManagerError with specific codes, event handler errors tracked separately

## ANTI-PATTERNS

- Never execute tasks on busy agents (agent.canExecuteTask() checks)
- Never schedule tasks with unresolved dependencies (validateDependencies())
- Never retry non-retryable errors (only AgentErrorCode.TaskTimeout by default)
- Never throw on non-critical event handler errors (log to console instead)
- Never skip event emissions when enableEvents=true
