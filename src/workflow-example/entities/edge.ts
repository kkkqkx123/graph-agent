/**
 * 边实体实现
 * 
 * 本文件实现了图工作流中的边实体，使用函数式编程风格
 */

import {
  EdgeId,
  EdgeType,
  EdgeCondition,
  EdgeConfig,
  createEdgeId,
  ExecutionContext,
  EdgeFunction,
  ConditionOperator
} from '../types/workflow-types';

import { getEdgeFunction } from '../functions/edges/edge-functions';

/**
 * 边实体类
 */
export class EdgeImpl {
  private _id: EdgeId;
  private _type: EdgeType;
  private _fromNodeId: string;
  private _toNodeId: string;
  private _config: EdgeConfig;
  private _weight: number;
  private _condition?: EdgeCondition;

  constructor(
    id: string,
    type: EdgeType,
    fromNodeId: string,
    toNodeId: string,
    config: EdgeConfig = {},
    weight: number = 1
  ) {
    this._id = createEdgeId(id);
    this._type = type;
    this._fromNodeId = fromNodeId;
    this._toNodeId = toNodeId;
    this._config = { ...config };
    this._weight = weight;
    
    // 如果是条件边且配置中有表达式，创建条件对象
    if (type === EdgeType.CONDITIONAL && config.expression) {
      this._condition = {
        expression: config.expression,
        operator: (config.operator as ConditionOperator) || ConditionOperator.EQUALS,
        expectedValue: config.expectedValue
      };
    }
  }

  /**
   * 获取边ID
   */
  get id(): EdgeId {
    return this._id;
  }

  /**
   * 获取边类型
   */
  get type(): EdgeType {
    return this._type;
  }

  /**
   * 获取源节点ID
   */
  get fromNodeId(): string {
    return this._fromNodeId;
  }

  /**
   * 获取目标节点ID
   */
  get toNodeId(): string {
    return this._toNodeId;
  }

  /**
   * 获取配置
   */
  get config(): EdgeConfig {
    return { ...this._config };
  }

  /**
   * 获取权重
   */
  get weight(): number {
    return this._weight;
  }

  /**
   * 获取条件
   */
  get condition(): EdgeCondition | undefined {
    return this._condition;
  }

  /**
   * 获取条件表达式
   */
  getConditionExpression(): string | undefined {
    return this._config.expression;
  }

  /**
   * 获取输入Schema
   * 根据边类型返回不同的输入Schema
   */
  getInputSchema(): Record<string, any> {
    switch (this._type) {
      case EdgeType.DIRECT:
        return {
          type: 'object',
          properties: {
            fromNodeId: { type: 'string', description: '源节点ID' },
            toNodeId: { type: 'string', description: '目标节点ID' }
          },
          required: ['fromNodeId', 'toNodeId']
        };

      case EdgeType.CONDITIONAL:
        return {
          type: 'object',
          properties: {
            fromNodeId: { type: 'string', description: '源节点ID' },
            toNodeId: { type: 'string', description: '目标节点ID' },
            expression: { type: 'string', description: '条件表达式' },
            operator: { type: 'string', description: '运算符' },
            expectedValue: { type: 'any', description: '期望值' }
          },
          required: ['fromNodeId', 'toNodeId', 'expression', 'operator']
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
   * 根据边类型返回不同的输出Schema
   */
  getOutputSchema(): Record<string, any> {
    return {
      type: 'object',
      properties: {
        canTraverse: { type: 'boolean', description: '是否可以遍历' },
        reason: { type: 'string', description: '原因说明' },
        metadata: { type: 'object', description: '元数据' }
      },
      required: ['canTraverse', 'reason']
    };
  }

  /**
   * 评估边条件
   * 使用函数式编程风格，调用对应的边函数
   * 
   * @param context 执行上下文
   * @returns 条件是否满足
   */
  async evaluateCondition(context: ExecutionContext): Promise<boolean> {
    try {
      // 获取边函数
      const edgeFunction: EdgeFunction | undefined = getEdgeFunction(this._type.toString());

      if (!edgeFunction) {
        console.warn(`未找到边类型 ${this._type} 的函数，使用默认行为`);
        // 默认行为：直接边总是返回true
        return this._type === EdgeType.DIRECT;
      }

      // 准备输入
      const input = {
        fromNodeId: this._fromNodeId,
        toNodeId: this._toNodeId
      };

      // 调用边函数
      const output = await edgeFunction(input, this._config, context);

      return output.canTraverse;
    } catch (error) {
      console.error(`评估边条件失败: ${this._id}`, error);
      return false;
    }
  }

  /**
   * 转换为字符串表示
   */
  toString(): string {
    const configStr = Object.keys(this._config).length > 0
      ? `, config=${JSON.stringify(this._config)}`
      : '';
    return `Edge(id=${this._id}, type=${this._type}, from=${this._fromNodeId}, to=${this._toNodeId}, weight=${this._weight}${configStr})`;
  }
}

/**
 * 创建边的工厂函数
 */
export function createEdge(
  id: string,
  type: EdgeType,
  fromNodeId: string,
  toNodeId: string,
  config?: EdgeConfig,
  weight?: number
): EdgeImpl {
  return new EdgeImpl(id, type, fromNodeId, toNodeId, config, weight);
}

/**
 * 创建直接边
 */
export function createDirectEdge(
  id: string,
  fromNodeId: string,
  toNodeId: string,
  weight: number = 1
): EdgeImpl {
  return new EdgeImpl(id, EdgeType.DIRECT, fromNodeId, toNodeId, {}, weight);
}

/**
 * 创建条件边
 */
export function createConditionalEdge(
  id: string,
  fromNodeId: string,
  toNodeId: string,
  config: EdgeConfig,
  weight: number = 1
): EdgeImpl {
  return new EdgeImpl(id, EdgeType.CONDITIONAL, fromNodeId, toNodeId, config, weight);
}

/**
 * 创建权重边
 */
export function createWeightedEdge(
  id: string,
  fromNodeId: string,
  toNodeId: string,
  weight: number
): EdgeImpl {
  return new EdgeImpl(id, EdgeType.DIRECT, fromNodeId, toNodeId, { weight }, weight);
}

export { EdgeType };