/**
 * Stratum gRPC Executor Type Definitions
 *
 * Aligned with Stratum Rust side gRPC proto definitions
 */

// ── Init ──
export interface StratumInitRequest {
  dbPath?: string;
  gitRepo?: string;
  gitRef?: string;
}

export interface StratumInitResponse {
  dbPath: string;
  manualPartitionId: string;
  stagedPartitionId: string;
  branch: string;
}

// ── Edit ──
export interface StratumEditRequest {
  file: string;
  content?: string;
}

export interface StratumEditResponse {
  snapshotId: string;
  stagedSnapshotId?: string;
}

// ── Status ──
export interface StratumStatusResponse {
  partitions: StratumPartitionInfo[];
}

export interface StratumPartitionInfo {
  layer: string;
  name: string;
  currentSnapshot: string;
  historyLen: number;
}

// ── Commit ──
export interface StratumCommitRequest {
  message: string;
  author?: string;
}

export interface StratumCommitResponse {
  checkpointId: string;
  message: string;
}

// ── Log ──
export interface StratumLogRequest {
  count?: number;
}

export interface StratumLogResponse {
  checkpoints: StratumCheckpointInfo[];
  total: number;
}

export interface StratumCheckpointInfo {
  id: string;
  author: string;
  message: string;
  parents: string[];
  snapshots: string[];
  createdAt: number;
  gitAnchor?: string;
}

// ── Branch ──
export interface StratumBranchListResponse {
  branches: StratumBranchInfo[];
  current?: string;
}

export interface StratumBranchInfo {
  name: string;
  head: string;
  updatedAt: string;
  isCurrent: boolean;
}

// ── Agent ──
export interface StratumAgentEditRequest {
  agentId: string;
  file: string;
  content?: string;
}

export interface StratumAgentEditResponse {
  snapshotId: string;
}

export interface StratumAgentSubmitRequest {
  agentId: string;
}

export interface StratumAgentSubmitResponse {
  checkpointId: string;
}

export interface StratumApproveRequest {
  agentId: string;
}

export interface StratumApproveResponse {
  approved: boolean;
}

export interface StratumBackupRequest {
  targetPath: string;
}

export interface StratumBackupResponse {
  backupPath: string;
  size: number;
}
