/**
 * 边实体实现
 * 
 * 本文件实现了图工作流中的边实体
 */

import {
  EdgeId,
  EdgeType,
  ConditionOperator,
  EdgeCondition,
  createEdgeId,
  ExecutionContext
} from '../types/workflow-types';

/**
 * 边实体类
 */
export class EdgeImpl {
  private _id: EdgeId;
  private _type: EdgeType;
  private _fromNodeId: string;
  private _toNodeId: string;
  private _condition: EdgeCondition | undefined;
  private _weight: number;

  constructor(
    id: string,
    type: EdgeType,
    fromNodeId: string,
    toNodeId: string,
    weight: number = 1,
    condition?: EdgeCondition
  ) {
    this._id = createEdgeId(id);
    this._type = type;
    this._fromNodeId = fromNodeId;
    this._toNodeId = toNodeId;
    this._weight = weight;
    this._condition = condition;
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
   * 获取条件
   */
  get condition(): EdgeCondition | undefined {
    return this._condition;
  }

  /**
   * 获取权重
   */
  get weight(): number {
    return this._weight;
  }

  /**
   * 获取条件表达式
   */
  getConditionExpression(): string | undefined {
    return this._condition?.expression;
  }

  /**
   * 评估边条件
   * 
   * @param context 执行上下文
   * @returns 条件是否满足
   */
  async evaluateCondition(context: ExecutionContext): Promise<boolean> {
    // 如果是直接边，总是返回true
    if (this._type === EdgeType.DIRECT) {
      return true;
    }

    // 如果没有条件，返回true
    if (!this._condition) {
      return true;
    }

    try {
      // 获取所有上下文数据
      const data = context.getAllData();

      // 评估表达式
      const result = this.evaluateExpression(this._condition.expression, data);

      // 根据运算符进行比较
      return this.compareWithOperator(result, this._condition.operator, this._condition.expectedValue);
    } catch (error) {
      console.error(`评估边条件失败: ${this._id}`, error);
      return false;
    }
  }

  /**
   * 评估表达式
   * 
   * @param expression 表达式字符串
   * @param data 上下文数据
   * @returns 评估结果
   */
  private evaluateExpression(expression: string, data: Record<string, any>): any {
    // 替换变量占位符 {{variable.path}}
    const processedExpr = this.replacePlaceholders(expression, data);

    // 简单表达式求值
    return this.safeEvaluate(processedExpr);
  }

  /**
   * 替换变量占位符
   * 
   * @param expression 表达式
   * @param data 数据
   * @returns 替换后的表达式
   */
  private replacePlaceholders(expression: string, data: Record<string, any>): string {
    // 匹配 {{path}} 格式的占位符
    const placeholderRegex = /\{\{([^}]+)\}\}/g;

    return expression.replace(placeholderRegex, (match, path) => {
      const value = this.getValueByPath(data, path.trim());
      return this.valueToString(value);
    });
  }

  /**
   * 根据路径获取值
   * 
   * @param data 数据对象
   * @param path 路径，如 "node.result.success"
   * @returns 路径对应的值
   */
  private getValueByPath(data: Record<string, any>, path: string): any {
    const parts = path.split('.');
    let current: any = data;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }

  /**
   * 将值转换为字符串
   * 
   * @param value 值
   * @returns 字符串表示
   */
  private valueToString(value: any): string {
    if (value === null || value === undefined) {
      return 'null';
    }
    if (typeof value === 'string') {
      return `'${value}'`;
    }
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }
    if (typeof value === 'number') {
      return String(value);
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  /**
   * 安全求值
   * 只支持简单的比较表达式，不支持任意代码执行
   * 
   * @param expression 表达式
   * @returns 求值结果
   */
  private safeEvaluate(expression: string): any {
    // 移除所有空白字符
    const trimmed = expression.trim();

    // 如果是布尔值
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    if (trimmed === 'null') return null;

    // 如果是数字
    if (/^-?\d+\.?\d*$/.test(trimmed)) {
      return Number(trimmed);
    }

    // 如果是字符串（带引号）
    if ((trimmed.startsWith("'") && trimmed.endsWith("'")) ||
      (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
      return trimmed.slice(1, -1);
    }

    // 如果是简单的比较表达式
    const comparisonRegex = /^(.+?)\s*(==|!=|>=|<=|>|<)\s*(.+)$/;
    const match = trimmed.match(comparisonRegex);

    if (match && match.length >= 4 && match[1] && match[2] && match[3]) {
      const left = match[1];
      const operator = match[2];
      const right = match[3];
      const leftValue = this.parseValue(left);
      const rightValue = this.parseValue(right);

      switch (operator) {
        case '==':
          return leftValue == rightValue;
        case '!=':
          return leftValue != rightValue;
        case '>=':
          return leftValue >= rightValue;
        case '<=':
          return leftValue <= rightValue;
        case '>':
          return leftValue > rightValue;
        case '<':
          return leftValue < rightValue;
        default:
          return false;
      }
    }

    // 默认返回原始值
    return trimmed;
  }

  /**
   * 解析值
   * 
   * @param str 字符串
   * @returns 解析后的值
   */
  private parseValue(str: string): any {
    const trimmed = str.trim();

    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    if (trimmed === 'null') return null;

    if (/^-?\d+\.?\d*$/.test(trimmed)) {
      return Number(trimmed);
    }

    if ((trimmed.startsWith("'") && trimmed.endsWith("'")) ||
      (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
      return trimmed.slice(1, -1);
    }

    return trimmed;
  }

  /**
   * 使用运算符比较值
   * 
   * @param actual 实际值
   * @param operator 运算符
   * @param expected 期望值
   * @returns 比较结果
   */
  private compareWithOperator(
    actual: any,
    operator: ConditionOperator,
    expected?: any
  ): boolean {
    switch (operator) {
      case ConditionOperator.EQUALS:
        return actual == expected;

      case ConditionOperator.NOT_EQUALS:
        return actual != expected;

      case ConditionOperator.GREATER_THAN:
        return actual > expected;

      case ConditionOperator.LESS_THAN:
        return actual < expected;

      case ConditionOperator.GREATER_EQUALS:
        return actual >= expected;

      case ConditionOperator.LESS_EQUALS:
        return actual <= expected;

      case ConditionOperator.EXISTS:
        return actual !== null && actual !== undefined;

      case ConditionOperator.NOT_EXISTS:
        return actual === null || actual === undefined;

      default:
        return false;
    }
  }

  /**
   * 转换为字符串表示
   */
  toString(): string {
    const conditionStr = this._condition
      ? `, condition=${this._condition.expression}`
      : '';
    return `Edge(id=${this._id}, type=${this._type}, from=${this._fromNodeId}, to=${this._toNodeId}, weight=${this._weight}${conditionStr})`;
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
  weight?: number,
  condition?: EdgeCondition
): EdgeImpl {
  return new EdgeImpl(id, type, fromNodeId, toNodeId, weight, condition);
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
  return new EdgeImpl(id, EdgeType.DIRECT, fromNodeId, toNodeId, weight);
}

/**
 * 创建条件边
 */
export function createConditionalEdge(
  id: string,
  fromNodeId: string,
  toNodeId: string,
  condition: EdgeCondition,
  weight: number = 1
): EdgeImpl {
  return new EdgeImpl(id, EdgeType.CONDITIONAL, fromNodeId, toNodeId, weight, condition);
}

export { EdgeType, ConditionOperator };
