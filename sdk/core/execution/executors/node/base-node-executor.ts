/**
 * 节点执行器基类
 * 定义节点执行的标准接口和通用逻辑
 */

import type { Node } from '../../../../types/node';
import type { Thread } from '../../../../types/thread';
import type { NodeExecutionResult } from '../../../../types/thread';
import { NodeStatus } from '../../../../types/node';
import { ValidationError } from '../../../../types/errors';

/**
 * 节点执行器基类
 */
export abstract class NodeExecutor {
  /**
   * 执行节点
   * @param thread Thread 实例
   * @param node 节点定义
   * @returns 节点执行结果
   */
  async execute(thread: Thread, node: Node): Promise<NodeExecutionResult> {
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
        executionTime: 0
      };
    }

    const startTime = Date.now();

    try {
      // 步骤3：执行节点逻辑
      const output = await this.doExecute(thread, node);

      // 步骤4：返回成功结果
      return {
        nodeId: node.id,
        nodeType: node.type,
        status: NodeStatus.COMPLETED,
        output,
        executionTime: Date.now() - startTime,
        startTime,
        endTime: Date.now()
      };
    } catch (error) {
      // 步骤5：返回失败结果
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        nodeId: node.id,
        nodeType: node.type,
        status: NodeStatus.FAILED,
        error: errorMessage,
        executionTime: Date.now() - startTime,
        startTime,
        endTime: Date.now()
      };
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