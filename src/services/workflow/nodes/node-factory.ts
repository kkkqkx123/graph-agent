import { injectable, inject } from 'inversify';
import { NodeId } from '../../../domain/workflow/value-objects/node/node-id';
import {
  NodeType,
  NodeContextTypeValue,
} from '../../../domain/workflow/value-objects/node/node-type';
import { Node } from '../../../domain/workflow/entities/node';
import { NodeStatus } from '../../../domain/workflow/value-objects/node/node-status';
import { Timestamp } from '../../../domain/common';
import { Version } from '../../../domain/common';
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
 */
export interface ContextProcessorFactoryConfig extends BaseNodeConfig {
  type: 'context-processor';
  /** 处理器名称 */
  processorName: string;
  /** 处理器配置 */
  processorConfig?: Record<string, unknown>;
}

/**
 * Fork节点配置
 */
export interface ForkNodeConfig extends BaseNodeConfig {
  type: 'fork';
  /** 分支配置 */
  branches: Array<{
    branchId: string;
    targetNodeId: string;
    name?: string;
    condition?: string;
  }>;
}

/**
 * Join节点配置
 */
export interface JoinNodeConfig extends BaseNodeConfig {
  type: 'join';
}

/**
 * SubWorkflow节点配置
 */
export interface SubWorkflowNodeConfig extends BaseNodeConfig {
  type: 'subworkflow';
  /** 引用ID */
  referenceId: string;
  /** 子工作流ID */
  workflowId: string;
  /** 版本 */
  version?: string;
  /** 输入映射 */
  inputMapping?: Record<string, string>;
  /** 输出映射 */
  outputMapping?: Record<string, string>;
}

/**
 * LoopStart节点配置
 */
export interface LoopStartNodeConfig extends BaseNodeConfig {
  type: 'loop-start';
  /** 循环变量名 */
  loopVariable?: string;
  /** 循环次数 */
  loopCount?: number;
  /** 循环条件 */
  loopCondition?: string;
}

/**
 * LoopEnd节点配置
 */
export interface LoopEndNodeConfig extends BaseNodeConfig {
  type: 'loop-end';
}

/**
 * 节点配置联合类型
 */
export type NodeConfig =
  | StartNodeConfig
  | EndNodeConfig
  | LLMNodeFactoryConfig
  | ToolNodeFactoryConfig
  | ConditionNodeConfig
  | DataTransformNodeConfig
  | ContextProcessorFactoryConfig
  | ForkNodeConfig
  | JoinNodeConfig
  | SubWorkflowNodeConfig
  | LoopStartNodeConfig
  | LoopEndNodeConfig;

/**
 * 节点工厂类
 * 统一创建 Node 实体，配置存储在 properties 中
 */
@injectable()
export class NodeFactory extends BaseService {
  constructor(@inject('Logger') logger: ILogger) {
    super(logger);
  }

  /**
   * 创建节点（通用方法）
   * @param config 节点配置
   * @returns Node 实体
   */
  create(config: NodeConfig): Node {
    const nodeId = config.id ? NodeId.fromString(config.id) : NodeId.generate();
    const now = Timestamp.now();

    this.logger.debug('创建节点', { nodeType: config.type, nodeId: config.id });

    // 根据 config.type 创建对应的 NodeType
    const nodeType = this.createNodeType(config);

    // 将配置转换为 properties
    const properties = this.configToProperties(config);

    // 创建 Node 实体
    const node = new Node({
      id: nodeId,
      type: nodeType,
      name: config.name || this.getDefaultNodeName(config.type),
      description: config.description || this.getDefaultNodeDescription(config.type),
      position: config.position,
      properties: properties,
      status: NodeStatus.pending(),
      retryStrategy: NodeRetryStrategy.disabled(),
      createdAt: now,
      updatedAt: now,
      version: Version.initial(),
    });

    // 应用重试策略配置
    if (config.retryStrategy) {
      const retryStrategy = NodeRetryStrategy.fromConfig(config.retryStrategy);
      return node.updateRetryStrategy(retryStrategy);
    }

    // 如果没有配置重试策略，使用节点类型的默认策略
    const defaultRetryStrategy = getDefaultRetryStrategy(nodeType.value);
    return node.updateRetryStrategy(defaultRetryStrategy);
  }

  /**
   * 创建 NodeType
   */
  private createNodeType(config: NodeConfig): NodeType {
    switch (config.type) {
      case 'start':
        return NodeType.start(NodeContextTypeValue.PASS_THROUGH);
      case 'end':
        return NodeType.end(NodeContextTypeValue.PASS_THROUGH);
      case 'llm':
        return NodeType.llm(NodeContextTypeValue.ISOLATE);
      case 'tool':
      case 'tool-call':
        return NodeType.tool(NodeContextTypeValue.ISOLATE);
      case 'condition':
        return NodeType.condition(NodeContextTypeValue.PASS_THROUGH);
      case 'data-transform':
        return NodeType.dataTransform(NodeContextTypeValue.PASS_THROUGH);
      case 'context-processor':
        return NodeType.contextProcessor(NodeContextTypeValue.PASS_THROUGH);
      case 'fork':
        return NodeType.fork(NodeContextTypeValue.ISOLATE);
      case 'join':
        return NodeType.join(NodeContextTypeValue.PASS_THROUGH);
      case 'subworkflow':
        return NodeType.subworkflow(NodeContextTypeValue.PASS_THROUGH);
      case 'loop-start':
        return NodeType.loopStart(NodeContextTypeValue.PASS_THROUGH);
      case 'loop-end':
        return NodeType.loopEnd(NodeContextTypeValue.PASS_THROUGH);
      default:
        throw new Error(`未知的节点类型: ${(config as any).type}`);
    }
  }

  /**
   * 将配置转换为 properties
   */
  private configToProperties(config: NodeConfig): Record<string, any> {
    switch (config.type) {
      case 'start':
        return {
          initialVariables: config.initialVariables || {},
          initializeContext: config.initializeContext !== undefined ? config.initializeContext : true,
        };

      case 'end':
        return {
          collectResults: config.collectResults !== undefined ? config.collectResults : true,
          cleanupResources: config.cleanupResources !== undefined ? config.cleanupResources : true,
          returnVariables: config.returnVariables || [],
        };

      case 'llm':
        return {
          wrapperConfig: config.wrapperConfig,
          wrapper_type: config.wrapper_type,
          wrapper_name: config.wrapper_name,
          wrapper_provider: config.wrapper_provider,
          wrapper_model: config.wrapper_model,
          prompt: this.extractPromptContent(config.prompt),
          systemPrompt: this.extractPromptContent(config.systemPrompt),
          contextProcessorName: config.contextProcessorName,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
          stream: config.stream,
          toolMode: config.toolMode,
          availableTools: config.availableTools,
          maxIterations: config.maxIterations,
        };

      case 'tool':
      case 'tool-call':
        return {
          toolName: config.toolName,
          toolParameters: config.toolParameters || {},
          timeout: config.timeout,
        };

      case 'condition':
        return {
          condition: config.condition,
          variables: config.variables || {},
        };

      case 'data-transform':
        return {
          transformType: config.transformType,
          sourceData: config.sourceData,
          targetVariable: config.targetVariable,
          transformConfig: config.transformConfig || {},
        };

      case 'context-processor':
        return {
          processorName: config.processorName,
          processorConfig: config.processorConfig || {},
        };

      case 'fork':
        return {
          branches: config.branches,
        };

      case 'join':
        return {};

      case 'subworkflow':
        return {
          referenceId: config.referenceId,
          workflowId: config.workflowId,
          version: config.version,
          inputMapping: config.inputMapping || {},
          outputMapping: config.outputMapping || {},
        };

      case 'loop-start':
        return {
          loopVariable: config.loopVariable,
          loopCount: config.loopCount,
          loopCondition: config.loopCondition,
        };

      case 'loop-end':
        return {};

      default:
        return {};
    }
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
   * 获取默认节点名称
   */
  private getDefaultNodeName(type: string): string {
    const names: Record<string, string> = {
      'start': 'Start',
      'end': 'End',
      'llm': 'LLM',
      'tool': 'Tool',
      'tool-call': 'Tool Call',
      'condition': 'Condition',
      'data-transform': 'Data Transform',
      'context-processor': 'Context Processor',
      'fork': 'Fork',
      'join': 'Join',
      'subworkflow': 'SubWorkflow',
      'loop-start': 'Loop Start',
      'loop-end': 'Loop End',
    };
    return names[type] || 'Unknown';
  }

  /**
   * 获取默认节点描述
   */
  private getDefaultNodeDescription(type: string): string {
    const descriptions: Record<string, string> = {
      'start': '工作流开始节点',
      'end': '工作流结束节点',
      'llm': 'LLM交互节点',
      'tool': '工具调用节点',
      'tool-call': '工具调用节点',
      'condition': '条件判断节点',
      'data-transform': '数据转换节点',
      'context-processor': '上下文处理器节点',
      'fork': '并行分支开始节点',
      'join': '并行分支合并节点',
      'subworkflow': '子工作流引用节点',
      'loop-start': '循环开始节点',
      'loop-end': '循环结束节点',
    };
    return descriptions[type] || '未知节点';
  }

  /**
   * 获取支持的节点类型列表
   */
  getSupportedNodeTypes(): string[] {
    return NodeTypeConfig.getAllAliases();
  }

  /**
   * 获取节点类型映射信息
   */
  getNodeTypeMapping(alias: string) {
    return NodeTypeConfig.getMapping(alias);
  }

  /**
   * 获取所有节点类型映射信息
   */
  getAllNodeTypeMappings() {
    return NodeTypeConfig.getAllMappings();
  }

  protected getServiceName(): string {
    return '节点工厂';
  }
}