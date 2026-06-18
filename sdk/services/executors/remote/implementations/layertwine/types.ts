/**
 * Layertwine gRPC Executor Type Definitions
 *
 * Aligned with Layertwine Rust side gRPC proto definitions
 */

// ── Init ──
export interface LayertwineInitRequest {
  dbPath?: string;
  gitRepo?: string;
  gitRef?: string;
}

export interface LayertwineInitResponse {
  dbPath: string;
  manualPartitionId: string;
  stagedPartitionId: string;
  branch: string;
}

// ── Edit ──
export interface LayertwineEditRequest {
  file: string;
  content?: string;
}

export interface LayertwineEditResponse {
  snapshotId: string;
  stagedSnapshotId?: string;
}

// ── Status ──
export interface LayertwineStatusResponse {
  partitions: LayertwinePartitionInfo[];
}

export interface LayertwinePartitionInfo {
  layer: string;
  name: string;
  currentSnapshot: string;
  historyLen: number;
}

// ── Commit ──
export interface LayertwineCommitRequest {
  message: string;
  author?: string;
}

export interface LayertwineCommitResponse {
  checkpointId: string;
  message: string;
}

// ── Log ──
export interface LayertwineLogRequest {
  count?: number;
}

export interface LayertwineLogResponse {
  checkpoints: LayertwineCheckpointInfo[];
  total: number;
}

export interface LayertwineCheckpointInfo {
  id: string;
  author: string;
  message: string;
  parents: string[];
  snapshots: string[];
  createdAt: number;
  gitAnchor?: string;
}

// ── Branch ──
export interface LayertwineBranchListResponse {
  branches: LayertwineBranchInfo[];
  current?: string;
}

export interface LayertwineBranchInfo {
  name: string;
  head: string;
  updatedAt: string;
  isCurrent: boolean;
}

// ── Agent ──
export interface LayertwineAgentEditRequest {
  agentId: string;
  file: string;
  content?: string;
}

export interface LayertwineAgentEditResponse {
  snapshotId: string;
}

export interface LayertwineAgentSubmitRequest {
  agentId: string;
}

export interface LayertwineAgentSubmitResponse {
  checkpointId: string;
}

export interface LayertwineApproveRequest {
  agentId: string;
}

export interface LayertwineApproveResponse {
  approved: boolean;
}

export interface LayertwineBackupRequest {
  targetPath: string;
}

export interface LayertwineBackupResponse {
  backupPath: string;
  size: number;
}
