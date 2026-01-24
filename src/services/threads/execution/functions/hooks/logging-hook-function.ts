import {
  BaseHookFunction,
  HookFunctionResult,
  createHookFunctionResult,
} from './base-hook-function';

/**
 * 日志记录Hook函数
 *
 * 提供日志记录功能，可以在任何Hook点使用
 */
export class LoggingHookFunction extends BaseHookFunction {
  override readonly id = 'logging-hook-function';
  override readonly name = '日志记录函数';
  override readonly description = '记录Hook执行的日志信息';
  override readonly version = '1.0.0';

  async execute(context: any, config?: Record<string, any>): Promise<HookFunctionResult> {
    const startTime = Date.now();

    try {
      const level = config?.['level'] || 'info';
      const message = config?.['message'] || 'Hook执行';
      const includeContext = config?.['includeContext'] !== false;

      const logData: any = {
        timestamp: new Date().toISOString(),
        level,
        message,
      };

      if (includeContext && context) {
        logData.context = {
          hookId: context.hookId,
          workflowId: context.workflowId,
          nodeId: context.nodeId,
          executionId: context.executionId,
        };
      }

      // 根据日志级别输出
      switch (level) {
        case 'error':
          console.error(JSON.stringify(logData, null, 2));
          break;
        case 'warn':
          console.warn(JSON.stringify(logData, null, 2));
          break;
        case 'debug':
          console.debug(JSON.stringify(logData, null, 2));
          break;
        default:
          console.log(JSON.stringify(logData, null, 2));
      }

      const executionTime = Date.now() - startTime;

      return createHookFunctionResult(
        true,
        { logged: true, logData },
        undefined,
        executionTime,
        true
      );
    } catch (error) {
      const executionTime = Date.now() - startTime;
      return createHookFunctionResult(
        false,
        undefined,
        error instanceof Error ? error : String(error),
        executionTime,
        false
      );
    }
  }

  override validateConfig(config: Record<string, any>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (config?.['level'] && !['info', 'warn', 'error', 'debug'].includes(config['level'])) {
      errors.push(`无效的日志级别: ${config['level']}，必须是 info, warn, error 或 debug`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
