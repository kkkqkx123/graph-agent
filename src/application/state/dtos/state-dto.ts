/**
 * State模块DTO定义
 * 简化后的DTO实现，使用简单接口和映射函数
 */

// ==================== DTO接口定义 ====================

/**
 * 工作流状态DTO
 */
export interface WorkflowStateDTO {
  workflowId: string;
  threadId: string;
  data: Record<string, unknown>;
  metadata: Record<string, unknown>;
  version: string;
  timestamp: string;
}

/**
 * 状态历史条目DTO
 */
export interface StateHistoryEntryDTO {
  entryId: string;
  workflowId: string;
  threadId: string;
  stateData: Record<string, unknown>;
  timestamp: string;
  changeType: string;
}

/**
 * 检查点DTO
 */
export interface CheckpointDTO {
  checkpointId: string;
  workflowId: string;
  threadId: string;
  stateData: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdAt: string;
  isRestorable: boolean;
}

/**
 * 检查点创建DTO
 */
export interface CheckpointCreateDTO {
  workflowId: string;
  threadId: string;
  stateData: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * 快照DTO
 */
export interface SnapshotDTO {
  id: string;
  scope: string;
  targetId?: string;
  type: string;
  stateData: Record<string, unknown>;
  createdAt: string;
  restoreCount: number;
  canRestore: boolean;
}

/**
 * 快照创建DTO
 */
export interface SnapshotCreateDTO {
  scope: string;
  targetId?: string;
  type: string;
  stateData: Record<string, unknown>;
}

/**
 * 状态恢复DTO
 */
export interface StateRecoveryDTO {
  recoveryId: string;
  sourceId: string;
  targetId: string;
  recoveredState: Record<string, unknown>;
  recoveredAt: string;
  success: boolean;
}

/**
 * 状态统计DTO
 */
export interface StateStatisticsDTO {
  totalStates: number;
  activeStates: number;
  archivedStates: number;
  totalCheckpoints: number;
  totalSnapshots: number;
  totalRecoveries: number;
  successfulRecoveries: number;
  failedRecoveries: number;
  averageRecoveryTime: number;
}

/**
 * 状态变更DTO
 */
export interface StateChangeDTO {
  changeId: string;
  workflowId: string;
  threadId: string;
  previousState: Record<string, unknown>;
  newState: Record<string, unknown>;
  changeType: string;
  timestamp: string;
  userId?: string;
}

// ==================== 映射函数 ====================

/**
 * 将工作流状态领域对象转换为WorkflowStateDTO
 */
export const mapWorkflowStateToDTO = (state: any): WorkflowStateDTO => {
  return {
    workflowId: state.workflowId?.toString() || '',
    threadId: state.threadId || '',
    data: state.data || {},
    metadata: state.metadata || {},
    version: state.version?.toString() || '1.0.0',
    timestamp: state.timestamp?.toISOString() || new Date().toISOString()
  };
};

/**
 * 批量将工作流状态领域对象转换为WorkflowStateDTO
 */
export const mapWorkflowStatesToDTOs = (states: any[]): WorkflowStateDTO[] => {
  return states.map(mapWorkflowStateToDTO);
};

/**
 * 将检查点领域对象转换为CheckpointDTO
 */
export const mapCheckpointToDTO = (checkpoint: any): CheckpointDTO => {
  return {
    checkpointId: checkpoint.id?.toString() || '',
    workflowId: checkpoint.workflowId?.toString() || '',
    threadId: checkpoint.threadId || '',
    stateData: checkpoint.stateData || {},
    metadata: checkpoint.metadata || {},
    createdAt: checkpoint.createdAt?.toISOString() || new Date().toISOString(),
    isRestorable: checkpoint.canRestore?.() || checkpoint.canRestore || false
  };
};

/**
 * 批量将检查点领域对象转换为CheckpointDTO
 */
export const mapCheckpointsToDTOs = (checkpoints: any[]): CheckpointDTO[] => {
  return checkpoints.map(mapCheckpointToDTO);
};

/**
 * 将快照领域对象转换为SnapshotDTO
 */
export const mapSnapshotToDTO = (snapshot: any): SnapshotDTO => {
  return {
    id: snapshot.id?.toString() || '',
    scope: snapshot.scope?.getValue() || snapshot.scope || '',
    targetId: snapshot.targetId?.toString(),
    type: snapshot.type?.value || snapshot.type || '',
    stateData: snapshot.stateData || {},
    createdAt: snapshot.createdAt?.toISOString() || new Date().toISOString(),
    restoreCount: snapshot.restoreCount || 0,
    canRestore: snapshot.canRestore?.() || snapshot.canRestore || false
  };
};

/**
 * 批量将快照领域对象转换为SnapshotDTO
 */
export const mapSnapshotsToDTOs = (snapshots: any[]): SnapshotDTO[] => {
  return snapshots.map(mapSnapshotToDTO);
};

/**
 * 将状态历史条目领域对象转换为StateHistoryEntryDTO
 */
export const mapStateHistoryEntryToDTO = (entry: any): StateHistoryEntryDTO => {
  return {
    entryId: entry.id?.toString() || '',
    workflowId: entry.workflowId?.toString() || '',
    threadId: entry.threadId || '',
    stateData: entry.stateData || {},
    timestamp: entry.timestamp?.toISOString() || new Date().toISOString(),
    changeType: entry.changeType || 'update'
  };
};

/**
 * 批量将状态历史条目领域对象转换为StateHistoryEntryDTO
 */
export const mapStateHistoryEntriesToDTOs = (entries: any[]): StateHistoryEntryDTO[] => {
  return entries.map(mapStateHistoryEntryToDTO);
};