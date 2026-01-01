import { NodeId } from '../../../domain/workflow/value-objects/node/node-id';
import { NodeTypeValue, NodeContextTypeValue } from '../../../domain/workflow/value-objects/node/node-type';
import { Node } from '../../../domain/workflow/entities/node';
import { LLMNode } from './llm-node';
import { ToolCallNode } from './tool-call-node';
import { ConditionNode } from './condition-node';
import { DataTransformNode } from './data-transform-node';
import { PromptSource } from '../../prompts/services/prompt-builder';
import { TransformFunctionRegistry } from '../functions/nodes/data-transformer';

/**
 * 节点配置接口
 * 统一的节点配置接口，支持所有节点类型
 */
export interface NodeConfig {
  // 通用属性
  id?: string;
  name?: string;
  description?: string;
  position?: { x: number; y: number };

  // LLM节点配置
  wrapperName?: string;
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
}

/**
 * 节点工厂类
 * 负责根据配置创建具体的节点实例
 */
export class NodeFactory {
  /**
   * 创建节点
   * @param type 节点类型
   * @param config 节点配置
   * @returns 节点实例
   */
  static createNode(type: NodeTypeValue, config: NodeConfig): Node {
    const nodeId = config.id ? NodeId.fromString(config.id) : NodeId.generate();

    switch (type) {
      case NodeTypeValue.LLM:
        return this.createLLMNode(nodeId, config);

      case NodeTypeValue.TOOL:
        return this.createToolCallNode(nodeId, config);

      case NodeTypeValue.CONDITION:
        return this.createConditionNode(nodeId, config);

      case NodeTypeValue.TASK:
        // 如果是TASK类型且有transformType，则创建数据转换节点
        if (config.transformType) {
          return this.createDataTransformNode(nodeId, config);
        }
        // 否则创建通用任务节点（暂未实现）
        throw new Error(`通用任务节点暂未实现`);

      default:
        throw new Error(`不支持的节点类型: ${type}`);
    }
  }

  /**
   * 创建LLM节点
   */
  private static createLLMNode(id: NodeId, config: NodeConfig): LLMNode {
    if (!config.wrapperName) {
      throw new Error('LLM节点需要wrapperName配置');
    }
    if (!config.prompt) {
      throw new Error('LLM节点需要prompt配置');
    }

    return new LLMNode(
      id,
      config.wrapperName,
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
   * 创建工具调用节点
   */
  private static createToolCallNode(id: NodeId, config: NodeConfig): ToolCallNode {
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
  private static createConditionNode(id: NodeId, config: NodeConfig): ConditionNode {
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
  private static createDataTransformNode(id: NodeId, config: NodeConfig): DataTransformNode {
    if (!config.transformType) {
      throw new Error('数据转换节点需要transformType配置');
    }
    if (!config.sourceData) {
      throw new Error('数据转换节点需要sourceData配置');
    }
    if (!config.targetVariable) {
      throw new Error('数据转换节点需要targetVariable配置');
    }

    // 创建转换函数注册表实例
    const transformRegistry = new TransformFunctionRegistry();

    return new DataTransformNode(
      id,
      config.transformType,
      config.sourceData,
      config.targetVariable,
      config.transformConfig || {},
      transformRegistry,
      config.name,
      config.description,
      config.position
    );
  }

  /**
   * 获取支持的节点类型列表
   */
  static getSupportedNodeTypes(): NodeTypeValue[] {
    return [
      NodeTypeValue.LLM,
      NodeTypeValue.TOOL,
      NodeTypeValue.CONDITION,
      NodeTypeValue.TASK
    ];
  }
}