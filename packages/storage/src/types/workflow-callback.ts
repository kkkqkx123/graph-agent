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

/**
 * 工作流存储回调接口
 *
 * 定义工作流持久化操作的统一接口
 * - packages/storage 提供了基于此接口的 WorkflowStorageAdapter 实现
 * - 应用层可以直接使用 WorkflowStorageAdapter，或自行实现此接口
 */
export interface WorkflowStorageCallback {
  // ==================== 生命周期管理 ====================

  /**
   * 初始化存储
   * 创建必要的资源（目录、数据库连接等）
   */
  initialize(): Promise<void>;

  /**
   * 关闭存储连接
   * 释放资源并清理状态
   */
  close(): Promise<void>;

  /**
   * 清空所有工作流
   */
  clear(): Promise<void>;

  // ==================== 数据操作 ====================

  /**
   * 保存工作流
   * @param workflowId 工作流唯一标识
   * @param data 序列化后的工作流数据（字节数组）
   * @param metadata 工作流元数据（用于索引和查询）
   */
  saveWorkflow(
    workflowId: string,
    data: Uint8Array,
    metadata: WorkflowStorageMetadata
  ): Promise<void>;

  /**
   * 加载工作流数据
   * @param workflowId 工作流唯一标识
   * @returns 工作流数据（字节数组），如果不存在返回null
   */
  loadWorkflow(workflowId: string): Promise<Uint8Array | null>;

  /**
   * 删除工作流
   * @param workflowId 工作流唯一标识
   */
  deleteWorkflow(workflowId: string): Promise<void>;

  /**
   * 列出工作流ID
   * @param options 查询选项（支持多维度过滤和分页）
   * @returns 工作流ID数组
   */
  listWorkflows(options?: WorkflowListOptions): Promise<string[]>;

  /**
   * 检查工作流是否存在
   * @param workflowId 工作流唯一标识
   * @returns 是否存在
   */
  workflowExists(workflowId: string): Promise<boolean>;

  /**
   * 获取工作流元数据
   * @param workflowId 工作流唯一标识
   * @returns 工作流元数据，如果不存在返回null
   */
  getWorkflowMetadata(workflowId: string): Promise<WorkflowStorageMetadata | null>;

  /**
   * 更新工作流元数据
   * @param workflowId 工作流唯一标识
   * @param metadata 部分元数据更新
   */
  updateWorkflowMetadata(
    workflowId: string,
    metadata: Partial<WorkflowStorageMetadata>
  ): Promise<void>;

  // ==================== 版本管理 ====================

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
   * @returns 工作流数据，如果不存在返回null
   */
  loadWorkflowVersion(workflowId: string, version: string): Promise<Uint8Array | null>;

  /**
   * 删除工作流版本
   * @param workflowId 工作流唯一标识
   * @param version 版本号
   */
  deleteWorkflowVersion(workflowId: string, version: string): Promise<void>;
}
