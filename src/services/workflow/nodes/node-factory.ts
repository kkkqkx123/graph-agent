import { injectable, inject } from 'inversify';
import { NodeId } from '../../../domain/workflow/value-objects/node/node-id';
import {
  NodeTypeValue,
  NodeContextTypeValue,
} from '../../../domain/workflow/value-objects/node/node-type';
import { Node } from '../../../domain/workflow/entities/node';
import { LLMNode } from './llm-node';
import { ToolCallNode } from './tool-call-node';
import { ConditionNode } from './condition-node';
import { DataTransformNode } from './data-transform-node';
import { StartNode } from './start-node';
import { EndNode } from './end-node';
import { ContextProcessorNode } from './context-processor-node';
import { PromptSource } from '../../prompts/prompt-builder';
import {
  WrapperConfig,
  validateWrapperConfig
} from '../../../domain/llm/value-objects/wrapper-reference';
import { ILogger } from '../../../domain/common';
import { BaseService } from '../../common/base-service';
import { NodeTypeConfig } from './node-type-config';
import { NodeRetryStrategy } from '../../../domain/workflow/value-objects/node-retry-strategy';
import { getDefaultRetryStrategy } from '../../../domain/workflow/value-objects/node-retry-defaults';

/**
 * 通用节点配置属性
 */
export interface BaseNodeConfig {
  /** 节点ID */
  id?: string;
  /** 节点名称 */
  name?: string;
  /** 节点描述 */
  description?: string;
  /** 节点位置 */
  position?: { x: number; y: number };
  /** 节点重试策略配置 */
  retryStrategy?: Partial<{
    enabled: boolean;
    maxRetries: number;
    retryDelay: number;
    useExponentialBackoff: boolean;
    exponentialBase: number;
    maxRetryDelay: number;
  }>;
}

/**
 * 开始节点配置
 */
export interface StartNodeConfig extends BaseNodeConfig {
  type: 'start';
  /** 初始变量 */
  initialVariables?: Record<string, unknown>;
  /** 是否初始化上下文 */
  initializeContext?: boolean;
}

/**
 * 结束节点配置
 */
export interface EndNodeConfig extends BaseNodeConfig {
  type: 'end';
  /** 是否收集结果 */
  collectResults?: boolean;
  /** 是否清理资源 */
  cleanupResources?: boolean;
  /** 返回变量列表 */
  returnVariables?: string[];
}

/**
 * LLM节点配置
 */
export interface LLMNodeConfig extends BaseNodeConfig {
  type: 'llm';
  /** Wrapper配置 */
  wrapperConfig?: WrapperConfig;
  /** Wrapper类型 */
  wrapper_type?: 'pool' | 'group' | 'direct';
  /** Wrapper名称 */
  wrapper_name?: string;
  /** Wrapper提供商 */
  wrapper_provider?: string;
  /** Wrapper模型 */
  wrapper_model?: string;
  /** 提示词 */
  prompt: PromptSource;
  /** 系统提示词 */
  systemPrompt?: PromptSource;
  /** 上下文处理器名称 */
  contextProcessorName?: string;
  /** 温度 */
  temperature?: number;
  /** 最大Token数 */
  maxTokens?: number;
  /** 是否流式输出 */
  stream?: boolean;
}

/**
 * 工具调用节点配置
 */
export interface ToolCallNodeConfig extends BaseNodeConfig {
  type: 'tool' | 'tool-call';
  /** 工具名称 */
  toolName: string;
  /** 工具参数 */
  toolParameters?: Record<string, unknown>;
  /** 超时时间（毫秒） */
  timeout?: number;
}

/**
 * 条件节点配置
 */
export interface ConditionNodeConfig extends BaseNodeConfig {
  type: 'condition';
  /** 条件表达式 */
  condition: string;
  /** 变量 */
  variables?: Record<string, unknown>;
}

/**
 * 数据转换节点配置
 */
export interface DataTransformNodeConfig extends BaseNodeConfig {
  type: 'data-transform';
  /** 转换类型 */
  transformType: 'map' | 'filter' | 'reduce' | 'sort' | 'group';
  /** 源数据 */
  sourceData: string;
  /** 目标变量 */
  targetVariable: string;
  /** 转换配置 */
  transformConfig?: Record<string, unknown>;
}

/**
 * 上下文处理器节点配置
 */
export interface ContextProcessorNodeConfig extends BaseNodeConfig {
  type: 'context-processor';
  /** 处理器名称 */
  processorName: string;
  /** 处理器配置 */
  processorConfig?: Record<string, unknown>;
}

/**
 * 节点配置联合类型
 * 使用 discriminated union 提供类型安全
 */
export type NodeConfig =
  | StartNodeConfig
  | EndNodeConfig
  | LLMNodeConfig
  | ToolCallNodeConfig
  | ConditionNodeConfig
  | DataTransformNodeConfig
  | ContextProcessorNodeConfig;

/**
 * 节点工厂类
 * 使用配置驱动的创建方式，提供统一的节点创建接口
 */
@injectable()
export class NodeFactory extends BaseService {
  constructor(@inject('Logger') logger: ILogger) {
    super(logger);
  }

  /**
   * 创建节点（通用方法）
   * @param config 节点配置
   * @returns 节点实例
   */
  create(config: NodeConfig): Node {
    const nodeId = config.id ? NodeId.fromString(config.id) : NodeId.generate();

    this.logger.debug('创建节点', { nodeType: config.type, nodeId: config.id });

    // 使用类型守卫根据 config.type 创建节点
    // TypeScript 的 exhaustiveness check 会确保我们处理了所有情况
    let node: Node;
    switch (config.type) {
      case 'start':
        node = this.createStartNode(nodeId, config);
        break;

      case 'end':
        node = this.createEndNode(nodeId, config);
        break;

      case 'llm':
        node = this.createLLMNode(nodeId, config);
        break;

      case 'tool':
      case 'tool-call':
        node = this.createToolCallNode(nodeId, config);
        break;

      case 'condition':
        node = this.createConditionNode(nodeId, config);
        break;

      case 'data-transform':
        node = this.createDataTransformNode(nodeId, config);
        break;

      case 'context-processor':
        node = this.createContextProcessorNode(nodeId, config);
        break;
    }

    // 应用重试策略配置
    if (config.retryStrategy) {
      const retryStrategy = NodeRetryStrategy.fromConfig(config.retryStrategy);
      return node.updateRetryStrategy(retryStrategy);
    }

    // 如果没有配置重试策略，使用节点类型的默认策略
    const defaultRetryStrategy = getDefaultRetryStrategy(this.parseNodeType(config.type));
    return node.updateRetryStrategy(defaultRetryStrategy);
  }

  /**
   * 解析节点类型
   * @param type 节点类型字符串
   * @returns 节点类型枚举值
   */
  private parseNodeType(type: string): NodeTypeValue {
    return NodeTypeConfig.getTypeByAlias(type);
  }

  /**
   * 创建开始节点
   */
  private createStartNode(id: NodeId, config: StartNodeConfig): StartNode {
    return new StartNode(
      id,
      config.initialVariables,
      config.initializeContext !== undefined ? config.initializeContext : true,
      config.name,
      config.description,
      config.position
    );
  }

  /**
   * 创建结束节点
   */
  private createEndNode(id: NodeId, config: EndNodeConfig): EndNode {
    return new EndNode(
      id,
      config.collectResults !== undefined ? config.collectResults : true,
      config.cleanupResources !== undefined ? config.cleanupResources : true,
      config.returnVariables,
      config.name,
      config.description,
      config.position
    );
  }

  /**
   * 创建LLM节点
   */
  private createLLMNode(id: NodeId, config: LLMNodeConfig): LLMNode {
    // 构建wrapper配置
    let wrapperConfig: WrapperConfig;

    if (config.wrapperConfig) {
      wrapperConfig = config.wrapperConfig;
    } else if (config.wrapper_type) {
      wrapperConfig = this.buildWrapperConfigFromParams(config);
    } else {
      throw new Error('LLM节点需要wrapperConfig配置');
    }

    return new LLMNode(
      id,
      wrapperConfig,
      config.prompt,
      config.systemPrompt,
      config.contextProcessorName || 'llm',
      config.temperature,
      config.maxTokens,
      config.stream || false,
      config.name,
      config.description,
      config.position
    );
  }

  /**
   * 从独立参数构建wrapper配置
   */
  private buildWrapperConfigFromParams(config: LLMNodeConfig): WrapperConfig {
    const wrapperConfig: WrapperConfig = {
      type: config.wrapper_type!,
    };

    if (config.wrapper_type === 'pool' || config.wrapper_type === 'group') {
      if (!config.wrapper_name) {
        throw new Error(`${config.wrapper_type}类型需要wrapper_name参数`);
      }
      wrapperConfig.name = config.wrapper_name;
    } else if (config.wrapper_type === 'direct') {
      if (!config.wrapper_provider) {
        throw new Error('direct类型需要wrapper_provider参数');
      }
      if (!config.wrapper_model) {
        throw new Error('direct类型需要wrapper_model参数');
      }
      wrapperConfig.provider = config.wrapper_provider;
      wrapperConfig.model = config.wrapper_model;
    }

    // 验证配置
    const validation = validateWrapperConfig(wrapperConfig);
    if (!validation.isValid) {
      throw new Error(`wrapper配置验证失败: ${validation.errors.join(', ')}`);
    }

    return wrapperConfig;
  }

  /**
   * 创建工具调用节点
   */
  private createToolCallNode(id: NodeId, config: ToolCallNodeConfig): ToolCallNode {
    return new ToolCallNode(
      id,
      config.toolName,
      config.toolParameters || {},
      config.timeout || 30000,
      config.name,
      config.description,
      config.position
    );
  }

  /**
   * 创建条件节点
   */
  private createConditionNode(id: NodeId, config: ConditionNodeConfig): ConditionNode {
    return new ConditionNode(
      id,
      config.condition,
      config.variables || {},
      config.name,
      config.description,
      config.position
    );
  }

  /**
   * 创建数据转换节点
   */
  private createDataTransformNode(id: NodeId, config: DataTransformNodeConfig): DataTransformNode {
    return new DataTransformNode(
      id,
      config.transformType,
      config.sourceData,
      config.targetVariable,
      config.transformConfig || {},
      config.name,
      config.description,
      config.position
    );
  }

  /**
   * 创建上下文处理器节点
   */
  private createContextProcessorNode(id: NodeId, config: ContextProcessorNodeConfig): ContextProcessorNode {
    return new ContextProcessorNode(
      id,
      config.processorName,
      config.processorConfig,
      config.name,
      config.description,
      config.position
    );
  }

  /**
   * 获取支持的节点类型列表
   * @returns 节点类型列表
   */
  getSupportedNodeTypes(): string[] {
    return NodeTypeConfig.getAllAliases();
  }

  /**
   * 获取节点类型映射信息
   * @param alias 类型别名
   * @returns 节点类型映射信息
   */
  getNodeTypeMapping(alias: string) {
    return NodeTypeConfig.getMapping(alias);
  }

  /**
   * 获取所有节点类型映射信息
   * @returns 所有节点类型映射信息
   */
  getAllNodeTypeMappings() {
    return NodeTypeConfig.getAllMappings();
  }

  protected getServiceName(): string {
    return '节点工厂';
  }
}