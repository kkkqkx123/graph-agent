import { ValueObject } from '../../../common/value-objects';
import { EdgeId } from './edge-id';
import { EdgeType } from './edge-type';
import { NodeId } from '../node/node-id';
import { EdgeContextFilter } from '../context/edge-context-filter';
import { PromptContext } from '../context/prompt-context';
import { ExecutionContext } from '../../../threads/value-objects/execution-context';

/**
 * 边值对象属性接口
 */
export interface EdgeValueObjectProps {
  readonly id: EdgeId;
  readonly type: EdgeType;
  readonly fromNodeId: NodeId;
  readonly toNodeId: NodeId;
  readonly condition?: string;
  readonly weight?: number;
  readonly properties: Record<string, unknown>;
  readonly contextFilter: EdgeContextFilter;
}

/**
 * 边值对象
 * 封装边数据，提供类型安全和验证
 */
export class EdgeValueObject extends ValueObject<EdgeValueObjectProps> {
  /**
   * 创建边值对象
   */
  public static create(props: EdgeValueObjectProps): EdgeValueObject {
    // 验证
    if (!props.id) {
      throw new Error('边ID不能为空');
    }
    if (!props.type) {
      throw new Error('边类型不能为空');
    }
    if (!props.fromNodeId) {
      throw new Error('源节点ID不能为空');
    }
    if (!props.toNodeId) {
      throw new Error('目标节点ID不能为空');
    }
    if (!props.contextFilter) {
      throw new Error('边上下文过滤器不能为空');
    }

    return new EdgeValueObject(props);
  }

  /**
   * 获取边ID
   */
  public get id(): EdgeId {
    return this.props.id;
  }

  /**
   * 获取边类型
   */
  public get type(): EdgeType {
    return this.props.type;
  }

  /**
   * 获取源节点ID
   */
  public get fromNodeId(): NodeId {
    return this.props.fromNodeId;
  }

  /**
   * 获取目标节点ID
   */
  public get toNodeId(): NodeId {
    return this.props.toNodeId;
  }

  /**
   * 获取条件表达式
   */
  public get condition(): string | undefined {
    return this.props.condition;
  }

  /**
   * 获取权重
   */
  public get weight(): number | undefined {
    return this.props.weight;
  }

  /**
   * 获取边属性
   */
  public get properties(): Record<string, unknown> {
    return this.props.properties;
  }

  /**
   * 获取上下文过滤器
   */
  public get contextFilter(): EdgeContextFilter {
    return this.props.contextFilter;
  }

  /**
   * 获取条件表达式
   */
  public getConditionExpression(): string | undefined {
    return this.props.condition;
  }

  /**
   * 过滤上下文
   * @param context 提示词上下文
   * @returns 过滤后的提示词上下文
   */
  public filterContext(context: PromptContext): PromptContext {
    return this.props.contextFilter.applyFilter(context);
  }

  /**
   * 检查是否需要条件评估
   */
  public requiresConditionEvaluation(): boolean {
    return this.props.type.requiresConditionEvaluation();
  }

  /**
   * 检查是否为异常处理边
   */
  public isExceptionHandling(): boolean {
    return this.props.type.isExceptionHandling();
  }

  /**
   * 检查是否为正常流程边
   */
  public isNormalFlow(): boolean {
    return this.props.type.isNormalFlow();
  }

  /**
   * 检查是否为异步边
   */
  public isAsynchronous(): boolean {
    return this.props.type.isAsynchronous();
  }

  /**
   * 检查是否为顺序边
   */
  public isSequence(): boolean {
    return this.props.type.isSequence();
  }

  /**
   * 检查是否为条件边
   */
  public isConditional(): boolean {
    return this.props.type.isConditional();
  }

  /**
   * 检查是否为默认边
   */
  public isDefault(): boolean {
    return this.props.type.isDefault();
  }

  /**
   * 检查是否为错误边
   */
  public isError(): boolean {
    return this.props.type.isError();
  }

  /**
   * 检查是否为超时边
   */
  public isTimeout(): boolean {
    return this.props.type.isTimeout();
  }

  /**
   * 评估边的条件
   *
   * @param context 执行上下文
   * @param expressionEvaluator 表达式评估器（可选，用于测试）
   * @returns 评估结果
   */
  public async evaluateCondition(
    context: ExecutionContext,
    expressionEvaluator?: any
  ): Promise<{ satisfied: boolean; error?: string }> {
    // 如果不需要条件评估，默认满足
    if (!this.requiresConditionEvaluation()) {
      return { satisfied: true };
    }

    // 如果没有条件表达式，默认满足
    const condition = this.getConditionExpression();
    if (!condition) {
      return { satisfied: true };
    }

    try {
      // 使用提供的表达式评估器或默认的评估逻辑
      if (expressionEvaluator) {
        const result = await expressionEvaluator.evaluate(
          condition,
          Object.fromEntries(context.variables)
        );
        return {
          satisfied: result.success && Boolean(result.value),
          error: result.success ? undefined : result.error,
        };
      } else {
        // 简单的评估逻辑（可以后续替换为更复杂的实现）
        const variables = Object.fromEntries(context.variables);
        const result = this.evaluateSimpleCondition(condition, variables);
        return { satisfied: result };
      }
    } catch (error) {
      return {
        satisfied: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 简单的条件评估（内部方法）
   *
   * @param condition 条件表达式
   * @param variables 变量映射
   * @returns 评估结果
   */
  private evaluateSimpleCondition(condition: string, variables: Record<string, any>): boolean {
    try {
      // 创建安全的评估函数
      const func = new Function(
        'context',
        `
        'use strict';
        with(context) {
          try {
            return (${condition});
          } catch (error) {
            return false;
          }
        }
      `
      );
      return func(variables);
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取边的优先级
   * 根据边的权重和类型计算优先级
   *
   * @returns 优先级（数值越大优先级越高）
   */
  public getPriority(): number {
    let priority = 0;

    // 权重影响优先级
    if (this.props.weight !== undefined) {
      priority += this.props.weight;
    }

    // 边类型影响优先级
    const edgeType = this.props.type.toString();
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
   * 验证值对象的有效性
   */
  public override validate(): void {
    if (!this.props.id) {
      throw new Error('边ID不能为空');
    }
    if (!this.props.type) {
      throw new Error('边类型不能为空');
    }
    if (!this.props.fromNodeId) {
      throw new Error('源节点ID不能为空');
    }
    if (!this.props.toNodeId) {
      throw new Error('目标节点ID不能为空');
    }
    this.props.type.validate();
  }

  /**
   * 获取字符串表示
   */
  public override toString(): string {
    return `EdgeValueObject(id=${this.props.id.toString()}, type=${this.props.type.toString()}, from=${this.props.fromNodeId.toString()}, to=${this.props.toNodeId.toString()})`;
  }
}
