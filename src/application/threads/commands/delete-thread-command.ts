/**
 * 删除线程命令
 */

/**
 * 删除线程命令
 */
export class DeleteThreadCommand {
  readonly threadId: string;

  constructor(threadId: string) {
    this.threadId = threadId;
  }
}

/**
 * 删除线程命令结果
 */
export class DeleteThreadCommandResult {
  readonly success: boolean;

  constructor(success: boolean) {
    this.success = success;
  }
}