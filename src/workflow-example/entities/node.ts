/**
 * 节点实体实现
 * 
 * 本文件实现了图工作流中的节点实体
 */

import {
  NodeId,
  NodeType,
  NodeStatus,
  NodeConfig,
  createNodeId
} from '../types/workflow-types';

/**
 * 节点实体类
 */
export class NodeImpl {
  private _id: NodeId;
  private _type: NodeType;
  private _name: string;
  private _description: string | undefined;
  private _config: NodeConfig;
  private _status: NodeStatus;

  constructor(
    id: string,
    type: NodeType,
    name: string,
    config: NodeConfig = {},
    description?: string
  ) {
    this._id = createNodeId(id);
    this._type = type;
    this._name = name;
    this._description = description;
    this._config = { ...config };
    this._status = NodeStatus.PENDING;
  }

  /**
   * 获取节点ID
   */
  get id(): NodeId {
    return this._id;
  }

  /**
   * 获取节点类型
   */
  get type(): NodeType {
    return this._type;
  }

  /**
   * 获取节点名称
   */
  get name(): string {
    return this._name;
  }

  /**
   * 获取节点描述
   */
  get description(): string | undefined {
    return this._description;
  }

  /**
   * 获取节点配置
   */
  get config(): NodeConfig {
    return { ...this._config };
  }

  /**
   * 获取节点状态
   */
  get status(): NodeStatus {
    return this._status;
  }

  /**
   * 更新节点状态
   */
  updateStatus(status: NodeStatus): void {
    this._status = status;
  }

  /**
   * 获取输入Schema
   * 根据节点类型返回不同的输入Schema
   */
  getInputSchema(): Record<string, any> {
    switch (this._type) {
      case NodeType.LLM:
        return {
          type: 'object',
          properties: {
            text: { type: 'string', description: '输入文本' },
            prompt: { type: 'string', description: '提示词模板' }
          },
          required: ['text']
        };

      case NodeType.TOOL:
        return {
          type: 'object',
          properties: {
            toolName: { type: 'string', description: '工具名称' },
            parameters: { type: 'object', description: '工具参数' }
          },
          required: ['toolName']
        };

      case NodeType.CONDITION:
        return {
          type: 'object',
          properties: {
            condition: { type: 'string', description: '条件表达式' },
            data: { type: 'object', description: '评估数据' }
          },
          required: ['condition', 'data']
        };

      case NodeType.TRANSFORM:
        return {
          type: 'object',
          properties: {
            input: { type: 'any', description: '输入数据' },
            transformRules: { type: 'object', description: '转换规则' }
          },
          required: ['input', 'transformRules']
        };

      case NodeType.START:
        return {
          type: 'object',
          properties: {
            input: { type: 'any', description: '工作流输入' }
          },
          required: ['input']
        };

      case NodeType.END:
        return {
          type: 'object',
          properties: {
            result: { type: 'any', description: '工作流结果' }
          },
          required: ['result']
        };

      default:
        return {
          type: 'object',
          properties: {},
          required: []
        };
    }
  }

  /**
   * 获取输出Schema
   * 根据节点类型返回不同的输出Schema
   */
  getOutputSchema(): Record<string, any> {
    switch (this._type) {
      case NodeType.LLM:
        return {
          type: 'object',
          properties: {
            response: { type: 'string', description: 'LLM响应' },
            model: { type: 'string', description: '使用的模型' },
            tokens: { type: 'number', description: '使用的token数' }
          }
        };

      case NodeType.TOOL:
        return {
          type: 'object',
          properties: {
            result: { type: 'any', description: '工具执行结果' },
            executionTime: { type: 'number', description: '执行时间(ms)' }
          }
        };

      case NodeType.CONDITION:
        return {
          type: 'object',
          properties: {
            result: { type: 'boolean', description: '条件评估结果' },
            evaluatedExpression: { type: 'string', description: '评估的表达式' }
          }
        };

      case NodeType.TRANSFORM:
        return {
          type: 'object',
          properties: {
            output: { type: 'any', description: '转换后的数据' }
          }
        };

      case NodeType.START:
        return {
          type: 'object',
          properties: {
            text: { type: 'string', description: '输入文本' }
          }
        };

      case NodeType.END:
        return {
          type: 'object',
          properties: {
            success: { type: 'boolean', description: '执行是否成功' },
            data: { type: 'any', description: '最终数据' }
          }
        };

      default:
        return {
          type: 'object',
          properties: {},
          required: []
        };
    }
  }

  /**
   * 转换为字符串表示
   */
  toString(): string {
    return `Node(id=${this._id}, type=${this._type}, name=${this._name}, status=${this._status})`;
  }
}

/**
 * 创建节点的工厂函数
 */
export function createNode(
  id: string,
  type: NodeType,
  name: string,
  config?: NodeConfig,
  description?: string
): NodeImpl {
  return new NodeImpl(id, type, name, config, description);
}

/**
 * 创建LLM节点
 */
export function createLLMNode(
  id: string,
  name: string,
  config: NodeConfig,
  description?: string
): NodeImpl {
  return new NodeImpl(id, NodeType.LLM, name, config, description);
}

/**
 * 创建工具节点
 */
export function createToolNode(
  id: string,
  name: string,
  config: NodeConfig,
  description?: string
): NodeImpl {
  return new NodeImpl(id, NodeType.TOOL, name, config, description);
}

/**
 * 创建条件节点
 */
export function createConditionNode(
  id: string,
  name: string,
  config: NodeConfig,
  description?: string
): NodeImpl {
  return new NodeImpl(id, NodeType.CONDITION, name, config, description);
}

/**
 * 创建转换节点
 */
export function createTransformNode(
  id: string,
  name: string,
  config: NodeConfig,
  description?: string
): NodeImpl {
  return new NodeImpl(id, NodeType.TRANSFORM, name, config, description);
}

/**
 * 创建开始节点
 */
export function createStartNode(
  id: string,
  name: string,
  config?: NodeConfig,
  description?: string
): NodeImpl {
  return new NodeImpl(id, NodeType.START, name, config, description);
}

/**
 * 创建结束节点
 */
export function createEndNode(
  id: string,
  name: string,
  config?: NodeConfig,
  description?: string
): NodeImpl {
  return new NodeImpl(id, NodeType.END, name, config, description);
}

export { NodeType, NodeStatus };
