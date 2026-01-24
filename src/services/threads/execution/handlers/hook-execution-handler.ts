import { injectable, inject } from 'inversify';
import { Hook } from '../../../../domain/workflow/entities/hook';
import { HookContextValue, HookExecutionResultValue } from '../../../../domain/workflow/value-objects/hook';
import { ExecutionContext } from '../context/execution-context';
import { ILogger } from '../../../../domain/common/types/logger-types';

/**
 * Hook 执行处理器接口
 */
export interface IHookExecutionHandler {
  /**
   * 执行单个 Hook
   * @param hook Hook 实体
   * @param context 执行上下文
   * @returns 执行结果
   */
  execute(hook: Hook, context: ExecutionContext): Promise<HookExecutionResultValue>;

  /**
   * 批量执行 Hook
   * @param hooks Hook 实体列表
   * @param context 执行上下文
   * @returns 执行结果列表
   */
  executeBatch(hooks: Hook[], context: ExecutionContext): Promise<HookExecutionResultValue[]>;
}

/**
 * Hook 执行处理器
 * 
 * 职责：
 * - 协调 Hook 执行流程
 * - 管理 Hook 执行策略
 * - 处理错误和重试
 * 
 * 注意：具体执行策略将在后续实现
 */
@injectable()
export class HookExecutionHandler implements IHookExecutionHandler {
  constructor(
    @inject('Logger') private readonly logger: ILogger
  ) { }

  /**
   * 执行单个 Hook
   * @param hook Hook 实体
   * @param context 执行上下文
   * @returns 执行结果
   */
  async execute(hook: Hook, context: ExecutionContext): Promise<HookExecutionResultValue> {
    const startTime = Date.now();

    try {
      this.logger.info('开始执行 Hook', {
        hookId: hook.hookId.toString(),
        hookPoint: hook.hookPoint.toString(),
        hookName: hook.name,
        enabled: hook.enabled,
        priority: hook.priority,
      });

      // 检查 Hook 是否启用
      if (!hook.enabled) {
        return HookExecutionResultValue.skipped(
          hook.hookId.toString(),
          { skipped: true, reason: 'hook is disabled' }
        );
      }

      // TODO: 根据 Hook 点选择对应的执行策略
      // 具体策略将在后续实现

      this.logger.warn('Hook 执行策略尚未实现', {
        hookId: hook.hookId.toString(),
        hookPoint: hook.hookPoint.toString(),
      });

      return HookExecutionResultValue.failure(
        hook.hookId.toString(),
        `Hook 点 ${hook.hookPoint.toString()} 的执行策略尚未实现`,
        Date.now() - startTime,
        hook.continueOnError
      );
    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.logger.error('Hook 执行失败', error instanceof Error ? error : new Error(String(error)), {
        hookId: hook.hookId.toString(),
        hookName: hook.name,
        executionTime,
      });

      return HookExecutionResultValue.failure(
        hook.hookId.toString(),
        error instanceof Error ? error.message : String(error),
        executionTime,
        hook.continueOnError
      );
    }
  }

  /**
   * 批量执行 Hook
   * @param hooks Hook 实体列表
   * @param context 执行上下文
   * @returns 执行结果列表
   */
  async executeBatch(hooks: Hook[], context: ExecutionContext): Promise<HookExecutionResultValue[]> {
    const results: HookExecutionResultValue[] = [];

    // 按优先级排序（优先级高的先执行）
    const sortedHooks = [...hooks].sort((a, b) => b.priority - a.priority);

    for (const hook of sortedHooks) {
      try {
        const result = await this.execute(hook, context);
        results.push(result);

        // 如果 Hook 要求停止执行，则中断后续 Hook
        if (!result.shouldContinue()) {
          this.logger.info('Hook 要求停止执行后续 Hook', {
            hookId: hook.hookId.toString(),
            hookName: hook.name,
          });
          break;
        }
      } catch (error) {
        this.logger.error('Hook 执行异常', error instanceof Error ? error : new Error(String(error)), {
          hookId: hook.hookId.toString(),
          hookName: hook.name,
        });
        results.push(
          HookExecutionResultValue.failure(
            hook.hookId.toString(),
            error instanceof Error ? error.message : String(error),
            0,
            hook.continueOnError
          )
        );

        // 如果 Hook 要求失败时停止，则中断后续 Hook
        if (!hook.continueOnError && hook.failFast) {
          break;
        }
      }
    }

    return results;
  }
}