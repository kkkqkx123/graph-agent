import { ID } from '../../common/value-objects/id';
import { History } from '../entities/history';
import { HistoryType } from '../value-objects/history-type';

/**
 * 执行历史服务接口
 * 
 * 职责：专门处理执行相关的历史记录（节点、工具、LLM等）
 */
export interface IExecutionHistoryService {
  /**
   * 记录检查点创建历史
   * @param checkpointId 检查点ID
   * @param threadId 线程ID
   * @param sessionId 会话ID
   * @param details 详细信息
   * @param metadata 元数据
   * @returns 历史记录
   */
  recordCheckpointCreated(
    checkpointId: ID,
    threadId: ID,
    sessionId?: ID,
    details?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<History>;

  /**
   * 记录检查点恢复历史
   * @param checkpointId 检查点ID
   * @param threadId 线程ID
   * @param sessionId 会话ID
   * @param details 详细信息
   * @param metadata 元数据
   * @returns 历史记录
   */
  recordCheckpointRestored(
    checkpointId: ID,
    threadId: ID,
    sessionId?: ID,
    details?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<History>;

  /**
   * 记录节点执行历史
   * @param nodeId 节点ID
   * @param threadId 线程ID
   * @param sessionId 会话ID
   * @param workflowId 工作流ID
   * @param details 详细信息
   * @param metadata 元数据
   * @returns 历史记录
   */
  recordNodeExecuted(
    nodeId: ID,
    threadId?: ID,
    sessionId?: ID,
    workflowId?: ID,
    details?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<History>;

  /**
   * 记录节点失败历史
   * @param nodeId 节点ID
   * @param threadId 线程ID
   * @param sessionId 会话ID
   * @param workflowId 工作流ID
   * @param error 错误信息
   * @param details 详细信息
   * @param metadata 元数据
   * @returns 历史记录
   */
  recordNodeFailed(
    nodeId: ID,
    threadId?: ID,
    sessionId?: ID,
    workflowId?: ID,
    error?: Error,
    details?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<History>;

  /**
   * 记录工具执行历史
   * @param toolId 工具ID
   * @param threadId 线程ID
   * @param sessionId 会话ID
   * @param workflowId 工作流ID
   * @param details 详细信息
   * @param metadata 元数据
   * @returns 历史记录
   */
  recordToolExecuted(
    toolId: ID,
    threadId?: ID,
    sessionId?: ID,
    workflowId?: ID,
    details?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<History>;

  /**
   * 记录工具失败历史
   * @param toolId 工具ID
   * @param threadId 线程ID
   * @param sessionId 会话ID
   * @param workflowId 工作流ID
   * @param error 错误信息
   * @param details 详细信息
   * @param metadata 元数据
   * @returns 历史记录
   */
  recordToolFailed(
    toolId: ID,
    threadId?: ID,
    sessionId?: ID,
    workflowId?: ID,
    error?: Error,
    details?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<History>;

  /**
   * 记录LLM调用历史
   * @param llmRequestId LLM请求ID
   * @param threadId 线程ID
   * @param sessionId 会话ID
   * @param workflowId 工作流ID
   * @param details 详细信息
   * @param metadata 元数据
   * @returns 历史记录
   */
  recordLLMCalled(
    llmRequestId: ID,
    threadId?: ID,
    sessionId?: ID,
    workflowId?: ID,
    details?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<History>;

  /**
   * 记录LLM失败历史
   * @param llmRequestId LLM请求ID
   * @param threadId 线程ID
   * @param sessionId 会话ID
   * @param workflowId 工作流ID
   * @param error 错误信息
   * @param details 详细信息
   * @param metadata 元数据
   * @returns 历史记录
   */
  recordLLMFailed(
    llmRequestId: ID,
    threadId?: ID,
    sessionId?: ID,
    workflowId?: ID,
    error?: Error,
    details?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<History>;
}