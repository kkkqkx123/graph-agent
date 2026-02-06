/**
 * APIFactory - API工厂类
 * 统一管理所有资源API实例的创建和配置
 * 
 * 设计模式：
 * - Factory模式：统一创建API实例
 * - Singleton模式：确保工厂实例唯一
 * - Builder模式：支持链式配置
 */

import { WorkflowRegistryAPI } from '../resources/workflows/workflow-registry-api';
import { ToolRegistryAPI } from '../resources/tools/tool-registry-api';
import { ThreadRegistryAPI } from '../resources/threads/thread-registry-api';
import { ScriptRegistryAPI } from '../resources/scripts/script-registry-api';
import { LLMProfileRegistryAPI } from '../resources/profiles/profile-registry-api';
import { NodeRegistryAPI } from '../resources/templates/node-template-registry-api';
import { TriggerTemplateRegistryAPI } from '../resources/templates/trigger-template-registry-api';

/**
 * SDK API配置接口
 */
export interface SDKAPIConfig {
  // 配置选项已移除，不再支持配置
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
  profiles: LLMProfileRegistryAPI;
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

  private constructor() { }

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
  public createWorkflowAPI(): WorkflowRegistryAPI {
    if (!this.apiInstances.workflows) {
      this.apiInstances.workflows = new WorkflowRegistryAPI();
    }
    return this.apiInstances.workflows;
  }

  /**
   * 创建工具API
   * @param options 可选配置（覆盖全局配置）
   * @returns ToolRegistryAPI实例
   */
  public createToolAPI(): ToolRegistryAPI {
    if (!this.apiInstances.tools) {
      this.apiInstances.tools = new ToolRegistryAPI();
    }
    return this.apiInstances.tools;
  }

  /**
   * 创建线程API
   * @param options 可选配置（覆盖全局配置）
   * @returns ThreadRegistryAPI实例
   */
  public createThreadAPI(): ThreadRegistryAPI {
    if (!this.apiInstances.threads) {
      this.apiInstances.threads = new ThreadRegistryAPI();
    }
    return this.apiInstances.threads;
  }

  /**
   * 创建脚本API
   * @param options 可选配置（覆盖全局配置）
   * @returns ScriptRegistryAPI实例
   */
  public createScriptAPI(): ScriptRegistryAPI {
    if (!this.apiInstances.scripts) {
      this.apiInstances.scripts = new ScriptRegistryAPI();
    }
    return this.apiInstances.scripts;
  }

  /**
   * 创建Profile API
   * @param options 可选配置（覆盖全局配置）
   * @returns ProfileRegistryAPI实例
   */
  public createProfileAPI(): LLMProfileRegistryAPI {
    if (!this.apiInstances.profiles) {
      this.apiInstances.profiles = new LLMProfileRegistryAPI();
    }
    return this.apiInstances.profiles;
  }

  /**
   * 创建节点模板API
   * @param options 可选配置（覆盖全局配置）
   * @returns NodeRegistryAPI实例
   */
  public createNodeTemplateAPI(): NodeRegistryAPI {
    if (!this.apiInstances.nodeTemplates) {
      this.apiInstances.nodeTemplates = new NodeRegistryAPI();
    }
    return this.apiInstances.nodeTemplates;
  }

  /**
   * 创建触发器模板API
   * @param options 可选配置（覆盖全局配置）
   * @returns TriggerTemplateRegistryAPI实例
   */
  public createTriggerTemplateAPI(): TriggerTemplateRegistryAPI {
    if (!this.apiInstances.triggerTemplates) {
      this.apiInstances.triggerTemplates = new TriggerTemplateRegistryAPI();
    }
    return this.apiInstances.triggerTemplates;
  }

  /**
   * 创建所有API实例
   * @param options 可选配置（覆盖全局配置）
   * @returns 所有API实例
   */
  public createAllAPIs(): AllAPIs {
    return {
      workflows: this.createWorkflowAPI(),
      tools: this.createToolAPI(),
      threads: this.createThreadAPI(),
      scripts: this.createScriptAPI(),
      profiles: this.createProfileAPI(),
      nodeTemplates: this.createNodeTemplateAPI(),
      triggerTemplates: this.createTriggerTemplateAPI()
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
}

/**
 * 导出工厂单例实例
 */
export const apiFactory = APIFactory.getInstance();