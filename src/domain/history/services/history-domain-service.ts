import { ID } from '../../common/value-objects/id';
import { History } from '../entities/history';
import { HistoryType } from '../value-objects/history-type';
import { IWorkflowHistoryService } from './workflow-history-service';
import { ISessionHistoryService } from './session-history-service';
import { IThreadHistoryService } from './thread-history-service';
import { IExecutionHistoryService } from './execution-history-service';
import { IGeneralHistoryService } from './general-history-service';
import { IHistoryManagementService } from './history-management-service';

/**
 * 历史领域服务接口 V2
 * 
 * 这是重构后的历史领域服务接口，通过组合多个专门的服务接口
 * 来遵循接口隔离原则，同时保持向后兼容性
 */
export interface IHistoryDomainService extends
  IWorkflowHistoryService,
  ISessionHistoryService,
  IThreadHistoryService,
  IExecutionHistoryService,
  IGeneralHistoryService,
  IHistoryManagementService {
  // 这个接口现在继承所有拆分后的接口，保持完整的API
}

/**
 * 历史领域服务实现 V2
 * 
 * 组合多个专门的历史服务来实现完整的历史记录功能
 */
export class HistoryDomainService implements IHistoryDomainService {
  constructor(
    private readonly workflowHistoryService: IWorkflowHistoryService,
    private readonly sessionHistoryService: ISessionHistoryService,
    private readonly threadHistoryService: IThreadHistoryService,
    private readonly executionHistoryService: IExecutionHistoryService,
    private readonly generalHistoryService: IGeneralHistoryService,
    private readonly historyManagementService: IHistoryManagementService
  ) {}

  // Workflow历史服务方法
  async recordWorkflowCreated(
    workflowId: ID,
    details: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<History> {
    return this.workflowHistoryService.recordWorkflowCreated(workflowId, details, metadata);
  }

  async recordWorkflowUpdated(
    workflowId: ID,
    details: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<History> {
    return this.workflowHistoryService.recordWorkflowUpdated(workflowId, details, metadata);
  }

  async recordWorkflowExecuted(
    workflowId: ID,
    sessionId?: ID,
    threadId?: ID,
    details?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<History> {
    return this.workflowHistoryService.recordWorkflowExecuted(workflowId, sessionId, threadId, details, metadata);
  }

  async recordWorkflowFailed(
    workflowId: ID,
    sessionId?: ID,
    threadId?: ID,
    error?: Error,
    details?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<History> {
    return this.workflowHistoryService.recordWorkflowFailed(workflowId, sessionId, threadId, error, details, metadata);
  }

  async getWorkflowHistory(
    workflowId: ID,
    options?: {
      types?: HistoryType[];
      startTime?: Date;
      endTime?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<History[]> {
    return this.workflowHistoryService.getWorkflowHistory(workflowId, options);
  }

  // Session历史服务方法
  async recordSessionCreated(
    sessionId: ID,
    details: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<History> {
    return this.sessionHistoryService.recordSessionCreated(sessionId, details, metadata);
  }

  async recordSessionClosed(
    sessionId: ID,
    details?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<History> {
    return this.sessionHistoryService.recordSessionClosed(sessionId, details, metadata);
  }

  async getSessionHistory(
    sessionId: ID,
    options?: {
      types?: HistoryType[];
      startTime?: Date;
      endTime?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<History[]> {
    return this.sessionHistoryService.getSessionHistory(sessionId, options);
  }

  // Thread历史服务方法
  async recordThreadCreated(
    threadId: ID,
    sessionId?: ID,
    workflowId?: ID,
    details?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<History> {
    return this.threadHistoryService.recordThreadCreated(threadId, sessionId, workflowId, details, metadata);
  }

  async recordThreadStatusChanged(
    threadId: ID,
    sessionId?: ID,
    oldStatus?: string,
    newStatus?: string,
    details?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<History> {
    return this.threadHistoryService.recordThreadStatusChanged(threadId, sessionId, oldStatus, newStatus, details, metadata);
  }

  async recordThreadFailed(
    threadId: ID,
    sessionId?: ID,
    error?: Error,
    details?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<History> {
    return this.threadHistoryService.recordThreadFailed(threadId, sessionId, error, details, metadata);
  }

  async getThreadHistory(
    threadId: ID,
    options?: {
      types?: HistoryType[];
      startTime?: Date;
      endTime?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<History[]> {
    return this.threadHistoryService.getThreadHistory(threadId, options);
  }

  // Execution历史服务方法
  async recordCheckpointCreated(
    checkpointId: ID,
    threadId: ID,
    sessionId?: ID,
    details?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<History> {
    return this.executionHistoryService.recordCheckpointCreated(checkpointId, threadId, sessionId, details, metadata);
  }

  async recordCheckpointRestored(
    checkpointId: ID,
    threadId: ID,
    sessionId?: ID,
    details?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<History> {
    return this.executionHistoryService.recordCheckpointRestored(checkpointId, threadId, sessionId, details, metadata);
  }

  async recordNodeExecuted(
    nodeId: ID,
    threadId?: ID,
    sessionId?: ID,
    workflowId?: ID,
    details?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<History> {
    return this.executionHistoryService.recordNodeExecuted(nodeId, threadId, sessionId, workflowId, details, metadata);
  }

  async recordNodeFailed(
    nodeId: ID,
    threadId?: ID,
    sessionId?: ID,
    workflowId?: ID,
    error?: Error,
    details?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<History> {
    return this.executionHistoryService.recordNodeFailed(nodeId, threadId, sessionId, workflowId, error, details, metadata);
  }

  async recordToolExecuted(
    toolId: ID,
    threadId?: ID,
    sessionId?: ID,
    workflowId?: ID,
    details?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<History> {
    return this.executionHistoryService.recordToolExecuted(toolId, threadId, sessionId, workflowId, details, metadata);
  }

  async recordToolFailed(
    toolId: ID,
    threadId?: ID,
    sessionId?: ID,
    workflowId?: ID,
    error?: Error,
    details?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<History> {
    return this.executionHistoryService.recordToolFailed(toolId, threadId, sessionId, workflowId, error, details, metadata);
  }

  async recordLLMCalled(
    llmRequestId: ID,
    threadId?: ID,
    sessionId?: ID,
    workflowId?: ID,
    details?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<History> {
    return this.executionHistoryService.recordLLMCalled(llmRequestId, threadId, sessionId, workflowId, details, metadata);
  }

  async recordLLMFailed(
    llmRequestId: ID,
    threadId?: ID,
    sessionId?: ID,
    workflowId?: ID,
    error?: Error,
    details?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<History> {
    return this.executionHistoryService.recordLLMFailed(llmRequestId, threadId, sessionId, workflowId, error, details, metadata);
  }

  // General历史服务方法
  async recordStateChanged(
    entityId: ID,
    entityType: string,
    oldState?: string,
    newState?: string,
    threadId?: ID,
    sessionId?: ID,
    workflowId?: ID,
    details?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<History> {
    return this.generalHistoryService.recordStateChanged(
      entityId, entityType, oldState, newState, threadId, sessionId, workflowId, details, metadata
    );
  }

  async recordErrorOccurred(
    error: Error,
    entityId?: ID,
    entityType?: string,
    threadId?: ID,
    sessionId?: ID,
    workflowId?: ID,
    details?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<History> {
    return this.generalHistoryService.recordErrorOccurred(
      error, entityId, entityType, threadId, sessionId, workflowId, details, metadata
    );
  }

  async recordWarningOccurred(
    warning: string,
    entityId?: ID,
    entityType?: string,
    threadId?: ID,
    sessionId?: ID,
    workflowId?: ID,
    details?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<History> {
    return this.generalHistoryService.recordWarningOccurred(
      warning, entityId, entityType, threadId, sessionId, workflowId, details, metadata
    );
  }

  async recordInfoOccurred(
    info: string,
    entityId?: ID,
    entityType?: string,
    threadId?: ID,
    sessionId?: ID,
    workflowId?: ID,
    details?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<History> {
    return this.generalHistoryService.recordInfoOccurred(
      info, entityId, entityType, threadId, sessionId, workflowId, details, metadata
    );
  }

  // History管理服务方法
  async recordBatch(
    histories: Array<{
      type: HistoryType;
      details: Record<string, unknown>;
      sessionId?: ID;
      threadId?: ID;
      workflowId?: ID;
      title?: string;
      description?: string;
      metadata?: Record<string, unknown>;
    }>
  ): Promise<History[]> {
    return this.historyManagementService.recordBatch(histories);
  }

  async getStatistics(
    options?: {
      sessionId?: ID;
      threadId?: ID;
      workflowId?: ID;
      startTime?: Date;
      endTime?: Date;
    }
  ): Promise<{
    total: number;
    byType: Record<string, number>;
    byEntity: Record<string, number>;
    errorCount: number;
    warningCount: number;
    infoCount: number;
    latestAt?: Date;
    oldestAt?: Date;
  }> {
    return this.historyManagementService.getStatistics(options);
  }

  async getTrend(
    options: {
      startTime: Date;
      endTime: Date;
      interval: number;
      sessionId?: ID;
      threadId?: ID;
      workflowId?: ID;
    }
  ): Promise<Array<{
    timestamp: Date;
    count: number;
    byType: Record<string, number>;
  }>> {
    return this.historyManagementService.getTrend(options);
  }

  async cleanupExpired(retentionDays: number): Promise<number> {
    return this.historyManagementService.cleanupExpired(retentionDays);
  }

  async archiveBeforeTime(beforeTime: Date): Promise<number> {
    return this.historyManagementService.archiveBeforeTime(beforeTime);
  }

  async exportHistory(
    options: {
      format: 'json' | 'csv' | 'xml';
      sessionId?: ID;
      threadId?: ID;
      workflowId?: ID;
      startTime?: Date;
      endTime?: Date;
      types?: HistoryType[];
    }
  ): Promise<string> {
    return this.historyManagementService.exportHistory(options);
  }

  async search(
    query: string,
    options?: {
      sessionId?: ID;
      threadId?: ID;
      workflowId?: ID;
      startTime?: Date;
      endTime?: Date;
      types?: HistoryType[];
      limit?: number;
      offset?: number;
    }
  ): Promise<History[]> {
    return this.historyManagementService.search(query, options);
  }
}