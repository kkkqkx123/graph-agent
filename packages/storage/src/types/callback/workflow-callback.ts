/**
 * 工作流存储回调接口定义
 * 定义工作流持久化操作的统一接口
 */

import type {
  WorkflowStorageMetadata,
  WorkflowListOptions,
  WorkflowVersionInfo,
  WorkflowVersionListOptions
} from '@modular-agent/types';
import type { BaseStorageCallback } from './base-storage-callback.js';

/**
 * 工作流存储回调接口
 *
 * 定义工作流持久化操作的统一接口
 * - 继承自 BaseStorageCallback，提供标准 CRUD 操作
 * - packages/storage 提供了基于此接口的 WorkflowStorageAdapter 实现
 * - 应用层可以直接使用 WorkflowStorageAdapter，或自行实现此接口
 */
export interface WorkflowStorageCallback
  extends BaseStorageCallback<WorkflowStorageMetadata, WorkflowListOptions> {
  /**
   * 更新工作流元数据
   * @param workflowId 工作流唯一标识
   * @param metadata 部分元数据更新
   */
  updateWorkflowMetadata(
    workflowId: string,
    metadata: Partial<WorkflowStorageMetadata>
  ): Promise<void>;

  /**
   * 保存工作流版本
   * @param workflowId 工作流唯一标识
   * @param version 版本号
   * @param data 序列化后的工作流数据
   * @param changeNote 变更说明
   */
  saveWorkflowVersion(
    workflowId: string,
    version: string,
    data: Uint8Array,
    changeNote?: string
  ): Promise<void>;

  /**
   * 列出工作流版本
   * @param workflowId 工作流唯一标识
   * @param options 查询选项
   * @returns 版本信息列表
   */
  listWorkflowVersions(
    workflowId: string,
    options?: WorkflowVersionListOptions
  ): Promise<WorkflowVersionInfo[]>;

  /**
   * 加载工作流指定版本
   * @param workflowId 工作流唯一标识
   * @param version 版本号
   * @returns 工作流数据，如果不存在返回 null
   */
  loadWorkflowVersion(workflowId: string, version: string): Promise<Uint8Array | null>;

  /**
   * 删除工作流版本
   * @param workflowId 工作流唯一标识
   * @param version 版本号
   */
  deleteWorkflowVersion(workflowId: string, version: string): Promise<void>;
}
