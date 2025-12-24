/**
 * 错误处理策略枚举
 */
export enum ErrorHandlingStrategy {
  STOP_ON_ERROR = 'stop_on_error',
  CONTINUE_ON_ERROR = 'continue_on_error',
  RETRY = 'retry',
  SKIP = 'skip'
}

/**
 * 执行策略枚举
 */
export enum ExecutionStrategy {
  SEQUENTIAL = 'sequential',
  PARALLEL = 'parallel',
  CONDITIONAL = 'conditional'
}

/**
 * 错误处理策略接口
 */
export interface IErrorHandlingStrategy {
  readonly type: ErrorHandlingStrategy;
  handle(error: Error, context: unknown): Promise<void>;
}

/**
 * 执行策略接口
 */
export interface IExecutionStrategy {
  readonly type: ExecutionStrategy;
  execute(context: unknown): Promise<unknown>;
}