import { injectable, inject } from 'inversify';
import { NodeId } from '../../../domain/workflow/value-objects/node/node-id';
import {
  NodeTypeValue,
  NodeContextTypeValue,
} from '../../../domain/workflow/value-objects/node/node-type';
import { Node } from '../../../domain/workflow/entities/node';
import { PlaceholderNode } from '../../../domain/workflow/value-objects/node/placeholder-node';
import { ConditionNode } from './condition-node';
import { DataTransformNode } from './data-transform-node';
import { StartNode } from './start-node';
import { EndNode } from './end-node';
import { PromptSource } from '../../prompts/prompt-builder';
import {
  WrapperConfig,
  validateWrapperConfig
} from '../../../domain/llm/value-objects/wrapper-reference';
import { ILogger } from '../../../domain/common';
import { BaseService } from '../../common/base-service';
import { NodeTypeConfig } from './node-type-config';
import { NodeRetryStrategy } from '../../../domain/workflow/value-objects/node/node-retry-strategy';
import { getDefaultRetryStrategy } from '../../../domain/workflow/value-objects/node/node-retry-defaults';

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
 * LLM节点工厂配置
 *
 * 注意：这是工厂配置接口，用于从外部配置创建节点
 * 实际的节点配置使用 LLMNodeConfig 值对象
 */
export interface LLMNodeFactoryConfig extends BaseNodeConfig {
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
  /** 工具调用模式 */
  toolMode?: 'none' | 'auto' | 'required';
  /** 可用工具列表 */
  availableTools?: string[];
  /** 最大迭代次数 */
  maxIterations?: number;
}

/**
 * 工具节点工厂配置
 *
 * 注意：这是工厂配置接口，用于从外部配置创建节点
 * 实际的节点配置使用 ToolNodeConfig 值对象
 */
export interface ToolNodeFactoryConfig extends BaseNodeConfig {
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
 * 上下文处理器节点工厂配置
 *
 * 注意：这是工厂配置接口，用于从外部配置创建节点
 * 实际的节点配置使用 ContextProcessorConfig 值对象
 */
export interface ContextProcessorFactoryConfig extends BaseNodeConfig {
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
  | LLMNodeFactoryConfig
  | ToolNodeFactoryConfig
  | ConditionNodeConfig
  | DataTransformNodeConfig
  | ContextProcessorFactoryConfig;

/**
 * 节点创建结果联合类型
 * 可以是 Node 实体或 PlaceholderNode 值对象
 */
export type NodeCreationResult = Node | PlaceholderNode;

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
   * @returns 节点实例或占位符节点
   */
  create(config: NodeConfig): NodeCreationResult {
    const nodeId = config.id ? NodeId.fromString(config.id) : NodeId.generate();

    this.logger.debug('创建节点', { nodeType: config.type, nodeId: config.id });

    // 使用类型守卫根据 config.type 创建节点
    // TypeScript 的 exhaustiveness check 会确保我们处理了所有情况
    let result: NodeCreationResult;
    switch (config.type) {
      case 'start':
        result = this.createStartNode(nodeId, config);
        break;

      case 'end':
        result = this.createEndNode(nodeId, config);
        break;

      case 'llm':
        result = this.createLLMPlaceholder(nodeId, config);
        break;

      case 'tool':
      case 'tool-call':
        result = this.createToolPlaceholder(nodeId, config);
        break;

      case 'condition':
        result = this.createConditionNode(nodeId, config);
        break;

      case 'data-transform':
        result = this.createDataTransformNode(nodeId, config);
        break;

      case 'context-processor':
        result = this.createContextProcessorPlaceholder(nodeId, config);
        break;
    }

    // 对于 Node 类型，应用重试策略配置
    if (result instanceof Node) {
      if (config.retryStrategy) {
        const retryStrategy = NodeRetryStrategy.fromConfig(config.retryStrategy);
        return result.updateRetryStrategy(retryStrategy);
      }

      // 如果没有配置重试策略，使用节点类型的默认策略
      const defaultRetryStrategy = getDefaultRetryStrategy(this.parseNodeType(config.type));
      return result.updateRetryStrategy(defaultRetryStrategy);
    }

    // PlaceholderNode 不需要重试策略
    return result;
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
   * 创建LLM占位符节点
   */
  private createLLMPlaceholder(id: NodeId, config: LLMNodeFactoryConfig): PlaceholderNode {
    const llmConfig = {
      provider: config.wrapper_provider || config.wrapper_name || 'default',
      model: config.wrapper_model || config.wrapper_name || 'default',
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      systemPrompt: this.extractPromptContent(config.systemPrompt),
      userPrompt: this.extractPromptContent(config.prompt),
      stream: config.stream,
      toolMode: config.toolMode,
      availableTools: config.availableTools,
      maxIterations: config.maxIterations
    };

    return PlaceholderNode.llm(id, llmConfig, config.name, config.description);
  }

  /**
   * 从 PromptSource 提取内容
   */
  private extractPromptContent(promptSource?: PromptSource): string {
    if (!promptSource) {
      return '';
    }
    
    if (promptSource.type === 'direct') {
      return promptSource.content;
    } else if (promptSource.type === 'template') {
      // 对于模板类型，返回模板标识
      return `${promptSource.category}:${promptSource.name}`;
    }
    
    return '';
  }

  /**
   * 创建工具占位符节点
   */
  private createToolPlaceholder(id: NodeId, config: ToolNodeFactoryConfig): PlaceholderNode {
    const toolConfig = {
      toolName: config.toolName,
      parameters: config.toolParameters || {},
      timeout: config.timeout
    };

    return PlaceholderNode.tool(id, toolConfig, config.name, config.description);
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
   * 创建上下文处理器占位符节点
   */
  private createContextProcessorPlaceholder(id: NodeId, config: ContextProcessorFactoryConfig): PlaceholderNode {
    const contextProcessorConfig = {
      processorName: config.processorName,
      processorConfig: config.processorConfig
    };

    return PlaceholderNode.contextProcessor(id, contextProcessorConfig, config.name, config.description);
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