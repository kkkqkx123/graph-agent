/**
 * Thread 检查点适配器
 * 封装 Thread (Workflow) 检查点相关的 SDK API 调用
 */

import { BaseAdapter } from './base-adapter.js';
import { CheckpointResourceAPI } from '@modular-agent/sdk';

/**
 * Thread 检查点适配器
 */
export class ThreadCheckpointAdapter extends BaseAdapter {
  private checkpointAPI: CheckpointResourceAPI;

  constructor() {
    super();
    this.checkpointAPI = new CheckpointResourceAPI();
  }

  /**
   * 创建 Thread 检查点
   * @param threadId Thread ID
   * @param name 检查点名称
   */
  async createCheckpoint(threadId: string, name?: string): Promise<any> {
    return this.executeWithErrorHandling(async () => {
      const checkpoint = {
        id: `checkpoint-${Date.now()}`,
        threadId,
        workflowId: 'default', // 默认工作流ID，实际使用时应该从Thread获取
        timestamp: Date.now(),
        metadata: {
          name: name || `Checkpoint ${new Date().toISOString()}`,
          description: '手动创建的检查点'
        }
      };

      await this.checkpointAPI.create(checkpoint);
      this.logger.success(`Thread 检查点已创建: ${checkpoint.id}`);
      return checkpoint;
    }, '创建 Thread 检查点');
  }

  /**
   * 从检查点恢复 Thread
   * @param checkpointId 检查点 ID
   */
  async loadCheckpoint(checkpointId: string): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      const result = await this.checkpointAPI.get(checkpointId);
      const checkpoint = (result as any).data || result;

      if (!checkpoint) {
        throw new Error(`Thread 检查点不存在: ${checkpointId}`);
      }

      // 恢复检查点
      await this.checkpointAPI.restoreFromCheckpoint(checkpointId);
      this.logger.success(`Thread 检查点已载入: ${checkpointId}`);
    }, '载入 Thread 检查点');
  }

  /**
   * 列出所有 Thread 检查点
   * @param filter 过滤条件
   */
  async listCheckpoints(filter?: any): Promise<any[]> {
    return this.executeWithErrorHandling(async () => {
      const result = await this.checkpointAPI.getAll();
      const checkpoints = (result as any).data || result;

      // 转换为摘要格式
      const summaries = checkpoints.map((cp: any) => ({
        id: cp.id,
        threadId: cp.threadId,
        timestamp: cp.timestamp,
        metadata: cp.metadata
      }));

      return summaries;
    }, '列出 Thread 检查点');
  }

  /**
   * 获取 Thread 检查点详情
   * @param checkpointId 检查点 ID
   */
  async getCheckpoint(checkpointId: string): Promise<any> {
    return this.executeWithErrorHandling(async () => {
      const result = await this.checkpointAPI.get(checkpointId);
      const checkpoint = (result as any).data || result;

      if (!checkpoint) {
        throw new Error(`Thread 检查点不存在: ${checkpointId}`);
      }

      return checkpoint;
    }, '获取 Thread 检查点详情');
  }

  /**
   * 删除 Thread 检查点
   * @param checkpointId 检查点 ID
   */
  async deleteCheckpoint(checkpointId: string): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      await this.checkpointAPI.delete(checkpointId);

      this.logger.success(`Thread 检查点已删除: ${checkpointId}`);
    }, '删除 Thread 检查点');
  }

  /**
   * 创建 Thread 检查点（使用 API 方法）
   * @param threadId Thread ID
   * @param metadata 检查点元数据
   */
  async createThreadCheckpoint(threadId: string, metadata?: any): Promise<string> {
    return this.executeWithErrorHandling(async () => {
      const checkpointId = await this.checkpointAPI.createThreadCheckpoint(threadId, metadata);
      this.logger.success(`Thread 检查点已创建: ${checkpointId}`);
      return checkpointId;
    }, '创建 Thread 检查点');
  }

  /**
   * 从检查点恢复 Thread（使用 API 方法）
   * @param checkpointId 检查点 ID
   */
  async restoreFromCheckpoint(checkpointId: string): Promise<string> {
    return this.executeWithErrorHandling(async () => {
      const threadId = await this.checkpointAPI.restoreFromCheckpoint(checkpointId);
      this.logger.success(`Thread 检查点已恢复: ${checkpointId}`);
      return threadId;
    }, '从检查点恢复 Thread');
  }

  /**
   * 获取 Thread 的检查点列表
   * @param threadId Thread ID
   */
  async getThreadCheckpoints(threadId: string): Promise<any[]> {
    return this.executeWithErrorHandling(async () => {
      const checkpoints = await this.checkpointAPI.getThreadCheckpoints(threadId);
      return checkpoints;
    }, '获取 Thread 检查点列表');
  }

  /**
   * 获取 Thread 的最新检查点
   * @param threadId Thread ID
   */
  async getLatestCheckpoint(threadId: string): Promise<any> {
    return this.executeWithErrorHandling(async () => {
      const checkpoint = await this.checkpointAPI.getLatestCheckpoint(threadId);
      if (!checkpoint) {
        throw new Error(`Thread 检查点不存在: ${threadId}`);
      }
      return checkpoint;
    }, '获取最新 Thread 检查点');
  }

  /**
   * 获取检查点统计信息
   */
  async getStatistics(): Promise<any> {
    return this.executeWithErrorHandling(async () => {
      const stats = await this.checkpointAPI.getCheckpointStatistics();
      return stats;
    }, '获取 Thread 检查点统计信息');
  }
}