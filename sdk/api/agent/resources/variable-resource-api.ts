/**
 * AgentLoopVariableResourceAPI - Agent Loop 变量资源管理API
 * 继承GenericResourceAPI，提供统一的CRUD操作
 *
 * 职责：
 * - 封装 VariableStateManager，提供变量状态管理功能
 * - 支持变量查询、搜索、统计等功能
 */

import { GenericResourceAPI } from '../../shared/resources/generic-resource-api.js';
import type { ID } from '@modular-agent/types';
import { getErrorMessage, isSuccess, getData } from '../../shared/types/execution-result.js';
import type { AgentLoopRegistry } from '../../../agent/services/agent-loop-registry.js';
import { getContainer } from '../../../core/di/index.js';
import * as Identifiers from '../../../core/di/service-identifiers.js';

/**
 * 变量过滤器
 */
export interface AgentLoopVariableFilter {
  /** Agent Loop ID */
  agentLoopId?: ID;
  /** 变量名前缀 */
  namePrefix?: string;
}

/**
 * 变量定义信息
 */
export interface VariableDefinition {
  /** 变量名称 */
  name: string;
  /** 变量类型 */
  type: string;
  /** 变量值 */
  value: any;
}

/**
 * AgentLoopVariableResourceAPI - Agent Loop 变量资源管理API
 */
export class AgentLoopVariableResourceAPI extends GenericResourceAPI<any, string, AgentLoopVariableFilter> {
  private registry: AgentLoopRegistry;

  constructor() {
    super();
    const container = getContainer();
    this.registry = container.get(Identifiers.AgentLoopRegistry);
  }

  // ============================================================================
  // 实现抽象方法
  // ============================================================================

  /**
   * 获取单个变量值
   * @param id 变量ID（格式：agentLoopId:variableName）
   * @returns 变量值，如果不存在则返回null
   */
  protected async getResource(id: string): Promise<any | null> {
    const [agentLoopId, variableName] = id.split(':');
    if (!agentLoopId || !variableName) {
      return null;
    }

    const entity = this.registry.get(agentLoopId);
    if (!entity) {
      return null;
    }

    const value = entity.getVariable(variableName);
    return value !== undefined ? value : null;
  }

  /**
   * 获取所有变量值
   * @returns 变量值数组
   */
  protected async getAllResources(): Promise<any[]> {
    // 变量不适合返回数组，这里返回空数组，使用特定方法获取变量
    return [];
  }

  /**
   * 创建变量（变量由执行引擎创建，此方法抛出错误）
   */
  protected async createResource(resource: any): Promise<void> {
    throw new Error('变量不能通过API直接创建，请使用执行引擎');
  }

  /**
   * 更新变量（变量由执行引擎更新，此方法抛出错误）
   */
  protected async updateResource(id: string, updates: Partial<any>): Promise<void> {
    throw new Error('变量不能通过API直接更新，请使用执行引擎');
  }

  /**
   * 删除变量（变量由执行引擎删除，此方法抛出错误）
   */
  protected async deleteResource(id: string): Promise<void> {
    throw new Error('变量不能通过API直接删除，请使用执行引擎');
  }

  /**
   * 应用过滤条件
   */
  protected applyFilter(variables: any[], filter: AgentLoopVariableFilter): any[] {
    // 变量不适合通用过滤，使用特定方法
    return variables;
  }

  // ============================================================================
  // 变量特定方法
  // ============================================================================

  /**
   * 获取 Agent Loop 的所有变量
   * @param agentLoopId Agent Loop ID
   * @returns 变量记录
   */
  async getAgentLoopVariables(agentLoopId: ID): Promise<Record<string, any>> {
    const entity = this.registry.get(agentLoopId);
    if (!entity) {
      return {};
    }

    return entity.getAllVariables();
  }

  /**
   * 获取 Agent Loop 的指定变量
   * @param agentLoopId Agent Loop ID
   * @param name 变量名称
   * @returns 变量值
   */
  async getAgentLoopVariable(agentLoopId: ID, name: string): Promise<any> {
    const entity = this.registry.get(agentLoopId);
    if (!entity) {
      throw new Error(`Agent Loop not found: ${agentLoopId}`);
    }

    const value = entity.getVariable(name);
    if (value === undefined) {
      throw new Error(`Variable not found: ${name}`);
    }

    return value;
  }

  /**
   * 检查 Agent Loop 的指定变量是否存在
   * @param agentLoopId Agent Loop ID
   * @param name 变量名称
   * @returns 是否存在
   */
  async hasAgentLoopVariable(agentLoopId: ID, name: string): Promise<boolean> {
    const entity = this.registry.get(agentLoopId);
    if (!entity) {
      return false;
    }

    const value = entity.getVariable(name);
    return value !== undefined;
  }

  /**
   * 获取变量定义列表
   * @param agentLoopId Agent Loop ID
   * @returns 变量定义数组
   */
  async getVariableDefinitions(agentLoopId: ID): Promise<VariableDefinition[]> {
    const entity = this.registry.get(agentLoopId);
    if (!entity) {
      return [];
    }

    const variables = entity.getAllVariables();
    const definitions: VariableDefinition[] = [];

    for (const [name, value] of Object.entries(variables)) {
      definitions.push({
        name,
        type: typeof value,
        value
      });
    }

    return definitions;
  }

  /**
   * 获取所有 Agent Loop 的变量统计
   * @returns 统计信息
   */
  async getVariableStatistics(): Promise<{
    totalAgentLoops: number;
    totalVariables: number;
    byAgentLoop: Record<string, number>;
    byType: Record<string, number>;
  }> {
    const entities = this.registry.getAll();
    const stats = {
      totalAgentLoops: entities.length,
      totalVariables: 0,
      byAgentLoop: {} as Record<string, number>,
      byType: {} as Record<string, number>
    };

    for (const entity of entities) {
      const agentLoopId = entity.id;
      const variables = entity.getAllVariables();

      stats.byAgentLoop[agentLoopId] = Object.keys(variables).length;
      stats.totalVariables += Object.keys(variables).length;

      // 统计变量类型
      for (const [, value] of Object.entries(variables)) {
        const type = typeof value;
        stats.byType[type] = (stats.byType[type] || 0) + 1;
      }
    }

    return stats;
  }

  /**
   * 搜索变量
   * @param agentLoopId Agent Loop ID
   * @param query 搜索关键词
   * @returns 匹配的变量名称数组
   */
  async searchVariables(agentLoopId: ID, query: string): Promise<string[]> {
    const entity = this.registry.get(agentLoopId);
    if (!entity) {
      return [];
    }

    const variables = entity.getAllVariables();
    return Object.keys(variables).filter(name =>
      name.toLowerCase().includes(query.toLowerCase())
    );
  }

  /**
   * 导出 Agent Loop 变量
   * @param agentLoopId Agent Loop ID
   * @returns JSON字符串
   */
  async exportAgentLoopVariables(agentLoopId: ID): Promise<string> {
    const variables = await this.getAgentLoopVariables(agentLoopId);
    return JSON.stringify(variables, null, 2);
  }

  /**
   * 获取变量数量
   * @param agentLoopId Agent Loop ID
   * @returns 变量数量
   */
  async getVariableCount(agentLoopId: ID): Promise<number> {
    const entity = this.registry.get(agentLoopId);
    if (!entity) {
      return 0;
    }

    return Object.keys(entity.getAllVariables()).length;
  }

  /**
   * 获取底层 AgentLoopRegistry 实例
   * @returns AgentLoopRegistry 实例
   */
  getRegistry(): AgentLoopRegistry {
    return this.registry;
  }
}
