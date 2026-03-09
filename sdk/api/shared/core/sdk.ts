/**
 * SDK主类
 * 提供统一的API入口，整合所有功能模块
 *
 * 重构说明：
 * - 使用APIFactory统一管理API实例创建
 * - 简化配置，移除不必要的配置机制
 * - 支持应用层提供 CheckpointStorageCallback 实现
 */

import { APIFactory } from './api-factory.js';
import { APIDependencyManager } from './sdk-dependencies.js';
import { getData } from '../types/execution-result.js';
import type { SDKOptions } from '@modular-agent/types';
import { logger } from '../../../utils/index.js';
import { getErrorMessage } from '@modular-agent/common-utils';
import { setStorageCallback } from '../../../core/di/container-config.js';

/**
 * SDK主类 - 统一API入口（内部类，不导出）
 */
class SDK {
  private factory: APIFactory;
  private dependencies: APIDependencyManager;

  /**
   * 创建SDK实例
   * @param options SDK配置选项
   */
  constructor(options?: SDKOptions) {
    // 如果提供了存储回调，设置到 DI 容器
    if (options?.checkpointStorageCallback) {
      setStorageCallback(options.checkpointStorageCallback);
    }
    
    // 初始化API工厂
    this.factory = APIFactory.getInstance();
    // 初始化依赖管理器
    this.dependencies = new APIDependencyManager();
  }

  /**
   * 获取工作流API
   */
  get workflows() {
    return this.factory.createWorkflowAPI();
  }

  /**
   * 获取线程API
   */
  get threads() {
    return this.factory.createThreadAPI();
  }

  /**
   * 获取节点模板API
   */
  get nodeTemplates() {
    return this.factory.createNodeTemplateAPI();
  }

  /**
   * 获取触发器模板API
   */
  get triggerTemplates() {
    return this.factory.createTriggerTemplateAPI();
  }

  /**
   * 获取工具API
   */
  get tools() {
    return this.factory.createToolAPI();
  }

  /**
   * 获取脚本API
   */
  get scripts() {
    return this.factory.createScriptAPI();
  }

  /**
   * 获取Profile API
   */
  get profiles() {
    return this.factory.createProfileAPI();
  }

  /**
   * 获取用户交互API
   */
  get userInteractions() {
    return this.factory.createUserInteractionAPI();
  }

  /**
   * 获取HumanRelay API
   */
  get humanRelay() {
    return this.factory.createHumanRelayAPI();
  }

  /**
   * 获取事件API
   */
  get events() {
    return this.factory.createEventAPI();
  }

  /**
   * 获取触发器API
   */
  get triggers() {
    return this.factory.createTriggerAPI();
  }

  /**
   * 获取变量API
   */
  get variables() {
    return this.factory.createVariableAPI();
  }

  /**
   * 获取消息API
   */
  get messages() {
    return this.factory.createMessageAPI();
  }

  /**
   * 获取API工厂实例
   */
  getFactory(): APIFactory {
    return this.factory;
  }

  /**
   * 重置SDK
   */
  reset(): void {
    this.factory.reset();
  }

  /**
   * 检查SDK健康状态
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; details: Record<string, any> }> {
    const details: Record<string, any> = {};
    const modules = [
      { name: 'workflows', check: async () => getData(await this.workflows.count()) },
      { name: 'threads', check: async () => getData(await this.threads.count()) },
      { name: 'tools', check: async () => getData(await this.tools.count()) },
      { name: 'scripts', check: async () => getData(await this.scripts.count()) },
      { name: 'nodeTemplates', check: async () => getData(await this.nodeTemplates.count()) },
      { name: 'triggerTemplates', check: async () => getData(await this.triggerTemplates.count()) },
      { name: 'profiles', check: async () => getData(await this.profiles.count()) },
      { name: 'userInteractions', check: async () => getData(await this.userInteractions.getConfigCount()) },
      { name: 'humanRelay', check: async () => getData(await this.humanRelay.getConfigCount()) },
    ];

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    for (const module of modules) {
      try {
        await module.check();
        details[module.name] = { status: 'healthy' };
      } catch (error) {
        details[module.name] = {
          status: 'unhealthy',
          error: getErrorMessage(error)
        };
        overallStatus = 'degraded';
      }
    }

    return { status: overallStatus, details };
  }

  /**
   * 销毁SDK实例，清理资源
   */
  async destroy(): Promise<void> {
    // 清理各个模块的资源
    const cleanupTasks = [
      { name: 'workflows', task: () => this.workflows.clear() },
      { name: 'threads', task: () => this.threads.clear() },
      { name: 'tools', task: () => this.tools.clear() },
      { name: 'scripts', task: () => this.scripts.clear() },
      { name: 'nodeTemplates', task: () => this.nodeTemplates.clear() },
      { name: 'triggerTemplates', task: () => this.triggerTemplates.clear() },
      { name: 'profiles', task: () => this.profiles.clear() },
      { name: 'userInteractions', task: () => this.userInteractions.clear() },
      { name: 'humanRelay', task: () => this.humanRelay.clear() }
    ];

    for (const { name, task } of cleanupTasks) {
      try {
        await task();
      } catch (error) {
        logger.error(`Failed to cleanup ${name} resource`, { error: getErrorMessage(error) });
      }
    }

    // 清理工厂实例
    this.factory.reset();

    // 清理依赖管理器
    try {
      // DI容器会自动清理所有单例服务
      const { resetContainer } = await import('../../../core/di/index.js');
      resetContainer();
    } catch (error) {
      logger.error('Failed to cleanup dependencies', { error: getErrorMessage(error) });
    }

    logger.info('SDK instance destroyed');
  }
}

/**
 * 获取全局SDK实例
 * 延迟初始化，避免在模块加载时就初始化 DI 容器
 */
export function getSDK(): SDK {
  return new SDK();
}

// 导出依赖管理类
export { APIDependencyManager };
