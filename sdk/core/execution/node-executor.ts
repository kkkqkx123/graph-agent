/**
 * 节点执行器基类
 * 定义节点执行的标准接口和通用逻辑
 */

import type { Node } from '../../types/node';
import type { NodeExecutionResult } from '../../types/thread';
import type { ExecutionContext } from '../../types/execution';
import { NodeStatus } from '../../types/node';
import { ExecutionError, TimeoutError, ValidationError as SDKValidationError } from '../../types/errors';

/**
 * 节点执行器基类
 */
export abstract class NodeExecutor {
  /**
   * 执行节点
   * @param context 执行上下文
   * @returns 节点执行结果
   */
  async execute(context: ExecutionContext): Promise<NodeExecutionResult> {
    const node = context.workflow.nodes.find(n => n.id === context.thread.currentNodeId);
    if (!node) {
      throw new ExecutionError(
        `Node not found: ${context.thread.currentNodeId}`,
        context.thread.currentNodeId,
        context.workflow.id
      );
    }

    // 步骤1：验证节点
    if (!this.validate(node)) {
      throw new SDKValidationError(`Node validation failed: ${node.id}`, `node.${node.id}`);
    }

    // 步骤2：检查是否可以执行
    if (!this.canExecute(node, context)) {
      return {
        nodeId: node.id,
        nodeType: node.type,
        status: NodeStatus.SKIPPED,
        executionTime: 0
      };
    }

    const startTime = Date.now();

    try {
      // 步骤3：执行节点
      const output = await this.doExecute(context);

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
   * @param node 节点
   * @param context 执行上下文
   * @returns 是否可以执行
   */
  protected canExecute(node: Node, context: ExecutionContext): boolean {
    // 检查Thread状态
    if (context.thread.status !== 'RUNNING') {
      return false;
    }

    // 子类可以覆盖此方法进行特定检查
    return true;
  }

  /**
   * 执行节点的具体逻辑（抽象方法）
   * @param context 执行上下文
   * @returns 执行输出
   */
  protected abstract doExecute(context: ExecutionContext): Promise<any>;
}