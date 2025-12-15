/**
 * 删除会话命令
 */

/**
 * 删除会话命令
 */
export class DeleteSessionCommand {
  readonly sessionId: string;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }
}

/**
 * 删除会话命令结果
 */
export class DeleteSessionCommandResult {
  readonly success: boolean;

  constructor(success: boolean) {
    this.success = success;
  }
}