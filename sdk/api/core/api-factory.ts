/**
 * APIFactory - API工厂类
 * 统一管理所有资源API实例的创建
 *
 * 设计模式：
 * - Factory模式：统一创建API实例
 * - Singleton模式：确保工厂实例唯一
 */

import { WorkflowRegistryAPI } from '../resources/workflows/workflow-registry-api';
import { ToolRegistryAPI } from '../resources/tools/tool-registry-api';
import { ThreadRegistryAPI } from '../resources/threads/thread-registry-api';
import { ScriptRegistryAPI } from '../resources/scripts/script-registry-api';
import { LLMProfileRegistryAPI } from '../resources/llm/llm-profile-registry-api';
import { NodeRegistryAPI } from '../resources/templates/node-template-registry-api';
import { TriggerTemplateRegistryAPI } from '../resources/templates/trigger-template-registry-api';
import { UserInteractionResourceAPI } from '../resources/user-interaction/user-interaction-resource-api';
import { HumanRelayResourceAPI } from '../resources/human-relay/human-relay-resource-api';
import { APIDependencyManager } from './sdk-dependencies';

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
  /** 用户交互API */
  userInteractions: UserInteractionResourceAPI;
  /** Human Relay API */
  humanRelay: HumanRelayResourceAPI;
}

/**
 * API工厂类
 *
 * 使用示例：
 * ```typescript
 * // 获取工厂实例
 * const factory = APIFactory.getInstance();
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
  private apiInstances: Partial<AllAPIs> = {};
  private dependencies: APIDependencyManager = new APIDependencyManager();

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
   * 重置工厂实例
   */
  public reset(): void {
    this.apiInstances = {};
  }

  /**
   * 创建API实例的通用方法
   * @param key API实例的键名
   * @param APIConstructor API构造函数
   * @returns API实例
   */
  private createAPI<T extends AllAPIs[keyof AllAPIs]>(
    key: keyof AllAPIs,
    APIConstructor: new (deps: APIDependencyManager) => T
  ): T {
    if (!this.apiInstances[key]) {
      (this.apiInstances as any)[key] = new APIConstructor(this.dependencies);
    }
    return (this.apiInstances as any)[key];
  }

  /**
   * 创建工作流API
   * @returns WorkflowRegistryAPI实例
   */
  public createWorkflowAPI(): WorkflowRegistryAPI {
    return this.createAPI('workflows', WorkflowRegistryAPI);
  }

  /**
   * 创建工具API
   * @returns ToolRegistryAPI实例
   */
  public createToolAPI(): ToolRegistryAPI {
    return this.createAPI('tools', ToolRegistryAPI);
  }

  /**
   * 创建线程API
   * @returns ThreadRegistryAPI实例
   */
  public createThreadAPI(): ThreadRegistryAPI {
    return this.createAPI('threads', ThreadRegistryAPI);
  }

  /**
   * 创建脚本API
   * @returns ScriptRegistryAPI实例
   */
  public createScriptAPI(): ScriptRegistryAPI {
    return this.createAPI('scripts', ScriptRegistryAPI);
  }

  /**
   * 创建Profile API
   * @returns ProfileRegistryAPI实例
   */
  public createProfileAPI(): LLMProfileRegistryAPI {
    return this.createAPI('profiles', LLMProfileRegistryAPI);
  }

  /**
   * 创建节点模板API
   * @returns NodeRegistryAPI实例
   */
  public createNodeTemplateAPI(): NodeRegistryAPI {
    return this.createAPI('nodeTemplates', NodeRegistryAPI);
  }

  /**
   * 创建触发器模板API
   * @returns TriggerTemplateRegistryAPI实例
   */
  public createTriggerTemplateAPI(): TriggerTemplateRegistryAPI {
    return this.createAPI('triggerTemplates', TriggerTemplateRegistryAPI);
  }

  /**
   * 创建用户交互API
   * @returns UserInteractionResourceAPI实例
   */
  public createUserInteractionAPI(): UserInteractionResourceAPI {
    return this.createAPI('userInteractions', UserInteractionResourceAPI);
  }

  /**
   * 创建Human Relay API
   * @returns HumanRelayResourceAPI实例
   */
  public createHumanRelayAPI(): HumanRelayResourceAPI {
    return this.createAPI('humanRelay', HumanRelayResourceAPI);
  }

  /**
   * 创建所有API实例
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
      triggerTemplates: this.createTriggerTemplateAPI(),
      userInteractions: this.createUserInteractionAPI(),
      humanRelay: this.createHumanRelayAPI()
    };
  }
}

/**
 * 导出工厂单例实例
 */
export const apiFactory = APIFactory.getInstance();