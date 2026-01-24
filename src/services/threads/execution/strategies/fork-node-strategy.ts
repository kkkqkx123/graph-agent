/**
 * Fork Node 执行策略
 * 
 * 负责执行 Fork 节点，创建多个子 Thread 实现并行执行
 */

import { injectable, inject } from 'inversify';
import { Node } from '../../../../domain/workflow/entities/node';
import { ForkNode } from '../../../../domain/workflow/entities/node/fork-node';
import { NodeExecutionResult } from '../../../../domain/workflow/entities/node';
import { ExecutionContext } from '../context/execution-context';
import { INodeExecutionStrategy } from './node-execution-strategy';
import { ThreadFork } from '../../thread-fork';
import { IThreadRepository } from '../../../../domain/threads/repositories/thread-repository';
import { ID } from '../../../../domain/common/value-objects/id';
import { ForkStrategy } from '../../../../domain/sessions/value-objects/operations/fork/fork-strategy';
import { ILogger } from '../../../../domain/common/types/logger-types';

/**
 * Fork Node 执行策略
 */
@injectable()
export class ForkNodeStrategy implements INodeExecutionStrategy {
  constructor(
    @inject('Logger') private readonly logger: ILogger,
    @inject('ThreadFork') private readonly threadFork: ThreadFork,
    @inject('ThreadRepository') private readonly threadRepository: IThreadRepository
  ) {}

  canExecute(node: Node): boolean {
    return node instanceof ForkNode;
  }

  async execute(node: Node, context: ExecutionContext): Promise<NodeExecutionResult> {
    if (!(node instanceof ForkNode)) {
      return {
        success: false,
        error: '节点类型不匹配，期望 ForkNode',
        metadata: {
          nodeId: node.nodeId.toString(),
          nodeType: node.type.toString(),
        },
      };
    }

    const startTime = Date.now();

    this.logger.debug('ForkNodeStrategy 开始执行 Fork 节点', {
      nodeId: node.nodeId.toString(),
      threadId: context.threadId,
      branchCount: node.branchCount,
      parallel: node.parallel,
    });

    try {
      // 1. 获取当前 Thread
      const parentThread = await this.threadRepository.findById(ID.fromString(context.threadId));
      
      if (!parentThread) {
        throw new Error(`父线程不存在: ${context.threadId}`);
      }

      // 2. 准备分支配置
      const branches = this.generateBranches(node, context);

      // 3. 调用 ThreadFork 服务创建子线程
      this.logger.debug('调用 ThreadFork 创建子线程', {
        parentThreadId: context.threadId,
        branchCount: branches.length,
        parallel: node.parallel,
      });

      const forkResult = await this.threadFork.executeFork({
        parentThread,
        forkPoint: node.nodeId,
        branches,
        forkStrategy: node.parallel ? ForkStrategy.createFull() : ForkStrategy.createPartial()
      });

      if (!forkResult.success) {
        throw new Error(`Fork 失败: ${forkResult.error?.message || '未知错误'}`);
      }

      // 4. 存储子线程ID到父线程状态
      const forkedThreadIds = forkResult.result?.forkedThreadIds?.map(id => id.toString()) || [];
      context.setVariable('child_thread_ids', forkedThreadIds);
      context.setVariable('fork_point', node.nodeId.toString());
      context.setVariable('fork_branch_count', branches.length);

      const executionTime = Date.now() - startTime;

      this.logger.info('Fork 节点执行成功', {
        nodeId: node.nodeId.toString(),
        threadId: context.threadId,
        executionTime,
        forkedThreads: forkedThreadIds.length,
        parallel: node.parallel,
      });

      return {
        success: true,
        output: {
          forkedThreadIds,
          branchCount: branches.length,
          parallel: node.parallel,
        },
        executionTime,
        metadata: {
          nodeId: node.nodeId.toString(),
          forkedThreads: forkedThreadIds.length,
          parallel: node.parallel,
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.logger.error('Fork 节点执行失败', error instanceof Error ? error : new Error(String(error)), {
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
   * 生成分支配置
   * @param node Fork 节点
   * @param context 执行上下文
   * @returns 分支配置数组
   */
  private generateBranches(node: ForkNode, context: ExecutionContext): Array<{
    branchId: string;
    targetNodeId: string;
    name?: string;
    condition?: string;
    weight?: number;
  }> {
    const branches: Array<{
      branchId: string;
      targetNodeId: string;
      name?: string;
      condition?: string;
      weight?: number;
    }> = [];

    // 从上下文中获取分支信息
    // 这里假设分支信息已经通过某种方式设置到上下文中
    // 实际实现可能需要从 Workflow 的边信息中获取
    
    for (let i = 0; i < node.branchCount; i++) {
      branches.push({
        branchId: `branch_${i}`,
        targetNodeId: `target_node_${i}`, // TODO: 从 Workflow 边信息中获取
        name: `分支 ${i + 1}`,
        weight: 1, // 默认权重
      });
    }

    this.logger.debug('生成分支配置', {
      branchCount: branches.length,
      branches: branches.map(b => ({ branchId: b.branchId, name: b.name })),
    });

    return branches;
  }
}