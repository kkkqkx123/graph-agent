/**
 * UserInteractionResourceAPI - 用户交互资源管理API
 * 提供用户交互相关的资源管理功能
 *
 * 职责：
 * - 管理用户交互处理器的注册和获取
 * - 提供用户交互事件订阅功能
 * - 封装用户交互的处理逻辑
 *
 * 设计原则：
 * - 遵循GenericResourceAPI的统一接口模式
 * - 提供清晰的事件订阅接口
 * - 支持处理器的动态注册和替换
 */

import {
  validateRequiredFields,
  validateStringLength,
  validatePositiveNumber
} from '../../validation/validation-strategy';

import { GenericResourceAPI } from '../generic-resource-api';
import type { ExecutionResult } from '../../types/execution-result';
import { success, failure } from '../../types/execution-result';
import type { UserInteractionHandler, UserInteractionRequest } from '@modular-agent/types';
import { EventType, ExecutionError as SDKExecutionError } from '@modular-agent/types';
import type {
  UserInteractionRequestedEvent,
  UserInteractionRespondedEvent,
  UserInteractionProcessedEvent,
  UserInteractionFailedEvent
} from '@modular-agent/types';
import { ExecutionError } from '@modular-agent/types';
import type { APIDependencyManager } from '../../core/sdk-dependencies';

/**
 * 用户交互配置
 */
export interface UserInteractionConfig {
  /** 配置ID */
  id: string;
  /** 配置名称 */
  name: string;
  /** 配置描述 */
  description?: string;
  /** 默认超时时间（毫秒） */
  defaultTimeout?: number;
  /** 元数据 */
  metadata?: Record<string, any>;
}

/**
 * 用户交互过滤器
 */
export interface UserInteractionFilter {
  /** 配置名称 */
  name?: string;
  /** 元数据过滤 */
  metadata?: Record<string, any>;
}

/**
 * 用户交互资源管理API
 */
export class UserInteractionResourceAPI extends GenericResourceAPI<UserInteractionConfig, string, UserInteractionFilter> {
  private dependencies: APIDependencyManager;
  private userInteractionHandler?: UserInteractionHandler;
  private configs: Map<string, UserInteractionConfig> = new Map();

  constructor(dependencies: APIDependencyManager) {
    super();
    this.dependencies = dependencies;
  }

  // ============================================================================
  // GenericResourceAPI 抽象方法实现
  // ============================================================================

  protected async getResource(id: string): Promise<UserInteractionConfig | null> {
    return this.configs.get(id) || null;
  }

  protected async getAllResources(): Promise<UserInteractionConfig[]> {
    return Array.from(this.configs.values());
  }

  protected async createResource(config: UserInteractionConfig): Promise<void> {
    this.configs.set(config.id, config);
  }

  protected async updateResource(id: string, updates: Partial<UserInteractionConfig>): Promise<void> {
    const existing = this.configs.get(id);
    if (existing) {
      this.configs.set(id, { ...existing, ...updates });
    }
  }

  protected async deleteResource(id: string): Promise<void> {
    this.configs.delete(id);
  }

  protected applyFilter(resources: UserInteractionConfig[], filter: UserInteractionFilter): UserInteractionConfig[] {
    return resources.filter(config => {
      if (filter.name && !config.name.includes(filter.name)) {
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
  // 用户交互处理器管理
  // ============================================================================

  /**
   * 注册用户交互处理器
   * @param handler 用户交互处理器
   */
  registerHandler(handler: UserInteractionHandler): void {
    this.userInteractionHandler = handler;
  }

  /**
   * 获取当前注册的用户交互处理器
   * @returns 用户交互处理器，如果未注册则返回undefined
   */
  getHandler(): UserInteractionHandler | undefined {
    return this.userInteractionHandler;
  }

  /**
   * 清除当前注册的用户交互处理器
   */
  clearHandler(): void {
    this.userInteractionHandler = undefined;
  }

  // ============================================================================
  // 用户交互处理
  // ============================================================================

  /**
   * 处理用户交互请求
   * @param request 用户交互请求
   * @returns 执行结果
   */
  async handleInteraction(request: UserInteractionRequest): Promise<ExecutionResult<any>> {
    const startTime = Date.now();

    try {
      if (!this.userInteractionHandler) {
        return failure(
          new SDKExecutionError(
            'UserInteractionHandler not registered. Please register a handler before handling interactions.',
            undefined,
            undefined,
            { code: 'HANDLER_NOT_REGISTERED' }
          ),
          Date.now() - startTime
        );
      }

      // 创建交互上下文
      const context = this.createInteractionContext(request);

      // 调用处理器
      const result = await this.userInteractionHandler.handle(request, context);

      return success(result, Date.now() - startTime);
    } catch (error) {
      return this.handleError(error, 'HANDLE_INTERACTION', startTime);
    }
  }

  /**
   * 创建交互上下文
   * @param request 用户交互请求
   * @returns 交互上下文
   */
  private createInteractionContext(request: UserInteractionRequest): any {
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
   * 订阅用户交互请求事件
   * @param listener 事件监听器
   */
  onInteractionRequested(listener: (event: UserInteractionRequestedEvent) => void): void {
    this.dependencies.getEventManager().on(EventType.USER_INTERACTION_REQUESTED, listener);
  }

  /**
   * 取消订阅用户交互请求事件
   * @param listener 事件监听器
   */
  offInteractionRequested(listener: (event: UserInteractionRequestedEvent) => void): void {
    this.dependencies.getEventManager().off(EventType.USER_INTERACTION_REQUESTED, listener);
  }

  /**
   * 订阅用户交互响应事件
   * @param listener 事件监听器
   */
  onInteractionResponded(listener: (event: UserInteractionRespondedEvent) => void): void {
    this.dependencies.getEventManager().on(EventType.USER_INTERACTION_RESPONDED, listener);
  }

  /**
   * 取消订阅用户交互响应事件
   * @param listener 事件监听器
   */
  offInteractionResponded(listener: (event: UserInteractionRespondedEvent) => void): void {
    this.dependencies.getEventManager().off(EventType.USER_INTERACTION_RESPONDED, listener);
  }

  /**
   * 订阅用户交互处理完成事件
   * @param listener 事件监听器
   */
  onInteractionProcessed(listener: (event: UserInteractionProcessedEvent) => void): void {
    this.dependencies.getEventManager().on(EventType.USER_INTERACTION_PROCESSED, listener);
  }

  /**
   * 取消订阅用户交互处理完成事件
   * @param listener 事件监听器
   */
  offInteractionProcessed(listener: (event: UserInteractionProcessedEvent) => void): void {
    this.dependencies.getEventManager().off(EventType.USER_INTERACTION_PROCESSED, listener);
  }

  /**
   * 订阅用户交互失败事件
   * @param listener 事件监听器
   */
  onInteractionFailed(listener: (event: UserInteractionFailedEvent) => void): void {
    this.dependencies.getEventManager().on(EventType.USER_INTERACTION_FAILED, listener);
  }

  /**
   * 取消订阅用户交互失败事件
   * @param listener 事件监听器
   */
  offInteractionFailed(listener: (event: UserInteractionFailedEvent) => void): void {
    this.dependencies.getEventManager().off(EventType.USER_INTERACTION_FAILED, listener);
  }

  // ============================================================================
  // 验证方法
  // ============================================================================

  /**
   * 验证用户交互配置
   * @param config 配置对象
   * @param context 验证上下文
   * @returns 验证结果
   */
  protected override async validateResource(
    config: UserInteractionConfig,
    context?: any
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // 使用简化验证工具验证必需字段
    const requiredResult = validateRequiredFields(config, ['id', 'name'], 'config');
    if (requiredResult.isErr()) {
      errors.push(...requiredResult.unwrapOrElse(err => err.map(error => error.message)));
    }

    // 验证超时时间
    if (config.defaultTimeout !== undefined) {
      const timeoutResult = validatePositiveNumber(config.defaultTimeout, '默认超时时间');
      if (timeoutResult.isErr()) {
        errors.push(...timeoutResult.unwrapOrElse(err => err.map(error => error.message)));
      }
    }

    // 验证ID长度
    if (config.id) {
      const idResult = validateStringLength(config.id, '配置ID', 1, 100);
      if (idResult.isErr()) {
        errors.push(...idResult.unwrapOrElse(err => err.map(error => error.message)));
      }
    }

    // 验证名称长度
    if (config.name) {
      const nameResult = validateStringLength(config.name, '配置名称', 1, 200);
      if (nameResult.isErr()) {
        errors.push(...nameResult.unwrapOrElse(err => err.map(error => error.message)));
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证用户交互配置更新
   * @param updates 更新内容
   * @param context 验证上下文
   * @returns 验证结果
   */
  protected override async validateUpdate(
    updates: Partial<UserInteractionConfig>,
    context?: any
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // 验证名称（如果提供）
    if (updates.name !== undefined) {
      const nameResult = validateStringLength(updates.name, '配置名称', 1, 200);
      if (nameResult.isErr()) {
        errors.push(...nameResult.unwrapOrElse(err => err.map(error => error.message)));
      }
    }

    // 验证超时时间（如果提供）
    if (updates.defaultTimeout !== undefined) {
      const timeoutResult = validatePositiveNumber(updates.defaultTimeout, '默认超时时间');
      if (timeoutResult.isErr()) {
        errors.push(...timeoutResult.unwrapOrElse(err => err.map(error => error.message)));
      }
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
    return this.userInteractionHandler !== undefined;
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
}