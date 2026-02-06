/**
 * SDK主类
 * 提供统一的API入口，整合所有功能模块
 */

import { WorkflowRegistryAPI } from '../resources/workflows/workflow-registry-api';
import { ThreadRegistryAPI } from '../resources/threads/thread-registry-api';
import { NodeRegistryAPI } from '../resources/templates/node-template-registry-api';
import { TriggerTemplateRegistryAPI } from '../resources/templates/trigger-template-registry-api';
import { ToolRegistryAPI } from '../resources/tools/tool-registry-api';
import { ScriptRegistryAPI } from '../resources/scripts/script-registry-api';
import { ProfileRegistryAPI } from '../resources/profiles/profile-registry-api';

import { WorkflowValidatorAPI } from '../validation/workflow-validator-api';

import type { SDKOptions, SDKDependencies } from '../types';

/**
 * SDK主类 - 统一API入口（内部类，不导出）
 */
class SDK {
  // 资源管理API实例
  public readonly workflows: WorkflowRegistryAPI;
  public readonly threads: ThreadRegistryAPI;
  public readonly nodeTemplates: NodeRegistryAPI;
  public readonly triggerTemplates: TriggerTemplateRegistryAPI;
  public readonly tools: ToolRegistryAPI;
  public readonly scripts: ScriptRegistryAPI;
  public readonly profiles: ProfileRegistryAPI;

  // 验证API实例
  public readonly validation: WorkflowValidatorAPI;

  /**
   * 创建SDK实例
   * @param options SDK配置选项
   * @param dependencies SDK依赖项
   */
  constructor(options?: SDKOptions, dependencies?: SDKDependencies) {
    // 初始化资源管理API，支持依赖注入
    this.workflows = new WorkflowRegistryAPI(options);
    this.threads = new ThreadRegistryAPI(dependencies?.threadRegistry);
    this.nodeTemplates = new NodeRegistryAPI();
    this.triggerTemplates = new TriggerTemplateRegistryAPI();
    this.tools = new ToolRegistryAPI();
    this.scripts = new ScriptRegistryAPI();
    this.profiles = new ProfileRegistryAPI();

    // 初始化验证API
    this.validation = new WorkflowValidatorAPI();
  }

  /**
   * 检查SDK健康状态
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; details: Record<string, any> }> {
    const details: Record<string, any> = {};
    const modules = [
      { name: 'workflows', check: () => this.workflows.getWorkflowCount() },
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
      await this.workflows.clearWorkflows();
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