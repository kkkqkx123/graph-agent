/**
 * Agent Loop 适配器
 * 封装 Agent Loop 相关的 SDK API 调用
 */

import { BaseAdapter } from './base-adapter.js';
import {
  AgentLoopFactory,
  AgentLoopCoordinator,
  AgentLoopRegistry,
  AgentLoopExecutor,
  createAgentLoopCheckpoint,
  cleanupAgentLoop,
  cloneAgentLoop,
  type AgentLoopEntityOptions,
  type AgentLoopCheckpointDependencies
} from '@modular-agent/sdk';
import type { AgentLoopConfig, AgentLoopResult, ID } from '@modular-agent/types';
import { LLMWrapper, ToolService } from '@modular-agent/sdk';

/**
 * Agent Loop 适配器
 */
export class AgentLoopAdapter extends BaseAdapter {
  private coordinator: AgentLoopCoordinator;
  private registry: AgentLoopRegistry;

  constructor() {
    super();
    // Initialize registry and coordinator
    this.registry = new AgentLoopRegistry();
    const llmWrapper = new LLMWrapper();
    const toolService = new ToolService();
    const executor = new AgentLoopExecutor(
      llmWrapper as any,
      toolService
    );
    this.coordinator = new AgentLoopCoordinator(this.registry, executor);
  }

  /**
   * 创建 Agent Loop 实例
   * @param config 循环配置
   * @param options 创建选项
   */
  async createAgentLoop(config: AgentLoopConfig, options: AgentLoopEntityOptions = {}): Promise<{ id: ID }> {
    return this.executeWithErrorHandling(async () => {
      const entity = AgentLoopFactory.create(config, options);
      this.registry.register(entity);

      this.logger.success(`Agent Loop 已创建: ${entity.id}`);
      return { id: entity.id };
    }, '创建 Agent Loop');
  }

  /**
   * 执行 Agent Loop（同步）
   * @param config 循环配置
   * @param options 执行选项
   */
  async executeAgentLoop(config: AgentLoopConfig, options: AgentLoopEntityOptions = {}): Promise<AgentLoopResult> {
    return this.executeWithErrorHandling(async () => {
      const result = await this.coordinator.execute(config, options);

      if (result.success) {
        this.logger.success(`Agent Loop 执行完成`);
      } else {
        this.logger.error(`Agent Loop 执行失败: ${result.error}`);
      }

      return result;
    }, '执行 Agent Loop');
  }

  /**
   * 流式执行 Agent Loop
   * @param config 循环配置
   * @param options 执行选项
   * @param onEvent 事件回调
   */
  async executeAgentLoopStream(
    config: AgentLoopConfig,
    options: AgentLoopEntityOptions = {},
    onEvent?: (event: any) => void
  ): Promise<AgentLoopResult> {
    return this.executeWithErrorHandling(async () => {
      let lastResult: AgentLoopResult = {
        success: false,
        iterations: 0,
        toolCallCount: 0
      };

      for await (const event of this.coordinator.executeStream(config, options)) {
        if (onEvent) {
          onEvent(event);
        }

        // Track the last complete/error event for result
        // AgentStreamEvent has enum values like 'agent_complete', 'agent_error'
        // MessageStreamEvent has type values like 'error', 'end'
        if (event.type === 'agent_complete' || event.type === 'agent_error') {
          lastResult = event.data;
        }
      }

      return lastResult;
    }, '流式执行 Agent Loop');
  }

  /**
   * 异步启动 Agent Loop
   * @param config 循环配置
   * @param options 执行选项
   */
  async startAgentLoop(config: AgentLoopConfig, options: AgentLoopEntityOptions = {}): Promise<ID> {
    return this.executeWithErrorHandling(async () => {
      const id = await this.coordinator.start(config, options);
      this.logger.success(`Agent Loop 已启动: ${id}`);
      return id;
    }, '启动 Agent Loop');
  }

  /**
   * 暂停 Agent Loop
   * @param id 实例 ID
   */
  async pauseAgentLoop(id: ID): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      await this.coordinator.pause(id);
      this.logger.success(`Agent Loop 已暂停: ${id}`);
    }, '暂停 Agent Loop');
  }

  /**
   * 恢复 Agent Loop
   * @param id 实例 ID
   */
  async resumeAgentLoop(id: ID): Promise<AgentLoopResult> {
    return this.executeWithErrorHandling(async () => {
      const result = await this.coordinator.resume(id);
      this.logger.success(`Agent Loop 已恢复: ${id}`);
      return result;
    }, '恢复 Agent Loop');
  }

  /**
   * 停止 Agent Loop
   * @param id 实例 ID
   */
  async stopAgentLoop(id: ID): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      await this.coordinator.stop(id);
      this.logger.success(`Agent Loop 已停止: ${id}`);
    }, '停止 Agent Loop');
  }

  /**
   * 获取 Agent Loop 实例
   * @param id 实例 ID
   */
  getAgentLoop(id: ID): any | undefined {
    const entity = this.coordinator.get(id);
    if (!entity) {
      return undefined;
    }

    return {
      id: entity.id,
      status: entity.getStatus(),
      currentIteration: entity.state.currentIteration,
      toolCallCount: entity.state.toolCallCount,
      variables: entity.getAllVariables(),
      messageCount: entity.getMessages().length
    };
  }

  /**
   * 获取 Agent Loop 状态
   * @param id 实例 ID
   */
  getAgentLoopStatus(id: ID): string | undefined {
    return this.coordinator.getStatus(id);
  }

  /**
   * 列出所有 Agent Loop 实例
   */
  listAgentLoops(): any[] {
    const entities = this.registry.getAll();
    return entities.map(entity => ({
      id: entity.id,
      status: entity.getStatus(),
      currentIteration: entity.state.currentIteration,
      toolCallCount: entity.state.toolCallCount
    }));
  }

  /**
   * 列出运行中的 Agent Loop
   */
  listRunningAgentLoops(): any[] {
    const entities = this.coordinator.getRunning();
    return entities.map(entity => ({
      id: entity.id,
      status: entity.getStatus(),
      currentIteration: entity.state.currentIteration,
      toolCallCount: entity.state.toolCallCount
    }));
  }

  /**
   * 列出暂停的 Agent Loop
   */
  listPausedAgentLoops(): any[] {
    const entities = this.coordinator.getPaused();
    return entities.map(entity => ({
      id: entity.id,
      status: entity.getStatus(),
      currentIteration: entity.state.currentIteration,
      toolCallCount: entity.state.toolCallCount
    }));
  }

  /**
   * 清理已完成的 Agent Loop
   */
  cleanupAgentLoops(): number {
    const count = this.coordinator.cleanup();
    this.logger.success(`已清理 ${count} 个完成的 Agent Loop`);
    return count;
  }

  /**
   * 创建 Agent Loop 检查点
   * @param id 实例 ID
   * @param dependencies 检查点依赖项
   * @param metadata 元数据
   */
  async createCheckpoint(
    id: ID,
    dependencies: AgentLoopCheckpointDependencies,
    metadata?: any
  ): Promise<string> {
    return this.executeWithErrorHandling(async () => {
      const entity = this.registry.get(id);
      if (!entity) {
        throw new Error(`Agent Loop 不存在: ${id}`);
      }

      const checkpointId = await createAgentLoopCheckpoint(entity, dependencies, { metadata });
      this.logger.success(`检查点已创建: ${checkpointId}`);
      return checkpointId;
    }, '创建检查点');
  }

  /**
   * 从检查点恢复 Agent Loop
   * @param checkpointId 检查点 ID
   * @param dependencies 检查点依赖项
   */
  async restoreFromCheckpoint(
    checkpointId: string,
    dependencies: AgentLoopCheckpointDependencies
  ): Promise<{ id: ID }> {
    return this.executeWithErrorHandling(async () => {
      const entity = await AgentLoopFactory.fromCheckpoint(checkpointId, dependencies);
      this.registry.register(entity);

      this.logger.success(`Agent Loop 已从检查点恢复: ${entity.id}`);
      return { id: entity.id };
    }, '从检查点恢复');
  }

  /**
   * 克隆 Agent Loop
   * @param id 实例 ID
   */
  cloneAgentLoop(id: ID): Promise<{ id: ID }> {
    return this.executeWithErrorHandling(async () => {
      const entity = this.registry.get(id);
      if (!entity) {
        throw new Error(`Agent Loop 不存在: ${id}`);
      }

      const cloned = cloneAgentLoop(entity);
      this.registry.register(cloned);

      this.logger.success(`Agent Loop 已克隆: ${cloned.id}`);
      return { id: cloned.id };
    }, '克隆 Agent Loop');
  }

  /**
   * 清理 Agent Loop 资源
   * @param id 实例 ID
   */
  cleanupAgentLoop(id: ID): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      const entity = this.registry.get(id);
      if (!entity) {
        throw new Error(`Agent Loop 不存在: ${id}`);
      }

      cleanupAgentLoop(entity);
      this.registry.unregister(id);

      this.logger.success(`Agent Loop 资源已清理: ${id}`);
    }, '清理 Agent Loop');
  }

  /**
   * 获取 Agent Loop 消息历史
   * @param id 实例 ID
   */
  getAgentLoopMessages(id: ID): any[] {
    const entity = this.registry.get(id);
    if (!entity) {
      throw new Error(`Agent Loop 不存在: ${id}`);
    }

    return entity.getMessages();
  }

  /**
   * 获取 Agent Loop 变量
   * @param id 实例 ID
   */
  getAgentLoopVariables(id: ID): Record<string, any> {
    const entity = this.registry.get(id);
    if (!entity) {
      throw new Error(`Agent Loop 不存在: ${id}`);
    }

    return entity.getAllVariables();
  }

  /**
   * 设置 Agent Loop 变量
   * @param id 实例 ID
   * @param name 变量名
   * @param value 变量值
   */
  setAgentLoopVariable(id: ID, name: string, value: any): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      const entity = this.registry.get(id);
      if (!entity) {
        throw new Error(`Agent Loop 不存在: ${id}`);
      }

      entity.setVariable(name, value);
      this.logger.success(`变量已设置: ${name}`);
    }, '设置变量');
  }
}
