/**
 * Hook执行管理器
 *
 * 负责在执行引擎的关键点调用Hooks
 * 作为Thread层执行引擎的扩展组件
 */

import { injectable, inject } from 'inversify';
import { HookPoint, HookContext, HookContextBuilder } from './hook-context';
import { HookExecutionResult, HookExecutionResultBuilder } from './hook-execution-result';
import { BaseHook } from './base-hook';

/**
 * Hook执行管理器
 */
@injectable()
export class HookExecutionManager {
  private hooks: Map<HookPoint, BaseHook[]> = new Map();

  /**
   * 注册Hook
   */
  registerHook(hookPoint: HookPoint, hook: BaseHook): void {
    const hooks = this.hooks.get(hookPoint) || [];
    hooks.push(hook);
    hooks.sort((a, b) => b.getPriority() - a.getPriority());
    this.hooks.set(hookPoint, hooks);
  }

  /**
   * 移除Hook
   */
  unregisterHook(hookPoint: HookPoint, hookId: string): boolean {
    const hooks = this.hooks.get(hookPoint);
    if (!hooks) {
      return false;
    }

    const index = hooks.findIndex(h => h.getId() === hookId);
    if (index === -1) {
      return false;
    }

    hooks.splice(index, 1);
    return true;
  }

  /**
   * 执行节点前Hook
   */
  async executePreNodeExecution(
    nodeId: string,
    nodeType: string,
    context: Record<string, unknown>
  ): Promise<HookExecutionResult> {
    const hookContext = HookContextBuilder.create(HookPoint.BEFORE_NODE_EXECUTE)
      .setNodeId(nodeId)
      .setConfig({ nodeType })
      .build();

    return this.executeHooks(HookPoint.BEFORE_NODE_EXECUTE, hookContext);
  }

  /**
   * 执行节点后Hook
   */
  async executePostNodeExecution(
    nodeId: string,
    nodeType: string,
    result: Record<string, unknown>,
    context: Record<string, unknown>
  ): Promise<HookExecutionResult> {
    const hookContext = HookContextBuilder.create(HookPoint.AFTER_NODE_EXECUTE)
      .setNodeId(nodeId)
      .setConfig({ nodeType })
      .addMetadata('result', result)
      .build();

    return this.executeHooks(HookPoint.AFTER_NODE_EXECUTE, hookContext);
  }

  /**
   * 执行状态转换前Hook
   */
  async executePreStateTransition(
    nodeId: string,
    oldStatus: string,
    newStatus: string,
    context: Record<string, unknown>
  ): Promise<HookExecutionResult> {
    const hookContext = HookContextBuilder.create(HookPoint.BEFORE_EXECUTE)
      .setNodeId(nodeId)
      .setState({
        status: newStatus,
        data: context,
        metadata: {
          oldStatus
        }
      })
      .build();

    return this.executeHooks(HookPoint.BEFORE_EXECUTE, hookContext);
  }

  /**
   * 执行状态转换后Hook
   */
  async executePostStateTransition(
    nodeId: string,
    oldStatus: string,
    newStatus: string,
    context: Record<string, unknown>
  ): Promise<HookExecutionResult> {
    const hookContext = HookContextBuilder.create(HookPoint.AFTER_EXECUTE)
      .setNodeId(nodeId)
      .setState({
        status: newStatus,
        data: context,
        metadata: {
          oldStatus
        }
      })
      .build();

    return this.executeHooks(HookPoint.AFTER_EXECUTE, hookContext);
  }

  /**
   * 执行所有Hooks
   */
  private async executeHooks(
    hookPoint: HookPoint,
    context: HookContext
  ): Promise<HookExecutionResult> {
    const hooks = this.hooks.get(hookPoint) || [];
    const results: Array<{ hookId: string; success: boolean; result: unknown; error?: Error; executionTime: number }> = [];
    let hasFailure = false;

    const startTime = Date.now();

    for (const hook of hooks) {
      if (!hook.isEnabled()) {
        continue;
      }

      try {
        const result = await hook.execute(context);
        results.push({
          hookId: hook.getId(),
          success: result.success,
          result: result.result,
          executionTime: result.executionTime
        });

        if (!result.success) {
          hasFailure = true;
        }
      } catch (error) {
        results.push({
          hookId: hook.getId(),
          success: false,
          result: undefined,
          error: error as Error,
          executionTime: Date.now() - startTime
        });
        hasFailure = true;
      }
    }

    const totalTime = Date.now() - startTime;

    return new HookExecutionResultBuilder()
      .setHookId(`hook-execution-${hookPoint}`)
      .setSuccess(!hasFailure)
      .setExecutionTime(totalTime)
      .setMetadata({
        executedCount: results.length,
        successCount: results.filter(r => r.success).length,
        failureCount: results.filter(r => !r.success).length
      })
      .build();
  }

  /**
   * 获取已注册的Hooks
   */
  getRegisteredHooks(hookPoint?: HookPoint): BaseHook[] {
    if (hookPoint) {
      return this.hooks.get(hookPoint) || [];
    }

    const allHooks: BaseHook[] = [];
    for (const hooks of this.hooks.values()) {
      allHooks.push(...hooks);
    }
    return allHooks;
  }

  /**
   * 检查是否有注册的Hooks
   */
  hasHooks(hookPoint: HookPoint): boolean {
    const hooks = this.hooks.get(hookPoint);
    return hooks !== undefined && hooks.length > 0;
  }

  /**
   * 清空所有Hooks
   */
  clearHooks(): void {
    this.hooks.clear();
  }

  /**
   * 清空指定HookPoint的Hooks
   */
  clearHooksForPoint(hookPoint: HookPoint): void {
    this.hooks.delete(hookPoint);
  }
}
