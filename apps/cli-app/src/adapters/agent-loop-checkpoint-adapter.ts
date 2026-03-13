/**
 * Agent Loop 检查点适配器
 * 封装 Agent Loop 检查点相关的 SDK API 调用
 */

import { BaseAdapter } from './base-adapter.js';
import {
  createCheckpoint,
  restoreFromCheckpoint,
  type CheckpointDependencies,
  type CreateCheckpointOptions
} from '@modular-agent/sdk';
import { AgentLoopCheckpointResourceAPI } from '@modular-agent/sdk';
import type { AgentLoopEntity } from '@modular-agent/sdk';
import { CLINotFoundError } from '../types/cli-types.js';

/**
 * Agent Loop 检查点适配器
 */
export class AgentLoopCheckpointAdapter extends BaseAdapter {
  private checkpointAPI: AgentLoopCheckpointResourceAPI;

  constructor() {
    super();
    this.checkpointAPI = new AgentLoopCheckpointResourceAPI();
  }

  /**
   * 创建 Agent Loop 检查点
   * @param entity Agent Loop 实体
   * @param dependencies 检查点依赖项
   * @param options 创建选项
   */
  async createCheckpoint(
    entity: AgentLoopEntity,
    dependencies: CheckpointDependencies,
    options?: CreateCheckpointOptions
  ): Promise<string> {
    return this.executeWithErrorHandling(async () => {
      const checkpointId = await createCheckpoint(entity, dependencies, options);
      this.logger.success(`Agent Loop 检查点已创建: ${checkpointId}`);
      return checkpointId;
    }, '创建 Agent Loop 检查点');
  }

  /**
   * 从检查点恢复 Agent Loop
   * @param checkpointId 检查点 ID
   * @param dependencies 检查点依赖项
   */
  async restoreCheckpoint(
    checkpointId: string,
    dependencies: CheckpointDependencies
  ): Promise<AgentLoopEntity> {
    return this.executeWithErrorHandling(async () => {
      const entity = await restoreFromCheckpoint(checkpointId, dependencies);
      this.logger.success(`Agent Loop 检查点已恢复: ${checkpointId}`);
      return entity;
    }, '从检查点恢复 Agent Loop');
  }

  /**
   * 获取 Agent Loop 的所有检查点
   * @param agentLoopId Agent Loop ID
   */
  async listCheckpoints(agentLoopId: string): Promise<any[]> {
    return this.executeWithErrorHandling(async () => {
      const checkpoints = await this.checkpointAPI.getAgentLoopCheckpoints(agentLoopId);

      // 转换为摘要格式
      const summaries = checkpoints.map(cp => ({
        id: cp.id,
        agentLoopId: cp.agentLoopId,
        timestamp: cp.timestamp,
        type: cp.type,
        metadata: cp.metadata
      }));

      return summaries;
    }, '列出 Agent Loop 检查点');
  }

  /**
   * 获取检查点详情
   * @param checkpointId 检查点 ID
   */
  async getCheckpoint(checkpointId: string): Promise<any> {
    return this.executeWithErrorHandling(async () => {
      const checkpoint = await this.checkpointAPI.get(checkpointId);
      if (!checkpoint) {
        throw new CLINotFoundError(`Agent Loop 检查点不存在: ${checkpointId}`, 'AgentLoopCheckpoint', checkpointId);
      }

      return checkpoint;
    }, '获取 Agent Loop 检查点详情');
  }

  /**
   * 删除检查点
   * @param checkpointId 检查点 ID
   */
  async deleteCheckpoint(checkpointId: string): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      await this.checkpointAPI.delete(checkpointId);
      this.logger.success(`Agent Loop 检查点已删除: ${checkpointId}`);
    }, '删除 Agent Loop 检查点');
  }

  /**
   * 获取最新的检查点
   * @param agentLoopId Agent Loop ID
   */
  async getLatestCheckpoint(agentLoopId: string): Promise<any> {
    return this.executeWithErrorHandling(async () => {
      const checkpoint = await this.checkpointAPI.getLatestCheckpoint(agentLoopId);
      if (!checkpoint) {
        throw new CLINotFoundError(`Agent Loop 检查点不存在: ${agentLoopId}`, 'AgentLoopCheckpoint', agentLoopId);
      }

      return checkpoint;
    }, '获取最新 Agent Loop 检查点');
  }

  /**
   * 获取检查点链
   * @param checkpointId 检查点 ID
   */
  async getCheckpointChain(checkpointId: string): Promise<any[]> {
    return this.executeWithErrorHandling(async () => {
      const chain = await this.checkpointAPI.getCheckpointChain(checkpointId);
      return chain;
    }, '获取 Agent Loop 检查点链');
  }

  /**
   * 获取检查点统计信息
   */
  async getStatistics(): Promise<any> {
    return this.executeWithErrorHandling(async () => {
      const stats = await this.checkpointAPI.getCheckpointStatistics();
      return stats;
    }, '获取 Agent Loop 检查点统计信息');
  }

  /**
   * 删除 Agent Loop 的所有检查点
   * @param agentLoopId Agent Loop ID
   */
  async deleteAllCheckpoints(agentLoopId: string): Promise<number> {
    return this.executeWithErrorHandling(async () => {
      const count = await this.checkpointAPI.deleteAgentLoopCheckpoints(agentLoopId);
      this.logger.success(`已删除 ${count} 个 Agent Loop 检查点`);
      return count;
    }, '删除所有 Agent Loop 检查点');
  }
}