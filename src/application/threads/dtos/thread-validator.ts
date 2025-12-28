/**
 * 线程数据验证器
 */

import { ThreadInfo, ThreadStatistics } from './thread-info';
import { CreateThreadRequest } from './create-thread';
import { NodeExecution } from '../../../domain/threads/value-objects/node-execution';
import { NodeStatus, NodeStatusValue } from '../../../domain/workflow';

export class ThreadValidator {
  /**
   * 验证线程信息数据
   */
  static validateThreadInfo(data: any): ThreadInfo {
    if (typeof data.threadId !== 'string') {
      throw new Error('threadId must be string');
    }
    if (typeof data.sessionId !== 'string') {
      throw new Error('sessionId must be string');
    }
    if (data.workflowId && typeof data.workflowId !== 'string') {
      throw new Error('workflowId must be string');
    }
    if (typeof data.status !== 'string') {
      throw new Error('status must be string');
    }
    if (typeof data.priority !== 'number') {
      throw new Error('priority must be number');
    }
    if (data.title && typeof data.title !== 'string') {
      throw new Error('title must be string');
    }
    if (data.description && typeof data.description !== 'string') {
      throw new Error('description must be string');
    }
    if (typeof data.createdAt !== 'string') {
      throw new Error('createdAt must be string');
    }
    if (data.startedAt && typeof data.startedAt !== 'string') {
      throw new Error('startedAt must be string');
    }
    if (data.completedAt && typeof data.completedAt !== 'string') {
      throw new Error('completedAt must be string');
    }
    if (data.errorMessage && typeof data.errorMessage !== 'string') {
      throw new Error('errorMessage must be string');
    }

    return data as ThreadInfo;
  }

  /**
   * 验证创建线程请求数据
   */
  static validateCreateThreadRequest(data: any): CreateThreadRequest {
    if (typeof data.sessionId !== 'string') {
      throw new Error('sessionId must be string');
    }
    if (data.workflowId && typeof data.workflowId !== 'string') {
      throw new Error('workflowId must be string');
    }
    if (data.priority && typeof data.priority !== 'number') {
      throw new Error('priority must be number');
    }
    if (data.title && typeof data.title !== 'string') {
      throw new Error('title must be string');
    }
    if (data.description && typeof data.description !== 'string') {
      throw new Error('description must be string');
    }
    if (data.metadata && typeof data.metadata !== 'object') {
      throw new Error('metadata must be object');
    }

    return data as CreateThreadRequest;
  }

  /**
   * 验证线程统计数据
   */
  static validateThreadStatistics(data: any): ThreadStatistics {
    if (typeof data.total !== 'number') {
      throw new Error('total must be number');
    }
    if (typeof data.pending !== 'number') {
      throw new Error('pending must be number');
    }
    if (typeof data.running !== 'number') {
      throw new Error('running must be number');
    }
    if (typeof data.paused !== 'number') {
      throw new Error('paused must be number');
    }
    if (typeof data.completed !== 'number') {
      throw new Error('completed must be number');
    }
    if (typeof data.failed !== 'number') {
      throw new Error('failed must be number');
    }
    if (typeof data.cancelled !== 'number') {
      throw new Error('cancelled must be number');
    }

    return data as ThreadStatistics;
  }

  /**
   * 验证节点执行的时间一致性
   */
  static validateNodeExecutionTimeConsistency(nodeExecution: NodeExecution): void {
    if (nodeExecution.startTime && nodeExecution.endTime) {
      if (nodeExecution.startTime.isAfter(nodeExecution.endTime)) {
        throw new Error('开始时间不能晚于结束时间');
      }
    }
  }

  /**
   * 验证节点执行状态与时间的匹配
   */
  static validateNodeExecutionStatusTimeMatch(nodeExecution: NodeExecution): void {
    if (nodeExecution.status.isRunning() && !nodeExecution.startTime) {
      throw new Error('运行中的节点必须有开始时间');
    }
    if (nodeExecution.status.isTerminal() && !nodeExecution.endTime) {
      throw new Error('已终止的节点必须有结束时间');
    }
  }

  /**
   * 验证节点状态转换的合法性
   */
  static validateNodeStateTransition(
    currentStatus: NodeStatus,
    targetStatus: NodeStatus
  ): void {
    // 验证状态转换的合法性
    const allowedTransitions: Partial<Record<NodeStatusValue, NodeStatusValue[]>> = {
      [NodeStatusValue.PENDING]: [NodeStatusValue.RUNNING, NodeStatusValue.SKIPPED],
      [NodeStatusValue.RUNNING]: [NodeStatusValue.COMPLETED, NodeStatusValue.FAILED, NodeStatusValue.CANCELLED],
      [NodeStatusValue.FAILED]: [NodeStatusValue.PENDING] // 重试
    };

    const currentStatusValue = currentStatus.getValue();
    const targetStatusValue = targetStatus.getValue();

    const allowedTargets = allowedTransitions[currentStatusValue];
    if (!allowedTargets?.includes(targetStatusValue)) {
      throw new Error(`不允许的状态转换: ${currentStatus} -> ${targetStatus}`);
    }
  }
}