/**
 * Interaction Exceptions
 * 
 * 交互相关的异常定义
 */

export class InteractionException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InteractionException';
  }
}

export class InteractionSessionNotFoundException extends InteractionException {
  constructor(sessionId: string) {
    super(`Interaction session not found: ${sessionId}`);
    this.name = 'InteractionSessionNotFoundException';
  }
}

export class InteractionExecutionException extends InteractionException {
  constructor(message: string, public override readonly cause?: Error) {
    super(message);
    this.name = 'InteractionExecutionException';
  }
}

export class LLMExecutionException extends InteractionExecutionException {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = 'LLMExecutionException';
  }
}

export class ToolExecutionException extends InteractionExecutionException {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = 'ToolExecutionException';
  }
}

export class UserInteractionException extends InteractionExecutionException {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = 'UserInteractionException';
  }
}

export class TokenLimitExceededException extends InteractionException {
  constructor(currentTokens: number, limit: number) {
    super(`Token limit exceeded: ${currentTokens}/${limit}`);
    this.name = 'TokenLimitExceededException';
  }
}