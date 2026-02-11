/**
 * SDK主类
 * 提供统一的API入口，整合所有功能模块
 *
 * 重构说明：
 * - 使用APIFactory统一管理API实例创建
 * - 支持全局配置和依赖注入
 * - 保持向后兼容性
 */

import { APIFactory, type SDKAPIConfig } from './api-factory';
import { APIDependencies } from './api-dependencies';
import { SDKAPIDependencies } from './sdk-api-dependencies';
import { getData } from '@modular-agent/types/execution-result';
import type { SDKOptions, SDKDependencies } from '@modular-agent/types';

/**
 * SDK主类 - 统一API入口（内部类，不导出）
 */
class SDK {
  private factory: APIFactory;


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
        enableValidation: options?.enableValidation ?? true
      },
      tool: {
        enableValidation: true
      },
      thread: {
        enableValidation: true
      },
      script: {
        enableValidation: true
      },
      profile: {
        enableValidation: true
      },
      nodeTemplate: {
        enableValidation: true
      },
      triggerTemplate: {
        enableValidation: true
      }
    };

    this.factory.configure(config);

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
      await this.threads.clear();
    } catch (error) {
      console.error('清理threads资源失败:', error);
    }

    try {
      await this.tools.clear();
    } catch (error) {
      console.error('清理tools资源失败:', error);
    }

    try {
      await this.scripts.clear();
    } catch (error) {
      console.error('清理scripts资源失败:', error);
    }

    try {
      await this.nodeTemplates.clear();
    } catch (error) {
      console.error('清理nodeTemplates资源失败:', error);
    }

    try {
      await this.triggerTemplates.clear();
    } catch (error) {
      console.error('清理triggerTemplates资源失败:', error);
    }

    try {
      await this.profiles.clear();
    } catch (error) {
      console.error('清理profiles资源失败:', error);
    }

    try {
      await this.userInteractions.clear();
    } catch (error) {
      console.error('清理userInteractions资源失败:', error);
    }

    try {
      await this.humanRelay.clear();
    } catch (error) {
      console.error('清理humanRelay资源失败:', error);
    }

    console.log('SDK实例已销毁');
  }
}

/**
 * 全局SDK实例
 * 提供统一的API入口，整合所有功能模块
 */
export const sdk = new SDK();

// 导出依赖接口和实现
export { APIDependencies, SDKAPIDependencies };