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

/**
 * 节点配置接口
 * 统一的节点配置接口，支持所有节点类型
 */
export interface NodeConfig {
  // 通用属性
  id?: string;
  type: string;
  name?: string;
  description?: string;
  position?: { x: number; y: number };

  // 开始节点配置
  initialVariables?: Record<string, unknown>;
  initializeContext?: boolean;

  // 结束节点配置
  collectResults?: boolean;
  cleanupResources?: boolean;
  returnVariables?: string[];

  // LLM节点配置
  wrapperConfig?: WrapperConfig;
  wrapper_type?: 'pool' | 'group' | 'direct';
  wrapper_name?: string;
  wrapper_provider?: string;
  wrapper_model?: string;
  prompt?: PromptSource;
  systemPrompt?: PromptSource;
  contextProcessorName?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;

  // 工具调用节点配置
  toolName?: string;
  toolParameters?: Record<string, unknown>;
  timeout?: number;

  // 条件节点配置
  condition?: string;
  variables?: Record<string, unknown>;

  // 数据转换节点配置
  transformType?: 'map' | 'filter' | 'reduce' | 'sort' | 'group';
  sourceData?: string;
  targetVariable?: string;
  transformConfig?: Record<string, unknown>;

  // 上下文处理器节点配置
  processorName?: string;
  processorConfig?: Record<string, unknown>;
}

/**
 * 节点工厂类
 * 使用配置驱动的创建方式，提供统一的节点创建接口
 */
@injectable()
export class NodeFactory extends BaseService {
  private readonly typeAliases: Map<string, NodeTypeValue>;

  constructor(@inject('Logger') logger: ILogger) {
    super(logger);

    // 初始化类型别名映射
    this.typeAliases = new Map<string, NodeTypeValue>([
      ['start', NodeTypeValue.START],
      ['end', NodeTypeValue.END],
      ['llm', NodeTypeValue.LLM],
      ['tool', NodeTypeValue.TOOL],
      ['tool-call', NodeTypeValue.TOOL],
      ['condition', NodeTypeValue.CONDITION],
      ['data-transform', NodeTypeValue.DATA_TRANSFORM],
      ['context-processor', NodeTypeValue.CONTEXT_PROCESSOR],
    ]);
  }

  /**
   * 创建节点（通用方法）
   * @param config 节点配置
   * @returns 节点实例
   */
  create(config: NodeConfig): Node {
    const nodeId = config.id ? NodeId.fromString(config.id) : NodeId.generate();
    const nodeType = this.parseNodeType(config.type);

    this.logger.debug('创建节点', { nodeType: config.type, nodeId: config.id });

    // 根据节点类型创建节点
    switch (nodeType) {
      case NodeTypeValue.START:
        return this.createStartNode(nodeId, config);

      case NodeTypeValue.END:
        return this.createEndNode(nodeId, config);

      case NodeTypeValue.LLM:
        return this.createLLMNode(nodeId, config);

      case NodeTypeValue.TOOL:
        return this.createToolCallNode(nodeId, config);

      case NodeTypeValue.CONDITION:
        return this.createConditionNode(nodeId, config);

      case NodeTypeValue.DATA_TRANSFORM:
        return this.createDataTransformNode(nodeId, config);

      case NodeTypeValue.CONTEXT_PROCESSOR:
        return this.createContextProcessorNode(nodeId, config);

      default:
        throw new Error(`不支持的节点类型: ${config.type}`);
    }
  }

  /**
   * 解析节点类型
   * @param type 节点类型字符串
   * @returns 节点类型枚举值
   */
  private parseNodeType(type: string): NodeTypeValue {
    const nodeType = this.typeAliases.get(type.toLowerCase());
    if (!nodeType) {
      throw new Error(`未知的节点类型: ${type}`);
    }
    return nodeType;
  }

  /**
   * 创建开始节点
   */
  private createStartNode(id: NodeId, config: NodeConfig): StartNode {
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
  private createEndNode(id: NodeId, config: NodeConfig): EndNode {
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
  private createLLMNode(id: NodeId, config: NodeConfig): LLMNode {
    if (!config.prompt) {
      throw new Error('LLM节点需要prompt配置');
    }

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
  private buildWrapperConfigFromParams(config: NodeConfig): WrapperConfig {
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
  private createToolCallNode(id: NodeId, config: NodeConfig): ToolCallNode {
    if (!config.toolName) {
      throw new Error('工具调用节点需要toolName配置');
    }

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
  private createConditionNode(id: NodeId, config: NodeConfig): ConditionNode {
    if (!config.condition) {
      throw new Error('条件节点需要condition配置');
    }

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
  private createDataTransformNode(id: NodeId, config: NodeConfig): DataTransformNode {
    if (!config.transformType) {
      throw new Error('数据转换节点需要transformType配置');
    }
    if (!config.sourceData) {
      throw new Error('数据转换节点需要sourceData配置');
    }
    if (!config.targetVariable) {
      throw new Error('数据转换节点需要targetVariable配置');
    }

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
  private createContextProcessorNode(id: NodeId, config: NodeConfig): ContextProcessorNode {
    if (!config.processorName) {
      throw new Error('上下文处理器节点需要processorName配置');
    }

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
    return Array.from(this.typeAliases.keys());
  }

  protected getServiceName(): string {
    return '节点工厂';
  }
}