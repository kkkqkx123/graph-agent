import { NodeId } from '../node/node-id';
import { Timestamp } from '../../../common/value-objects/timestamp';

/**
 * 执行历史记录接口
 */
export interface ExecutionHistory {
  /** 节点ID */
  readonly nodeId: NodeId;
  /** 时间戳 */
  readonly timestamp: Timestamp;
  /** 执行结果 */
  readonly result?: any;
  /** 执行状态 */
  readonly status: 'success' | 'failure' | 'pending' | 'running';
  /** 元数据 */
  readonly metadata?: Record<string, any>;
}

/**
 * 创建执行历史记录
 * @param nodeId 节点ID
 * @param status 执行状态
 * @param result 执行结果
 * @param metadata 元数据
 * @returns 执行历史记录
 */
export function createExecutionHistory(
  nodeId: NodeId,
  status: ExecutionHistory['status'],
  result?: any,
  metadata?: Record<string, any>
): ExecutionHistory {
  return {
    nodeId,
    timestamp: Timestamp.now(),
    status,
    result,
    metadata,
  };
}