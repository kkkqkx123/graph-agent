import { EdgeValueObject } from '../../../domain/workflow/value-objects/edge-value-object';
import { ExecutionContext } from '../../../domain/threads/value-objects/execution-context';

/**
 * 边评估结果接口
 */
export interface EdgeEvaluationResult {
  /** 边 */
  edge: EdgeValueObject;
  /** 是否满足条件 */
  satisfied: boolean;
  /** 错误信息 */
  error?: string;
  /** 评估耗时（毫秒） */
  duration: number;
}

/**
 * 边评估器
 *
 * 负责评估边的条件表达式，决定是否可以沿着边执行
 *
 * 属于基础设施层，提供技术性的条件评估支持
 */
export class EdgeEvaluator {
  /**
   * 评估单个边的条件
   *
   * @param edge 边
   * @param context 执行上下文
   * @returns 评估结果
   */
  public async evaluateEdge(
    edge: EdgeValueObject,
    context: ExecutionContext
  ): Promise<EdgeEvaluationResult> {
    const startTime = Date.now();

    // 如果没有条件，默认满足
    if (!edge.condition) {
      return {
        edge,
        satisfied: true,
        duration: Date.now() - startTime
      };
    }

    try {
      // 使用上下文中的变量评估条件
      const variables = context.variables;
      const result = this.evaluateCondition(edge.condition, variables);
      const satisfied = Boolean(result);

      return {
        edge,
        satisfied,
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        edge,
        satisfied: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * 批量评估边的条件
   *
   * @param edges 边列表
   * @param context 执行上下文
   * @returns 满足条件的边列表
   */
  public async evaluateEdges(
    edges: EdgeValueObject[],
    context: ExecutionContext
  ): Promise<EdgeEvaluationResult[]> {
    const results: EdgeEvaluationResult[] = [];

    for (const edge of edges) {
      const result = await this.evaluateEdge(edge, context);
      results.push(result);
    }

    return results;
  }

  /**
   * 获取满足条件的边
   *
   * @param edges 边列表
   * @param context 执行上下文
   * @returns 满足条件的边列表
   */
  public async getSatisfiedEdges(
    edges: EdgeValueObject[],
    context: ExecutionContext
  ): Promise<EdgeValueObject[]> {
    const results = await this.evaluateEdges(edges, context);
    return results.filter(result => result.satisfied).map(result => result.edge);
  }

  /**
   * 获取第一个满足条件的边
   *
   * @param edges 边列表
   * @param context 执行上下文
   * @returns 第一个满足条件的边，如果没有则返回null
   */
  public async getFirstSatisfiedEdge(
    edges: EdgeValueObject[],
    context: ExecutionContext
  ): Promise<EdgeValueObject | null> {
    for (const edge of edges) {
      const result = await this.evaluateEdge(edge, context);
      if (result.satisfied) {
        return edge;
      }
    }
    return null;
  }

  /**
   * 评估条件表达式
   *
   * @param condition 条件表达式
   * @param variables 变量映射
   * @returns 评估结果
   */
  private evaluateCondition(
    condition: string,
    variables: Map<string, unknown>
  ): unknown {
    try {
      // 将Map转换为普通对象
      const context = Object.fromEntries(variables);

      // 创建安全的评估函数
      // 使用Function构造器而不是eval，更安全
      const func = new Function('context', `
        'use strict';
        with(context) {
          try {
            return (${condition});
          } catch (error) {
            return false;
          }
        }
      `);

      return func(context);
    } catch (error) {
      throw new Error(`条件评估失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 验证条件表达式的语法
   *
   * @param condition 条件表达式
   * @returns 验证结果
   */
  public validateConditionSyntax(condition: string): { valid: boolean; error?: string } {
    try {
      // 尝试创建函数来验证语法
      const func = new Function('context', `with(context) { return (${condition}); }`);
      func({});
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 获取条件表达式中使用的变量名
   *
   * @param condition 条件表达式
   * @returns 变量名列表
   */
  public extractVariableNames(condition: string): string[] {
    const variableNames = new Set<string>();

    // 简单的正则表达式匹配变量名
    // 匹配不以数字开头的字母、数字、下划线组合
    const regex = /\b[a-zA-Z_][a-zA-Z0-9_]*\b/g;
    let match;

    while ((match = regex.exec(condition)) !== null) {
      const variableName = match[0];
      // 排除JavaScript关键字
      if (!this.isJavaScriptKeyword(variableName)) {
        variableNames.add(variableName);
      }
    }

    return Array.from(variableNames);
  }

  /**
   * 检查是否为JavaScript关键字
   *
   * @param name 名称
   * @returns 是否为关键字
   */
  private isJavaScriptKeyword(name: string): boolean {
    const keywords = [
      'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger',
      'default', 'delete', 'do', 'else', 'enum', 'export', 'extends',
      'false', 'finally', 'for', 'function', 'if', 'import', 'in',
      'instanceof', 'new', 'null', 'return', 'super', 'switch', 'this',
      'throw', 'true', 'try', 'typeof', 'var', 'void', 'while', 'with',
      'yield', 'let', 'static', 'async', 'await', 'of', 'undefined'
    ];
    return keywords.includes(name);
  }

  /**
   * 检查条件表达式是否依赖指定的变量
   *
   * @param condition 条件表达式
   * @param variableName 变量名
   * @returns 是否依赖该变量
   */
  public dependsOnVariable(condition: string, variableName: string): boolean {
    const variableNames = this.extractVariableNames(condition);
    return variableNames.includes(variableName);
  }

  /**
   * 获取边的优先级
   * 根据边的权重和类型计算优先级
   *
   * @param edge 边
   * @returns 优先级（数值越大优先级越高）
   */
  public getEdgePriority(edge: EdgeValueObject): number {
    let priority = 0;

    // 权重影响优先级
    if (edge.weight !== undefined) {
      priority += edge.weight;
    }

    // 边类型影响优先级
    // 可以根据业务需求调整
    const edgeType = edge.type.toString();
    switch (edgeType) {
      case 'default':
        priority += 10;
        break;
      case 'conditional':
        priority += 20;
        break;
      case 'error':
        priority += 30;
        break;
      default:
        priority += 10;
    }

    return priority;
  }

  /**
   * 对边按优先级排序
   *
   * @param edges 边列表
   * @returns 排序后的边列表
   */
  public sortEdgesByPriority(edges: EdgeValueObject[]): EdgeValueObject[] {
    return [...edges].sort((a, b) => {
      const priorityA = this.getEdgePriority(a);
      const priorityB = this.getEdgePriority(b);
      return priorityB - priorityA; // 降序排列
    });
  }
}