/**
 * 存储元数据类型定义
 * 扩展基础元数据，添加特定实体的元数据字段
 */

import type { StorageMetadata } from './storage-provider.js';

/**
 * 检查点存储元数据
 * 扩展基础元数据，添加检查点特有字段
 */
export interface CheckpointStorageMetadataExt extends StorageMetadata {
  modelType: 'checkpoint';
  parentId: string;  // threadId
  workflowId: string;
  timestamp: number;
}

/**
 * 线程存储元数据
 * 扩展基础元数据，添加线程特有字段
 */
export interface ThreadStorageMetadataExt extends StorageMetadata {
  modelType: 'thread';
  workflowId: string;
  status: string;
  startTime: number;
  endTime?: number;
}

/**
 * 线程列表查询选项
 */
export interface ThreadListOptions {
  /** 按工作流ID过滤 */
  workflowId?: string;
  /** 按状态过滤 */
  status?: string;
  /** 最大返回数量 */
  limit?: number;
  /** 偏移量 */
  offset?: number;
}

/**
 * 线程信息（包含ID和元数据）
 */
export interface ThreadInfo {
  /** 线程ID */
  threadId: string;
  /** 线程元数据 */
  metadata: ThreadStorageMetadataExt;
}
