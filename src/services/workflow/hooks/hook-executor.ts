import { injectable, inject } from 'inversify';
import { Hook } from '../../../domain/workflow/entities/hook';
import { ILogger } from '../../../domain/common/types/logger-types';
import { HookContextValue, HookExecutionResultValue } from '../../../domain/workflow/value-objects/hook';

/**
 * 钩子执行器
 *
 * 职责：
 * - 负责在指定 hookPoint 执行钩子
 * - 直接调用 Hook 实例
 * - 返回钩子执行结果
 */
@injectable()
export class HookExecutor {
  constructor(@inject('Logger') private readonly logger: ILogger) { }

  /**
   * 执行单个钩子
   * @param hook Hook实体
   * @param context 钩子上下文
   * @returns 钩子执行结果
   */
  async execute(hook: Hook, context: HookContextValue): Promise<HookExecutionResultValue> {
    const startTime = Date.now();

    try {
      this.logger.info('开始执行钩子', {
        hookId: hook.hookId.toString(),
        hookPoint: hook.hookPoint.toString(),
        hookName: hook.name,
        enabled: hook.enabled,
        priority: hook.priority,
      });

      // 检查钩子是否应该执行
      if (!hook.shouldExecute()) {
        return HookExecutionResultValue.skipped(
          hook.hookId.toString(),
          { skipped: true, reason: 'hook is disabled' }
        );
      }

      // 执行钩子
      const result = await hook.execute(context);
      const executionTime = Date.now() - startTime;

      this.logger.info('钩子执行完成', {
        hookId: hook.hookId.toString(),
        hookName: hook.name,
        executionTime,
        success: result.isSuccess(),
      });

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.logger.error('钩子执行失败', error instanceof Error ? error : new Error(String(error)), {
        hookId: hook.hookId.toString(),
        hookName: hook.name,
        executionTime,
      });

      return HookExecutionResultValue.failure(
        hook.hookId.toString(),
        error instanceof Error ? error.message : String(error),
        executionTime,
        hook.shouldContinueOnError()
      );
    }
  }

  /**
   * 批量执行钩子
   * @param hooks Hook实体列表
   * @param context 钩子上下文
   * @returns 钩子执行结果列表
   */
  async executeBatch(hooks: Hook[], context: HookContextValue): Promise<HookExecutionResultValue[]> {
    const results: HookExecutionResultValue[] = [];

    // 按优先级排序（优先级高的先执行）
    const sortedHooks = [...hooks].sort((a, b) => b.priority - a.priority);

    for (const hook of sortedHooks) {
      try {
        const result = await this.execute(hook, context);
        results.push(result);

        // 如果钩子要求停止执行，则中断后续钩子
        if (!result.shouldContinue()) {
          this.logger.info('钩子要求停止执行后续钩子', {
            hookId: hook.hookId.toString(),
            hookName: hook.name,
          });
          break;
        }
      } catch (error) {
        results.push(
          HookExecutionResultValue.failure(
            hook.hookId.toString(),
            error instanceof Error ? error.message : String(error),
            0,
            hook.shouldContinueOnError()
          )
        );

        // 如果错误处理策略是 fail-fast，则中断后续钩子
        if (hook.failFast) {
          this.logger.info('钩子执行失败，停止执行后续钩子（fail-fast）', {
            hookId: hook.hookId.toString(),
            hookName: hook.name,
          });
          break;
        }
      }
    }

    return results;
  }

  /**
   * 验证钩子配置
   * @param hook Hook实体
   * @returns 验证结果
   */
  validateHook(hook: Hook): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      const validation = hook.validate();
      errors.push(...validation.errors);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 过滤可执行的钩子
   * @param hooks Hook实体列表
   * @returns 可执行的钩子列表
   */
  filterExecutableHooks(hooks: Hook[]): Hook[] {
    return hooks.filter(hook => hook.shouldExecute());
  }
}
