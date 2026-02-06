/**
 * SDK主类
 * 提供统一的API入口，整合所有功能模块
 *
 * 重构说明：
 * - 使用APIFactory统一管理API实例创建
 * - 支持全局配置和依赖注入
 * - 保持向后兼容性
 */

import { APIFactory, type SDKAPIConfig } from '../factory/api-factory';
import { WorkflowValidatorAPI } from '../validation/workflow-validator-api';
import { getData } from '../types/execution-result';
import type { SDKOptions, SDKDependencies } from '../types';

/**
 * SDK主类 - 统一API入口（内部类，不导出）
 */
class SDK {
  private factory: APIFactory;
  
  // 验证API实例
  public readonly validation: WorkflowValidatorAPI;

  /**
   * 创建SDK实例
   * @param options SDK配置选项
   * @param dependencies SDK依赖项
   */
  constructor(options?: SDKOptions, dependencies?: SDKDependencies) {
    // 初始化API工厂
    this.factory = APIFactory.getInstance();
    
    // 配置工厂
    const config: SDKAPIConfig = {
      workflow: {
        enableCache: options?.enableCache ?? true,
        cacheTTL: options?.cacheTTL ?? 300000,
        enableValidation: options?.enableValidation ?? true,
        enableLogging: options?.enableLogging ?? false
      },
      tool: {
        enableCache: true,
        cacheTTL: 300000,
        enableValidation: true,
        enableLogging: false
      },
      thread: {
        enableCache: true,
        cacheTTL: 5000,
        enableValidation: true,
        enableLogging: false
      },
      script: {
        enableCache: true,
        cacheTTL: 300000,
        enableValidation: true,
        enableLogging: false
      },
      profile: {
        enableCache: true,
        cacheTTL: 5000,
        enableValidation: true,
        enableLogging: false
      },
      nodeTemplate: {
        enableCache: true,
        cacheTTL: 5000,
        enableValidation: true,
        enableLogging: false
      },
      triggerTemplate: {
        enableCache: true,
        cacheTTL: 5000,
        enableValidation: true,
        enableLogging: false
      }
    };
    
    this.factory.configure(config);

    // 初始化验证API
    this.validation = new WorkflowValidatorAPI();
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
   * 获取API工厂实例
   */
  getFactory(): APIFactory {
    return this.factory;
  }

  /**
   * 配置SDK
   * @param config SDK API配置
   */
  configure(config: SDKAPIConfig): void {
    this.factory.configure(config);
  }

  /**
   * 重置SDK配置
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
      { name: 'threads', check: () => this.threads.getThreadCount() },
      { name: 'tools', check: () => this.tools.getToolCount() },
      { name: 'scripts', check: () => this.scripts.getScriptCount() },
      { name: 'nodeTemplates', check: () => this.nodeTemplates.getTemplateCount() },
      { name: 'triggerTemplates', check: () => Promise.resolve(this.triggerTemplates.getTemplateCount()) },
      { name: 'profiles', check: () => this.profiles.getProfileCount() },
      { name: 'validation', check: () => Promise.resolve(true) }
    ];
    
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    for (const module of modules) {
      try {
        await module.check();
        details[module.name] = { status: 'healthy' };
      } catch (error) {
        details[module.name] = {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : String(error)
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
    try {
      await this.workflows.clear();
    } catch (error) {
      console.error('清理workflows资源失败:', error);
    }

    try {
      await this.threads.clearThreads();
    } catch (error) {
      console.error('清理threads资源失败:', error);
    }

    try {
      await this.tools.clearTools();
    } catch (error) {
      console.error('清理tools资源失败:', error);
    }

    try {
      await this.scripts.clearScripts();
    } catch (error) {
      console.error('清理scripts资源失败:', error);
    }

    try {
      await this.nodeTemplates.clearTemplates();
    } catch (error) {
      console.error('清理nodeTemplates资源失败:', error);
    }

    try {
      await this.triggerTemplates.clearTemplates();
    } catch (error) {
      console.error('清理triggerTemplates资源失败:', error);
    }

    try {
      await this.profiles.clearProfiles();
    } catch (error) {
      console.error('清理profiles资源失败:', error);
    }

    console.log('SDK实例已销毁');
  }
}

/**
 * 全局SDK实例
 * 提供统一的API入口，整合所有功能模块
 */
export const sdk = new SDK();