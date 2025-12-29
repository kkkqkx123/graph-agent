import { injectable, inject } from 'inversify';
import { HookValueObject } from '../../../domain/workflow/value-objects/hook-value-object';
import { FunctionRegistry } from '../functions/execution/registry/function-registry';
import { WorkflowExecutionContext } from '../functions/base/base-workflow-function';
import { ILogger } from '../../../domain/common/types/logger-types';
import { HookContext } from './hook-context';
import { HookExecutionResult, HookExecutionResultBuilder } from './hook-execution-result';

/**
 * 钩子执行器
 *
 * 职责：
 * - 负责在指定 hookPoint 执行钩子
 * - 直接调用 HookFunction
 * - 返回钩子执行结果
 *
 * 注意：Hook 是无状态的，每次执行时调用
 */
@injectable()
export class HookExecutor {
  constructor(
    @inject('FunctionRegistry') private readonly functionRegistry: FunctionRegistry,
    @inject('Logger') private readonly logger: ILogger
  ) {}

  /**
   * 执行单个钩子
   * @param hook 钩子值对象
   * @param context 钩子上下文
   * @returns 钩子执行结果
   */
  async execute(hook: HookValueObject, context: HookContext): Promise<HookExecutionResult> {
    const startTime = Date.now();

    try {
      this.logger.info('开始执行钩子', {
        hookId: hook.id.toString(),
        hookPoint: hook.hookPoint.toString(),
        hookName: hook.name,
        enabled: hook.enabled,
        priority: hook.priority
      });

      // 检查钩子是否应该执行
      if (!hook.shouldExecute()) {
        return new HookExecutionResultBuilder()
          .setHookId(hook.id.toString())
          .setSuccess(true)
          .setExecutionTime(Date.now() - startTime)
          .setMetadata({ skipped: true, reason: 'hook is disabled' })
          .build();
      }

      // 构建函数执行上下文
      const functionContext: WorkflowExecutionContext = {
        getVariable: (key: string) => context.config?.[key],
        setVariable: (key: string, value: any) => {
          if (context.config) {
            (context.config as Record<string, any>)[key] = value;
          }
        },
        getNodeResult: (nodeId: string) => context.metadata?.[nodeId],
        setNodeResult: (nodeId: string, result: any) => {
          if (context.metadata) {
            context.metadata[nodeId] = result;
          }
        },
        getExecutionId: () => context.executionId || '',
        getWorkflowId: () => context.workflowId?.toString() || ''
      };

      // 直接调用钩子函数
      const hookFunction = this.functionRegistry.getHookFunction(hook.hookPoint.toString());
      if (!hookFunction) {
        throw new Error(`未找到钩子函数: ${hook.hookPoint.toString()}`);
      }

      // 构建配置
      const config = {
        hookId: hook.id.toString(),
        hookPoint: hook.hookPoint.toString(),
        ...hook.config
      };

      const result = await hookFunction.execute(functionContext, config);

      const executionTime = Date.now() - startTime;

      this.logger.info('钩子执行完成', {
        hookId: hook.id.toString(),
        hookName: hook.name,
        executionTime,
        success: true
      });

      return new HookExecutionResultBuilder()
        .setHookId(hook.id.toString())
        .setSuccess(true)
        .setResult(result)
        .setExecutionTime(executionTime)
        .setShouldContinue(result.shouldContinue !== false)
        .build();

    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.logger.error('钩子执行失败', error instanceof Error ? error : new Error(String(error)), {
        hookId: hook.id.toString(),
        hookName: hook.name,
        executionTime
      });

      // 根据错误处理策略决定是否继续
      const shouldContinue = hook.shouldContinueOnError();

      return new HookExecutionResultBuilder()
        .setHookId(hook.id.toString())
        .setSuccess(false)
        .setError(error as Error)
        .setExecutionTime(executionTime)
        .setShouldContinue(shouldContinue)
        .build();
    }
  }

  /**
   * 批量执行钩子
   * @param hooks 钩子值对象列表
   * @param context 钩子上下文
   * @returns 钩子执行结果列表
   */
  async executeBatch(hooks: HookValueObject[], context: HookContext): Promise<HookExecutionResult[]> {
    const results: HookExecutionResult[] = [];

    // 按优先级排序（优先级高的先执行）
    const sortedHooks = [...hooks].sort((a, b) => b.priority - a.priority);

    for (const hook of sortedHooks) {
      try {
        const result = await this.execute(hook, context);
        results.push(result);

        // 如果钩子要求停止执行，则中断后续钩子
        if (!result.shouldContinue) {
          this.logger.info('钩子要求停止执行后续钩子', {
            hookId: hook.id.toString(),
            hookName: hook.name
          });
          break;
        }
      } catch (error) {
        results.push(
          new HookExecutionResultBuilder()
            .setHookId(hook.id.toString())
            .setSuccess(false)
            .setError(error as Error)
            .setExecutionTime(0)
            .setShouldContinue(hook.shouldContinueOnError())
            .build()
        );

        // 如果错误处理策略是 fail-fast，则中断后续钩子
        if (hook.shouldFailFast()) {
          this.logger.info('钩子执行失败，停止执行后续钩子（fail-fast）', {
            hookId: hook.id.toString(),
            hookName: hook.name
          });
          break;
        }
      }
    }

    return results;
  }

  /**
   * 验证钩子配置
   * @param hook 钩子值对象
   * @returns 验证结果
   */
  validateHook(hook: HookValueObject): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      hook.validate();
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 过滤可执行的钩子
   * @param hooks 钩子值对象列表
   * @returns 可执行的钩子列表
   */
  filterExecutableHooks(hooks: HookValueObject[]): HookValueObject[] {
    return hooks.filter(hook => hook.shouldExecute());
  }
}