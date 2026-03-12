/**
 * ThreadExecutionCoordinator - Thread执行协调器
 * 协调Thread的执行流程，编排各个组件完成执行任务
 */

import type { ThreadEntity } from '../../entities/thread-entity.js';
import type { ThreadResult } from '@modular-agent/types';
import type { VariableCoordinator } from './variable-coordinator.js';
import type { TriggerCoordinator } from './trigger-coordinator.js';
import type { InterruptionManager } from '../../../core/managers/interruption-manager.js';
import type { ToolVisibilityCoordinator } from './tool-visibility-coordinator.js';
import type { NodeExecutionCoordinator } from './node-execution-coordinator.js';
import type { GraphNavigator } from '../../preprocessing/graph-navigator.js';
import { ThreadInterruptedException } from '@modular-agent/types';
import { createContextualLogger } from '../../../utils/contextual-logger.js';

const logger = createContextualLogger({ component: 'thread-execution-coordinator' });

/**
 * ThreadExecutionCoordinator - Thread执行协调器
 *
 * 职责：
 * - 协调Thread的执行流程
 * - 编排各个组件完成执行任务
 * - 处理中断状态
 * - 管理节点执行循环
 *
 * 设计原则：
 * - 协调逻辑：封装复杂的执行协调逻辑
 * - 依赖注入：通过构造函数接收依赖的协调器和管理器
 * - 流程编排：按照正确的顺序调用各个组件
 */
export class ThreadExecutionCoordinator {
  constructor(
    private readonly threadEntity: ThreadEntity,
    private readonly variableCoordinator: VariableCoordinator,
    private readonly triggerCoordinator: TriggerCoordinator,
    private readonly interruptionManager: InterruptionManager,
    private readonly toolVisibilityCoordinator: ToolVisibilityCoordinator,
    private readonly nodeExecutionCoordinator: NodeExecutionCoordinator,
    private readonly navigator: GraphNavigator
  ) { }

  /**
   * 执行Thread
   * @returns Thread执行结果
   */
  async execute(): Promise<ThreadResult> {
    const threadId = this.threadEntity.getThreadId();
    const startTime = this.threadEntity.getStartTime();

    // 执行流程编排
    while (true) {
      // 检查中断状态
      if (this.interruptionManager.shouldPause()) {
        throw new ThreadInterruptedException('Thread execution paused', 'PAUSE', threadId, this.threadEntity.getCurrentNodeId());
      }

      if (this.interruptionManager.shouldStop()) {
        throw new ThreadInterruptedException('Thread execution stopped', 'STOP', threadId, this.threadEntity.getCurrentNodeId());
      }

      // 获取当前节点
      const currentNodeId = this.threadEntity.getCurrentNodeId();
      if (!currentNodeId) {
        break;
      }

      // 获取节点对象
      const graphNode = this.navigator.getGraph().getNode(currentNodeId);
      if (!graphNode) {
        break;
      }

      // 使用originalNode或创建Node
      const currentNode = graphNode.originalNode || {
        id: graphNode.id,
        type: graphNode.type,
        name: graphNode.name,
        config: {},
        outgoingEdgeIds: [],
        incomingEdgeIds: []
      };

      // 执行节点
      const result = await this.nodeExecutionCoordinator.executeNode(
        this.threadEntity,
        currentNode
      );

      // 更新节点结果
      this.threadEntity.addNodeResult(result);

      // 更新当前节点ID - 使用navigator获取下一个节点
      if (result.status === 'COMPLETED') {
        const nextNode = this.navigator.getNextNode(currentNodeId);
        if (nextNode && nextNode.nextNodeId) {
          this.threadEntity.setCurrentNodeId(nextNode.nextNodeId);
        } else {
          break;
        }
      } else {
        break;
      }
    }

    // 构建执行结果
    const endTime = this.threadEntity.getEndTime() || Date.now();
    const executionTime = endTime - startTime;

    return {
      threadId,
      output: this.threadEntity.getOutput(),
      executionTime,
      nodeResults: this.threadEntity.getNodeResults(),
      metadata: {
        status: this.threadEntity.getStatus(),
        startTime,
        endTime,
        executionTime,
        nodeCount: this.threadEntity.getNodeResults().length,
        errorCount: this.threadEntity.getErrors().length
      }
    };
  }

  /**
   * 暂停Thread执行
   */
  pause(): void {
    this.interruptionManager.requestPause();
  }

  /**
   * 恢复Thread执行
   */
  resume(): void {
    this.interruptionManager.resume();
  }

  /**
   * 停止Thread执行
   */
  stop(): void {
    this.interruptionManager.requestStop();
  }

  /**
   * 获取ThreadEntity
   * @returns ThreadEntity实例
   */
  getThreadEntity(): ThreadEntity {
    return this.threadEntity;
  }
}
