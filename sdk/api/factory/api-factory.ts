/**
 * APIFactory - API工厂类
 * 统一管理所有资源API实例的创建和配置
 * 
 * 设计模式：
 * - Factory模式：统一创建API实例
 * - Singleton模式：确保工厂实例唯一
 * - Builder模式：支持链式配置
 */

import { ResourceAPIOptions } from '../resources/generic-resource-api';
import { WorkflowRegistryAPI } from '../resources/workflows/workflow-registry-api';
import { ToolRegistryAPI } from '../resources/tools/tool-registry-api';
import { ThreadRegistryAPI } from '../resources/threads/thread-registry-api';
import { ScriptRegistryAPI } from '../resources/scripts/script-registry-api';
import { ProfileRegistryAPI } from '../resources/profiles/profile-registry-api';
import { NodeRegistryAPI } from '../resources/templates/node-template-registry-api';
import { TriggerTemplateRegistryAPI } from '../resources/templates/trigger-template-registry-api';

/**
 * SDK API配置接口
 */
export interface SDKAPIConfig {
  /** 工作流API配置 */
  workflow?: ResourceAPIOptions;
  /** 工具API配置 */
  tool?: ResourceAPIOptions;
  /** 线程API配置 */
  thread?: ResourceAPIOptions;
  /** 脚本API配置 */
  script?: ResourceAPIOptions;
  /** Profile API配置 */
  profile?: ResourceAPIOptions;
  /** 节点模板API配置 */
  nodeTemplate?: ResourceAPIOptions;
  /** 触发器模板API配置 */
  triggerTemplate?: ResourceAPIOptions;
}

/**
 * 所有API实例集合
 */
export interface AllAPIs {
  /** 工作流API */
  workflows: WorkflowRegistryAPI;
  /** 工具API */
  tools: ToolRegistryAPI;
  /** 线程API */
  threads: ThreadRegistryAPI;
  /** 脚本API */
  scripts: ScriptRegistryAPI;
  /** Profile API */
  profiles: ProfileRegistryAPI;
  /** 节点模板API */
  nodeTemplates: NodeRegistryAPI;
  /** 触发器模板API */
  triggerTemplates: TriggerTemplateRegistryAPI;
}

/**
 * API工厂类
 * 
 * 使用示例：
 * ```typescript
 * // 获取工厂实例
 * const factory = APIFactory.getInstance();
 * 
 * // 配置工厂
 * factory.configure({
 *   workflow: { enableCache: true, cacheTTL: 60000 },
 *   tool: { enableLogging: true }
 * });
 * 
 * // 创建单个API
 * const workflowAPI = factory.createWorkflowAPI();
 * 
 * // 创建所有API
 * const apis = factory.createAllAPIs();
 * ```
 */
export class APIFactory {
  private static instance: APIFactory;
  private config: SDKAPIConfig = {};
  private apiInstances: Partial<AllAPIs> = {};

  private constructor() {}

  /**
   * 获取工厂单例实例
   */
  public static getInstance(): APIFactory {
    if (!APIFactory.instance) {
      APIFactory.instance = new APIFactory();
    }
    return APIFactory.instance;
  }

  /**
   * 配置工厂
   * @param config SDK API配置
   */
  public configure(config: SDKAPIConfig): void {
    this.config = { ...this.config, ...config };
    // 清除已创建的实例，以便使用新配置重新创建
    this.apiInstances = {};
  }

  /**
   * 获取配置
   * @returns 当前配置
   */
  public getConfig(): SDKAPIConfig {
    return { ...this.config };
  }

  /**
   * 重置工厂配置和实例
   */
  public reset(): void {
    this.config = {};
    this.apiInstances = {};
  }

  /**
   * 创建工作流API
   * @param options 可选配置（覆盖全局配置）
   * @returns WorkflowRegistryAPI实例
   */
  public createWorkflowAPI(options?: ResourceAPIOptions): WorkflowRegistryAPI {
    if (!this.apiInstances.workflows || options) {
      const mergedOptions = this.mergeOptions(this.config.workflow, options);
      this.apiInstances.workflows = new WorkflowRegistryAPI(mergedOptions);
    }
    return this.apiInstances.workflows;
  }

  /**
   * 创建工具API
   * @param options 可选配置（覆盖全局配置）
   * @returns ToolRegistryAPI实例
   */
  public createToolAPI(options?: ResourceAPIOptions): ToolRegistryAPI {
    if (!this.apiInstances.tools || options) {
      const mergedOptions = this.mergeOptions(this.config.tool, options);
      this.apiInstances.tools = new ToolRegistryAPI(mergedOptions);
    }
    return this.apiInstances.tools;
  }

  /**
   * 创建线程API
   * @param options 可选配置（覆盖全局配置）
   * @returns ThreadRegistryAPI实例
   */
  public createThreadAPI(options?: ResourceAPIOptions): ThreadRegistryAPI {
    if (!this.apiInstances.threads || options) {
      const mergedOptions = this.mergeOptions(this.config.thread, options);
      this.apiInstances.threads = new ThreadRegistryAPI(undefined, mergedOptions);
    }
    return this.apiInstances.threads;
  }

  /**
   * 创建脚本API
   * @param options 可选配置（覆盖全局配置）
   * @returns ScriptRegistryAPI实例
   */
  public createScriptAPI(options?: ResourceAPIOptions): ScriptRegistryAPI {
    if (!this.apiInstances.scripts || options) {
      const mergedOptions = this.mergeOptions(this.config.script, options);
      this.apiInstances.scripts = new ScriptRegistryAPI(mergedOptions);
    }
    return this.apiInstances.scripts;
  }

  /**
   * 创建Profile API
   * @param options 可选配置（覆盖全局配置）
   * @returns ProfileRegistryAPI实例
   */
  public createProfileAPI(options?: ResourceAPIOptions): ProfileRegistryAPI {
    if (!this.apiInstances.profiles || options) {
      const mergedOptions = this.mergeOptions(this.config.profile, options);
      this.apiInstances.profiles = new ProfileRegistryAPI(mergedOptions);
    }
    return this.apiInstances.profiles;
  }

  /**
   * 创建节点模板API
   * @param options 可选配置（覆盖全局配置）
   * @returns NodeRegistryAPI实例
   */
  public createNodeTemplateAPI(options?: ResourceAPIOptions): NodeRegistryAPI {
    if (!this.apiInstances.nodeTemplates || options) {
      const mergedOptions = this.mergeOptions(this.config.nodeTemplate, options);
      this.apiInstances.nodeTemplates = new NodeRegistryAPI(mergedOptions);
    }
    return this.apiInstances.nodeTemplates;
  }

  /**
   * 创建触发器模板API
   * @param options 可选配置（覆盖全局配置）
   * @returns TriggerTemplateRegistryAPI实例
   */
  public createTriggerTemplateAPI(options?: ResourceAPIOptions): TriggerTemplateRegistryAPI {
    if (!this.apiInstances.triggerTemplates || options) {
      const mergedOptions = this.mergeOptions(this.config.triggerTemplate, options);
      this.apiInstances.triggerTemplates = new TriggerTemplateRegistryAPI(undefined, mergedOptions);
    }
    return this.apiInstances.triggerTemplates;
  }

  /**
   * 创建所有API实例
   * @param options 可选配置（覆盖全局配置）
   * @returns 所有API实例
   */
  public createAllAPIs(options?: ResourceAPIOptions): AllAPIs {
    return {
      workflows: this.createWorkflowAPI(options),
      tools: this.createToolAPI(options),
      threads: this.createThreadAPI(options),
      scripts: this.createScriptAPI(options),
      profiles: this.createProfileAPI(options),
      nodeTemplates: this.createNodeTemplateAPI(options),
      triggerTemplates: this.createTriggerTemplateAPI(options)
    };
  }

  /**
   * 清除所有缓存的API实例
   */
  public clearInstances(): void {
    this.apiInstances = {};
  }

  /**
   * 合并配置选项
   * @param globalConfig 全局配置
   * @param localConfig 局部配置
   * @returns 合并后的配置
   */
  private mergeOptions(
    globalConfig?: ResourceAPIOptions,
    localConfig?: ResourceAPIOptions
  ): ResourceAPIOptions | undefined {
    if (!globalConfig && !localConfig) {
      return undefined;
    }
    if (!globalConfig) {
      return localConfig;
    }
    if (!localConfig) {
      return globalConfig;
    }
    return {
      ...globalConfig,
      ...localConfig
    };
  }
}

/**
 * 导出工厂单例实例
 */
export const apiFactory = APIFactory.getInstance();