/**
 * HumanRelayResourceAPI - Human Relay资源管理API
 * 提供Human Relay相关的资源管理功能
 *
 * 职责：
 * - 管理Human Relay处理器的注册和获取
 * - 提供Human Relay事件订阅功能
 * - 封装Human Relay的处理逻辑
 *
 * 设计原则：
 * - 遵循GenericResourceAPI的统一接口模式
 * - 提供清晰的事件订阅接口
 * - 支持处理器的动态注册和替换
 */

import { GenericResourceAPI } from '../generic-resource-api';
import type { ExecutionResult } from '../../types/execution-result';
import { success, failure } from '../../types/execution-result';
import type { HumanRelayHandler, HumanRelayRequest, HumanRelayResponse } from '../../../types/human-relay';
import type { EventManager } from '../../../core/services/event-manager';
import { EventType } from '../../../types/events';
import type {
  HumanRelayRequestedEvent,
  HumanRelayRespondedEvent,
  HumanRelayProcessedEvent,
  HumanRelayFailedEvent
} from '../../../types/events';
import { SingletonRegistry } from '../../../core/execution/context/singleton-registry';

/**
 * Human Relay配置
 */
export interface HumanRelayConfig {
  /** 配置ID */
  id: string;
  /** 配置名称 */
  name: string;
  /** 配置描述 */
  description?: string;
  /** 默认超时时间（毫秒） */
  defaultTimeout?: number;
  /** 是否启用 */
  enabled?: boolean;
  /** 元数据 */
  metadata?: Record<string, any>;
}

/**
 * Human Relay过滤器
 */
export interface HumanRelayFilter {
  /** 配置名称 */
  name?: string;
  /** 是否启用 */
  enabled?: boolean;
  /** 元数据过滤 */
  metadata?: Record<string, any>;
}

/**
 * Human Relay资源管理API
 */
export class HumanRelayResourceAPI extends GenericResourceAPI<HumanRelayConfig, string, HumanRelayFilter> {
  private eventManager: EventManager;
  private humanRelayHandler?: HumanRelayHandler;
  private configs: Map<string, HumanRelayConfig> = new Map();

  constructor() {
    super();
    // 从SingletonRegistry获取EventManager
    this.eventManager = SingletonRegistry.get<EventManager>('eventManager');
  }

  // ============================================================================
  // GenericResourceAPI 抽象方法实现
  // ============================================================================

  protected async getResource(id: string): Promise<HumanRelayConfig | null> {
    return this.configs.get(id) || null;
  }

  protected async getAllResources(): Promise<HumanRelayConfig[]> {
    return Array.from(this.configs.values());
  }

  protected async createResource(config: HumanRelayConfig): Promise<void> {
    this.configs.set(config.id, config);
  }

  protected async updateResource(id: string, updates: Partial<HumanRelayConfig>): Promise<void> {
    const existing = this.configs.get(id);
    if (existing) {
      this.configs.set(id, { ...existing, ...updates });
    }
  }

  protected async deleteResource(id: string): Promise<void> {
    this.configs.delete(id);
  }

  protected applyFilter(resources: HumanRelayConfig[], filter: HumanRelayFilter): HumanRelayConfig[] {
    return resources.filter(config => {
      if (filter.name && !config.name.includes(filter.name)) {
        return false;
      }
      if (filter.enabled !== undefined && config.enabled !== filter.enabled) {
        return false;
      }
      if (filter.metadata) {
        for (const [key, value] of Object.entries(filter.metadata)) {
          if (config.metadata?.[key] !== value) {
            return false;
          }
        }
      }
      return true;
    });
  }

  protected override async clearResources(): Promise<void> {
    this.configs.clear();
  }

  // ============================================================================
  // Human Relay处理器管理
  // ============================================================================

  /**
   * 注册Human Relay处理器
   * @param handler Human Relay处理器
   */
  registerHandler(handler: HumanRelayHandler): void {
    this.humanRelayHandler = handler;
  }

  /**
   * 获取当前注册的Human Relay处理器
   * @returns Human Relay处理器，如果未注册则返回undefined
   */
  getHandler(): HumanRelayHandler | undefined {
    return this.humanRelayHandler;
  }

  /**
   * 清除当前注册的Human Relay处理器
   */
  clearHandler(): void {
    this.humanRelayHandler = undefined;
  }

  // ============================================================================
  // Human Relay处理
  // ============================================================================

  /**
   * 处理Human Relay请求
   * @param request Human Relay请求
   * @returns 执行结果
   */
  async handleRequest(request: HumanRelayRequest): Promise<ExecutionResult<HumanRelayResponse>> {
    const startTime = Date.now();

    try {
      if (!this.humanRelayHandler) {
        return failure(
          {
            message: 'HumanRelayHandler not registered. Please register a handler before handling relay requests.',
            code: 'HANDLER_NOT_REGISTERED'
          },
          Date.now() - startTime
        );
      }

      // 创建Relay上下文
      const context = this.createRelayContext(request);

      // 调用处理器
      const response = await this.humanRelayHandler.handle(request, context);

      return success(response, Date.now() - startTime);
    } catch (error) {
      return this.handleError(error, 'HANDLE_RELAY_REQUEST', startTime);
    }
  }

  /**
   * 创建Relay上下文
   * @param request Human Relay请求
   * @returns Relay上下文
   */
  private createRelayContext(request: HumanRelayRequest): any {
    const cancelToken = {
      cancelled: false,
      cancel: () => { cancelToken.cancelled = true; }
    };

    return {
      threadId: request.metadata?.['threadId'] || '',
      workflowId: request.metadata?.['workflowId'] || '',
      nodeId: request.metadata?.['nodeId'] || '',
      getVariable: (variableName: string, scope?: string) => {
        // 简化实现，实际应该从ThreadContext获取
        return undefined;
      },
      setVariable: async (variableName: string, value: any, scope?: string) => {
        // 简化实现，实际应该更新ThreadContext中的变量
      },
      getVariables: (scope?: string) => {
        // 简化实现，实际应该从ThreadContext获取
        return {};
      },
      timeout: request.timeout,
      cancelToken
    };
  }

  // ============================================================================
  // 事件订阅
  // ============================================================================

  /**
   * 订阅Human Relay请求事件
   * @param listener 事件监听器
   */
  onRelayRequested(listener: (event: HumanRelayRequestedEvent) => void): void {
    this.eventManager.on(EventType.HUMAN_RELAY_REQUESTED, listener);
  }

  /**
   * 取消订阅Human Relay请求事件
   * @param listener 事件监听器
   */
  offRelayRequested(listener: (event: HumanRelayRequestedEvent) => void): void {
    this.eventManager.off(EventType.HUMAN_RELAY_REQUESTED, listener);
  }

  /**
   * 订阅Human Relay响应事件
   * @param listener 事件监听器
   */
  onRelayResponded(listener: (event: HumanRelayRespondedEvent) => void): void {
    this.eventManager.on(EventType.HUMAN_RELAY_RESPONDED, listener);
  }

  /**
   * 取消订阅Human Relay响应事件
   * @param listener 事件监听器
   */
  offRelayResponded(listener: (event: HumanRelayRespondedEvent) => void): void {
    this.eventManager.off(EventType.HUMAN_RELAY_RESPONDED, listener);
  }

  /**
   * 订阅Human Relay处理完成事件
   * @param listener 事件监听器
   */
  onRelayProcessed(listener: (event: HumanRelayProcessedEvent) => void): void {
    this.eventManager.on(EventType.HUMAN_RELAY_PROCESSED, listener);
  }

  /**
   * 取消订阅Human Relay处理完成事件
   * @param listener 事件监听器
   */
  offRelayProcessed(listener: (event: HumanRelayProcessedEvent) => void): void {
    this.eventManager.off(EventType.HUMAN_RELAY_PROCESSED, listener);
  }

  /**
   * 订阅Human Relay失败事件
   * @param listener 事件监听器
   */
  onRelayFailed(listener: (event: HumanRelayFailedEvent) => void): void {
    this.eventManager.on(EventType.HUMAN_RELAY_FAILED, listener);
  }

  /**
   * 取消订阅Human Relay失败事件
   * @param listener 事件监听器
   */
  offRelayFailed(listener: (event: HumanRelayFailedEvent) => void): void {
    this.eventManager.off(EventType.HUMAN_RELAY_FAILED, listener);
  }

  // ============================================================================
  // 验证方法
  // ============================================================================

  /**
   * 验证Human Relay配置
   * @param config 配置对象
   * @returns 验证结果
   */
  protected override validateResource(config: HumanRelayConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.id) {
      errors.push('配置ID不能为空');
    }

    if (!config.name) {
      errors.push('配置名称不能为空');
    }

    if (config.defaultTimeout !== undefined && config.defaultTimeout < 0) {
      errors.push('默认超时时间不能为负数');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证Human Relay配置更新
   * @param updates 更新内容
   * @returns 验证结果
   */
  protected override validateUpdate(updates: Partial<HumanRelayConfig>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (updates.name !== undefined && !updates.name) {
      errors.push('配置名称不能为空');
    }

    if (updates.defaultTimeout !== undefined && updates.defaultTimeout < 0) {
      errors.push('默认超时时间不能为负数');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // ============================================================================
  // 工具方法
  // ============================================================================

  /**
   * 检查是否已注册处理器
   * @returns 是否已注册处理器
   */
  hasHandler(): boolean {
    return this.humanRelayHandler !== undefined;
  }

  /**
   * 获取配置数量
   * @returns 执行结果
   */
  async getConfigCount(): Promise<ExecutionResult<number>> {
    const startTime = Date.now();
    try {
      return success(this.configs.size, Date.now() - startTime);
    } catch (error) {
      return this.handleError(error, 'GET_CONFIG_COUNT', startTime);
    }
  }

  /**
   * 启用或禁用配置
   * @param id 配置ID
   * @param enabled 是否启用
   * @returns 执行结果
   */
  async setConfigEnabled(id: string, enabled: boolean): Promise<ExecutionResult<void>> {
    const startTime = Date.now();
    try {
      const config = this.configs.get(id);
      if (!config) {
        return failure(
          {
            message: `HumanRelayConfig not found: ${id}`,
            code: 'CONFIG_NOT_FOUND'
          },
          Date.now() - startTime
        );
      }

      config.enabled = enabled;
      this.configs.set(id, config);

      return success(undefined, Date.now() - startTime);
    } catch (error) {
      return this.handleError(error, 'SET_CONFIG_ENABLED', startTime);
    }
  }
}