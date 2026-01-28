/**
 * Join节点执行器
 * 负责执行JOIN节点，等待子Thread完成，根据策略合并结果
 */

import { NodeExecutor } from './base-node-executor';
import type { Node } from '../../../../types/node';
import type { Thread } from '../../../../types/thread';
import { NodeType } from '../../../../types/node';
import { ValidationError } from '../../../../types/errors';
import { now } from '../../../../utils';

/**
 * Join策略
 */
type JoinStrategy = 'ALL_COMPLETED' | 'ANY_COMPLETED' | 'ALL_FAILED' | 'ANY_FAILED' | 'SUCCESS_COUNT_THRESHOLD';

/**
 * Join节点配置
 */
interface JoinNodeConfig {
  /** Join ID */
  joinId: string;
  /** Join策略 */
  joinStrategy: JoinStrategy;
  /** 成功阈值（用于SUCCESS_COUNT_THRESHOLD策略） */
  threshold?: number;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 子Thread ID列表 */
  childThreadIds?: string[];
}

/**
 * Join节点执行器
 */
export class JoinNodeExecutor extends NodeExecutor {
  /**
   * 验证节点配置
   */
  protected override validate(node: Node): boolean {
    // 检查节点类型
    if (node.type !== NodeType.JOIN) {
      return false;
    }

    const config = node.config as JoinNodeConfig;

    // 检查必需的配置项
    if (!config.joinId || typeof config.joinId !== 'string') {
      throw new ValidationError('Join node must have a valid joinId', `node.${node.id}`);
    }

    const validStrategies = ['ALL_COMPLETED', 'ANY_COMPLETED', 'ALL_FAILED', 'ANY_FAILED', 'SUCCESS_COUNT_THRESHOLD'];
    if (!config.joinStrategy || !validStrategies.includes(config.joinStrategy)) {
      throw new ValidationError(`Join node must have a valid joinStrategy (${validStrategies.join(', ')})`, `node.${node.id}`);
    }

    // 检查阈值配置
    if (config.joinStrategy === 'SUCCESS_COUNT_THRESHOLD' && (config.threshold === undefined || config.threshold <= 0)) {
      throw new ValidationError('Join node must have a valid threshold when using SUCCESS_COUNT_THRESHOLD strategy', `node.${node.id}`);
    }

    // 检查超时配置
    if (config.timeout !== undefined && (typeof config.timeout !== 'number' || config.timeout <= 0)) {
      throw new ValidationError('Join node timeout must be a positive number', `node.${node.id}`);
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
    const config = node.config as JoinNodeConfig;
    const childThreadIds = config.childThreadIds || [];
    const timeout = config.timeout || 30000; // 默认30秒

    // 步骤1：验证子Thread
    if (childThreadIds.length === 0) {
      throw new ValidationError('Join node must have at least one child thread', `node.${node.id}`);
    }

    // 步骤2：等待子Thread完成
    const joinResult = await this.waitForChildThreads(childThreadIds, config.joinStrategy, config.threshold, timeout);

    // 步骤3：合并结果
    const mergedOutput = this.mergeResults(joinResult.results, config.joinStrategy);

    // 步骤4：记录执行历史
    thread.nodeResults.push({
      step: thread.nodeResults.length + 1,
      nodeId: node.id,
      nodeType: node.type,
      status: 'COMPLETED',
      timestamp: now(),
      output: {
        joinId: config.joinId,
        joinStrategy: config.joinStrategy,
        success: joinResult.success,
        output: mergedOutput,
        completedThreads: joinResult.completedCount,
        failedThreads: joinResult.failedCount,
        results: joinResult.results
      }
    });

    // 步骤5：返回执行结果
    return {
      joinId: config.joinId,
      joinStrategy: config.joinStrategy,
      success: joinResult.success,
      output: mergedOutput,
      completedThreads: joinResult.completedCount,
      failedThreads: joinResult.failedCount,
      results: joinResult.results
    };
  }

  /**
   * 等待子Thread完成
   * @param childThreadIds 子Thread ID列表
   * @param joinStrategy Join策略
   * @param threshold 成功阈值
   * @param timeout 超时时间
   * @returns Join结果
   */
  private async waitForChildThreads(
    childThreadIds: string[],
    joinStrategy: JoinStrategy,
    threshold: number | undefined,
    timeout: number
  ): Promise<any> {
    // 注意：这里使用模拟的子Thread等待
    // 实际实现应该使用ForkJoinManager等待子Thread完成

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Join timeout after ${timeout}ms`));
      }, timeout);

      // 模拟子Thread执行
      setTimeout(() => {
        clearTimeout(timer);

        // 生成模拟结果
        const results = childThreadIds.map((childThreadId, index) => ({
          childThreadId,
          status: index % 3 === 0 ? 'FAILED' : 'COMPLETED', // 模拟部分失败
          output: {
            message: `Mock result for child thread: ${childThreadId}`
          }
        }));

        const completedCount = results.filter(r => r.status === 'COMPLETED').length;
        const failedCount = results.filter(r => r.status === 'FAILED').length;

        // 根据策略判断是否成功
        let success = false;
        switch (joinStrategy) {
          case 'ALL_COMPLETED':
            success = failedCount === 0;
            break;
          case 'ANY_COMPLETED':
            success = completedCount > 0;
            break;
          case 'ALL_FAILED':
            success = completedCount === 0;
            break;
          case 'ANY_FAILED':
            success = failedCount > 0;
            break;
          case 'SUCCESS_COUNT_THRESHOLD':
            success = completedCount >= (threshold || 1);
            break;
        }

        resolve({
          success,
          completedCount,
          failedCount,
          results
        });
      }, 100);
    });
  }

  /**
   * 合并结果
   * @param results 结果数组
   * @param joinStrategy Join策略
   * @returns 合并后的输出
   */
  private mergeResults(results: any[], joinStrategy: JoinStrategy): any {
    if (results.length === 0) {
      return {};
    }

    if (results.length === 1) {
      return results[0].output;
    }

    // 根据策略合并结果
    switch (joinStrategy) {
      case 'ALL_COMPLETED':
      case 'SUCCESS_COUNT_THRESHOLD':
        // 合并所有成功的结果
        const successfulResults = results.filter(r => r.status === 'COMPLETED');
        if (successfulResults.length === 0) {
          return {};
        }
        return {
          merged: true,
          count: successfulResults.length,
          outputs: successfulResults.map(r => r.output)
        };

      case 'ANY_COMPLETED':
        // 返回第一个成功的结果
        const firstSuccess = results.find(r => r.status === 'COMPLETED');
        return firstSuccess ? firstSuccess.output : {};

      case 'ALL_FAILED':
      case 'ANY_FAILED':
        // 返回所有结果
        return {
          merged: true,
          count: results.length,
          outputs: results.map(r => r.output)
        };

      default:
        return {
          merged: true,
          count: results.length,
          outputs: results.map(r => r.output)
        };
    }
  }
}
