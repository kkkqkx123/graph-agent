/**
 * Join Node 执行策略
 * 
 * 负责执行 Join 节点，等待子 Thread 完成并合并结果
 */

import { injectable, inject } from 'inversify';
import { Node } from '../../../../domain/workflow/entities/node';
import { JoinNode } from '../../../../domain/workflow/entities/node/join-node';
import { NodeExecutionResult } from '../../../../domain/workflow/entities/node';
import { ExecutionContext } from '../context/execution-context';
import { INodeExecutionStrategy } from './node-execution-strategy';
import { ThreadJoin } from '../../thread-join';
import { IThreadRepository } from '../../../../domain/threads/repositories/thread-repository';
import { ID } from '../../../../domain/common/value-objects/id';
import { ILogger } from '../../../../domain/common/types/logger-types';

/**
 * Join Node 执行策略
 */
@injectable()
export class JoinNodeStrategy implements INodeExecutionStrategy {
  constructor(
    @inject('Logger') private readonly logger: ILogger,
    @inject('ThreadJoin') private readonly threadJoin: ThreadJoin,
    @inject('ThreadRepository') private readonly threadRepository: IThreadRepository
  ) { }

  canExecute(node: Node): boolean {
    return node instanceof JoinNode;
  }

  async execute(node: Node, context: ExecutionContext): Promise<NodeExecutionResult> {
    if (!(node instanceof JoinNode)) {
      return {
        success: false,
        error: '节点类型不匹配，期望 JoinNode',
        metadata: {
          nodeId: node.nodeId.toString(),
          nodeType: node.type.toString(),
        },
      };
    }

    const startTime = Date.now();

    this.logger.debug('JoinNodeStrategy 开始执行 Join 节点', {
      nodeId: node.nodeId.toString(),
      threadId: context.threadId,
      branchCount: node.branchCount,
      mergeStrategy: node.mergeStrategy,
    });

    try {
      // 1. 获取父线程
      const parentThread = await this.threadRepository.findById(ID.fromString(context.threadId));

      if (!parentThread) {
        throw new Error(`父线程不存在: ${context.threadId}`);
      }

      // 2. 获取子线程ID列表
      const childThreadIds = context.getVariable('child_thread_ids') || [];

      if (childThreadIds.length === 0) {
        this.logger.warn('没有子线程需要合并', {
          nodeId: node.nodeId.toString(),
          threadId: context.threadId,
        });

        return {
          success: true,
          output: {},
          executionTime: Date.now() - startTime,
          metadata: {
            nodeId: node.nodeId.toString(),
            mergedThreads: 0,
            mergeStrategy: node.mergeStrategy,
          },
        };
      }

      // 3. 调用 ThreadJoin 服务等待子线程完成
      this.logger.debug('调用 ThreadJoin 等待子线程完成', {
        parentThreadId: context.threadId,
        childThreadCount: childThreadIds.length,
        mergeStrategy: node.mergeStrategy,
      });

      const joinResult = await this.threadJoin.executeJoin({
        parentThread,
        joinPoint: node.nodeId,
        childThreadIds: childThreadIds.map((id: string) => ID.fromString(id))
      });

      if (!joinResult.success) {
        throw new Error(`Join 失败: ${joinResult.error?.message || '未知错误'}`);
      }

      // 4. 根据合并策略处理结果
      const mergedResults = this.applyMergeStrategy(
        joinResult.result?.mergedResults || {},
        node.mergeStrategy
      );

      // 5. 更新父线程状态
      context.setVariable('merged_results', mergedResults);
      context.setVariable('join_point', node.nodeId.toString());
      context.setVariable('joined_thread_count', childThreadIds.length);

      // 6. 清理子线程ID
      context.deleteVariable('child_thread_ids');

      const executionTime = Date.now() - startTime;

      this.logger.info('Join 节点执行成功', {
        nodeId: node.nodeId.toString(),
        threadId: context.threadId,
        executionTime,
        joinedThreads: childThreadIds.length,
        mergeStrategy: node.mergeStrategy,
      });

      return {
        success: true,
        output: mergedResults,
        executionTime,
        metadata: {
          nodeId: node.nodeId.toString(),
          joinedThreads: childThreadIds.length,
          mergeStrategy: node.mergeStrategy,
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.logger.error('Join 节点执行失败', error instanceof Error ? error : new Error(String(error)), {
        nodeId: node.nodeId.toString(),
        threadId: context.threadId,
        branchCount: node.branchCount,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
        metadata: {
          nodeId: node.nodeId.toString(),
          branchCount: node.branchCount,
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        },
      };
    }
  }

  /**
   * 应用合并策略
   * @param results 分支结果
   * @param strategy 合并策略
   * @returns 合并后的结果
   */
  private applyMergeStrategy(
    results: Record<string, unknown>,
    strategy: 'all' | 'any' | 'first'
  ): any {
    this.logger.debug('应用合并策略', {
      strategy,
      resultKeys: Object.keys(results),
    });

    switch (strategy) {
      case 'all':
        // 返回所有结果
        return results;

      case 'any':
        // 返回任意一个成功的结果
        const anyResult = Object.values(results).find(result =>
          result !== null && result !== undefined
        );
        return anyResult !== undefined ? anyResult : null;

      case 'first':
        // 返回第一个结果
        const firstResult = Object.values(results)[0];
        return firstResult !== undefined ? firstResult : null;

      default:
        this.logger.warn('未知的合并策略，使用默认策略 all', { strategy });
        return results;
    }
  }
}