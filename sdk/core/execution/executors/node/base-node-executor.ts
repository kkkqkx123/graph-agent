/**
 * 节点执行器基类
 * 定义节点执行的标准接口和通用逻辑
 */

import type { Node } from '../../../../types/node';
import type { Thread } from '../../../../types/thread';
import type { NodeExecutionResult } from '../../../../types/thread';
import type { NodeCustomEvent } from '../../../../types/events';
import { NodeStatus } from '../../../../types/node';
import { ValidationError } from '../../../../types/errors';
import { HookExecutor } from '../hook-executor';
import { now, diffTimestamp } from '../../../../utils';

/**
 * 节点执行器基类
 */
export abstract class NodeExecutor {
  /**
   * 执行节点
   * @param thread Thread 实例
   * @param node 节点定义
   * @param emitEvent 可选的事件发射函数，用于Hook执行
   * @returns 节点执行结果
   */
  async execute(
    thread: Thread,
    node: Node,
    emitEvent?: (event: NodeCustomEvent) => Promise<void>
  ): Promise<NodeExecutionResult> {
    // 步骤1：验证节点配置
    if (!this.validate(node)) {
      throw new ValidationError(`Node validation failed: ${node.id}`, `node.${node.id}`);
    }

    // 步骤2：检查是否可以执行
    if (!this.canExecute(thread, node)) {
      return {
        nodeId: node.id,
        nodeType: node.type,
        status: NodeStatus.SKIPPED,
        step: thread.nodeResults.length + 1,
        executionTime: 0
      };
    }

    const startTime = now();

    // 步骤3：执行BEFORE_EXECUTE类型的Hook
    if (emitEvent && node.hooks && node.hooks.length > 0) {
      const hookExecutor = new HookExecutor();
      await hookExecutor.executeBeforeExecute({ thread, node }, emitEvent);
    }

    try {
      // 步骤4：执行节点逻辑
      const output = await this.doExecute(thread, node);

      // 步骤5：构建执行结果
      const endTime = now();
      const result: NodeExecutionResult = {
        nodeId: node.id,
        nodeType: node.type,
        status: NodeStatus.COMPLETED,
        step: thread.nodeResults.length + 1,
        output,
        executionTime: diffTimestamp(startTime, endTime),
        startTime,
        endTime
      };

      // 步骤6：执行AFTER_EXECUTE类型的Hook
      if (emitEvent && node.hooks && node.hooks.length > 0) {
        const hookExecutor = new HookExecutor();
        await hookExecutor.executeAfterExecute({ thread, node, result }, emitEvent);
      }

      // 步骤7：返回成功结果
      return result;
    } catch (error) {
      // 步骤8：构建失败结果
      const errorMessage = error instanceof Error ? error.message : String(error);
      const endTime = now();
      const result: NodeExecutionResult = {
        nodeId: node.id,
        nodeType: node.type,
        status: NodeStatus.FAILED,
        step: thread.nodeResults.length + 1,
        error: errorMessage,
        executionTime: diffTimestamp(startTime, endTime),
        startTime,
        endTime
      };

      // 步骤9：执行AFTER_EXECUTE类型的Hook（即使失败也执行）
      if (emitEvent && node.hooks && node.hooks.length > 0) {
        const hookExecutor = new HookExecutor();
        await hookExecutor.executeAfterExecute({ thread, node, result }, emitEvent);
      }

      // 步骤10：返回失败结果
      return result;
    }
  }

  /**
   * 验证节点配置
   * @param node 节点
   * @returns 是否验证通过
   */
  protected validate(node: Node): boolean {
    // 基本验证
    if (!node.id || !node.name || !node.type) {
      return false;
    }

    // 子类可以覆盖此方法进行特定验证
    return true;
  }

  /**
   * 检查节点是否可以执行
   * @param thread Thread 实例
   * @param node 节点
   * @returns 是否可以执行
   */
  protected canExecute(thread: Thread, node: Node): boolean {
    // 检查Thread状态
    if (thread.status !== 'RUNNING') {
      return false;
    }

    // 子类可以覆盖此方法进行特定检查
    return true;
  }

  /**
   * 执行节点的具体逻辑（抽象方法）
   * @param thread Thread 实例
   * @param node 节点定义
   * @returns 执行输出
   */
  protected abstract doExecute(thread: Thread, node: Node): Promise<any>;
}