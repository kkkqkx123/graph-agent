/**
 * 更新线程状态命令
 */

/**
 * 更新线程状态命令
 */
export class UpdateThreadStatusCommand {
  readonly threadId: string;
  readonly status: string;
  readonly userId?: string;
  readonly reason?: string;

  constructor(threadId: string, status: string, userId?: string, reason?: string) {
    this.threadId = threadId;
    this.status = status;
    this.userId = userId;
    this.reason = reason;
  }
}

/**
 * 更新线程状态命令结果
 */
export class UpdateThreadStatusCommandResult {
  readonly success: boolean;
  readonly threadInfo: {
    threadId: string;
    sessionId: string;
    workflowId?: string;
    status: string;
    priority: number;
    title?: string;
    description?: string;
    createdAt: string;
    startedAt?: string;
    completedAt?: string;
    errorMessage?: string;
  };

  constructor(
    success: boolean,
    threadInfo: {
      threadId: string;
      sessionId: string;
      workflowId?: string;
      status: string;
      priority: number;
      title?: string;
      description?: string;
      createdAt: string;
      startedAt?: string;
      completedAt?: string;
      errorMessage?: string;
    }
  ) {
    this.success = success;
    this.threadInfo = threadInfo;
  }
}