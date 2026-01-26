/**
 * Fork节点执行器
 * 负责执行FORK节点，创建子Thread，支持串行和并行分叉策略
 */

import { NodeExecutor } from './base-node-executor';
import type { Node } from '../../../../types/node';
import type { Thread } from '../../../../types/thread';
import { NodeType } from '../../../../types/node';
import { ValidationError } from '../../../../types/errors';

/**
 * Fork节点配置
 */
interface ForkNodeConfig {
  /** Fork ID */
  forkId: string;
  /** Fork策略 */
  forkStrategy: 'SERIAL' | 'PARALLEL';
  /** 子节点ID列表 */
  childNodeIds?: string[];
}

/**
 * Fork节点执行器
 */
export class ForkNodeExecutor extends NodeExecutor {
  /**
   * 验证节点配置
   */
  protected override validate(node: Node): boolean {
    // 检查节点类型
    if (node.type !== NodeType.FORK) {
      return false;
    }

    const config = node.config as ForkNodeConfig;

    // 检查必需的配置项
    if (!config.forkId || typeof config.forkId !== 'string') {
      throw new ValidationError('Fork node must have a valid forkId', `node.${node.id}`);
    }

    if (!config.forkStrategy || !['SERIAL', 'PARALLEL'].includes(config.forkStrategy)) {
      throw new ValidationError('Fork node must have a valid forkStrategy (SERIAL or PARALLEL)', `node.${node.id}`);
    }

    return true;
  }

  /**
   * 检查节点是否可以执行
   */
  protected override canExecute(thread: Thread, node: Node): boolean {
    // 调用父类检查
    if (!super.canExecute(thread, node)) {
      return false;
    }

    return true;
  }

  /**
   * 执行节点的具体逻辑
   */
  protected override async doExecute(thread: Thread, node: Node): Promise<any> {
    const config = node.config as ForkNodeConfig;
    const childNodeIds = config.childNodeIds || [];

    // 步骤1：验证子节点
    if (childNodeIds.length === 0) {
      throw new ValidationError('Fork node must have at least one child node', `node.${node.id}`);
    }

    // 步骤2：创建子Thread信息
    const childThreadIds = childNodeIds.map((_, index) => `${thread.id}_fork_${Date.now()}_${index}`);

    // 步骤3：根据策略执行子Thread
    const results: any[] = [];

    if (config.forkStrategy === 'SERIAL') {
      // 串行执行
      for (let i = 0; i < childThreadIds.length; i++) {
        const childThreadId = childThreadIds[i];
        const childNodeId = childNodeIds[i];
        if (childNodeId && childThreadId) {
          const result = await this.executeChildThread(childThreadId, childNodeId, thread);
          results.push(result);
        }
      }
    } else {
      // 并行执行
      const promises = childThreadIds.map((childThreadId, index) => {
        const childNodeId = childNodeIds[index];
        if (childNodeId && childThreadId) {
          return this.executeChildThread(childThreadId, childNodeId, thread);
        }
        return Promise.resolve(null);
      });
      const parallelResults = await Promise.all(promises);
      results.push(...parallelResults.filter(r => r !== null));
    }

    // 步骤4：记录执行历史
    thread.executionHistory.push({
      step: thread.executionHistory.length + 1,
      nodeId: node.id,
      nodeType: node.type,
      status: 'COMPLETED',
      timestamp: Date.now(),
      action: 'fork',
      details: {
        forkId: config.forkId,
        forkStrategy: config.forkStrategy,
        childThreadIds,
        childNodeIds
      }
    });

    // 步骤5：返回执行结果
    return {
      forkId: config.forkId,
      forkStrategy: config.forkStrategy,
      childThreadIds,
      childNodeIds,
      results
    };
  }

  /**
   * 执行子Thread（模拟）
   * @param childThreadId 子Thread ID
   * @param childNodeId 子节点ID
   * @param parentThread 父Thread
   * @returns 执行结果
   */
  private async executeChildThread(childThreadId: string, childNodeId: string, parentThread: Thread): Promise<any> {
    // 注意：这里使用模拟的子Thread执行
    // 实际实现应该使用ThreadExecutor或ForkJoinManager执行子Thread

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          childThreadId,
          childNodeId,
          status: 'COMPLETED',
          output: {
            message: `Mock result for child thread: ${childThreadId}`
          }
        });
      }, 100);
    });
  }
}
