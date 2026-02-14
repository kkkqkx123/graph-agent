/**
 * 检查点适配器
 * 封装检查点相关的 SDK API 调用
 */

import { BaseAdapter } from './base-adapter';

/**
 * 检查点适配器
 */
export class CheckpointAdapter extends BaseAdapter {
  /**
   * 创建检查点
   */
  async createCheckpoint(threadId: string, name?: string): Promise<any> {
    return this.executeWithErrorHandling(async () => {
      const api = (this.sdk as any).checkpoints;

      // 创建检查点
      const checkpoint = {
        id: `checkpoint-${Date.now()}`,
        threadId,
        timestamp: new Date().toISOString(),
        metadata: {
          name: name || `Checkpoint ${new Date().toISOString()}`,
          description: '手动创建的检查点'
        }
      };

      await api.create(checkpoint);
      this.logger.success(`检查点已创建: ${checkpoint.id}`);
      return checkpoint;
    }, '创建检查点');
  }

  /**
   * 载入检查点
   */
  async loadCheckpoint(checkpointId: string): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      const api = (this.sdk as any).checkpoints;
      const result = await api.get(checkpointId);
      const checkpoint = (result as any).data || result;

      if (!checkpoint) {
        throw new Error(`检查点不存在: ${checkpointId}`);
      }

      // 恢复检查点
      await api.restoreFromCheckpoint(checkpointId);
      this.logger.success(`检查点已载入: ${checkpointId}`);
    }, '载入检查点');
  }

  /**
   * 列出所有检查点
   */
  async listCheckpoints(filter?: any): Promise<any[]> {
    return this.executeWithErrorHandling(async () => {
      const api = (this.sdk as any).checkpoints;
      const result = await api.getAll();
      const checkpoints = (result as any).data || result;

      // 转换为摘要格式
      const summaries = (checkpoints as any[]).map((cp: any) => ({
        id: cp.id,
        threadId: cp.threadId,
        timestamp: cp.timestamp,
        metadata: cp.metadata
      }));

      return summaries;
    }, '列出检查点');
  }

  /**
   * 获取检查点详情
   */
  async getCheckpoint(checkpointId: string): Promise<any> {
    return this.executeWithErrorHandling(async () => {
      const api = (this.sdk as any).checkpoints;
      const result = await api.get(checkpointId);
      const checkpoint = (result as any).data || result;

      if (!checkpoint) {
        throw new Error(`检查点不存在: ${checkpointId}`);
      }

      return checkpoint;
    }, '获取检查点详情');
  }

  /**
   * 删除检查点
   */
  async deleteCheckpoint(checkpointId: string): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      const api = (this.sdk as any).checkpoints;
      await api.delete(checkpointId);

      this.logger.success(`检查点已删除: ${checkpointId}`);
    }, '删除检查点');
  }
}