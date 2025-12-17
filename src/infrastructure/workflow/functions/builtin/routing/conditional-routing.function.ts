import { injectable } from 'inversify';
import { IRoutingFunction, WorkflowFunctionType } from '../../../../../domain/workflow/interfaces/workflow-functions';
import { BaseWorkflowFunction } from '../../base/base-workflow-function';
import { ExpressionEvaluator } from '../../common/expression-evaluator';

/**
 * 条件路由函数
 * 基于配置的条件数组进行路由决策，支持复杂的条件组合和表达式评估
 */
@injectable()
export class ConditionalRoutingFunction extends BaseWorkflowFunction implements IRoutingFunction {
  constructor() {
    super(
      'route:conditional',
      'conditional_routing',
      '基于条件结果进行路由决策，支持复杂的条件组合和表达式评估',
      '1.0.0',
      WorkflowFunctionType.ROUTING,
      false
    );
  }

  override getParameters() {
    return [
      ...super.getParameters(),
      {
        name: 'conditions',
        type: 'array',
        required: true,
        description: '条件数组，每个条件包含name、value、operator、targetNodeId',
        defaultValue: []
      },
      {
        name: 'defaultNodeId',
        type: 'string',
        required: false,
        description: '默认节点ID，当所有条件都不匹配时使用',
        defaultValue: 'default'
      },
      {
        name: 'matchMode',
        type: 'string',
        required: false,
        description: '匹配模式：first（第一个匹配）、all（所有匹配）、any（任意匹配）',
        defaultValue: 'first'
      }
    ];
  }

  protected override validateCustomConfig(config: any): string[] {
    const errors: string[] = [];

    // 验证conditions数组
    if (config.conditions && !Array.isArray(config.conditions)) {
      errors.push('conditions必须是数组类型');
    }

    // 验证每个条件的结构
    if (Array.isArray(config.conditions)) {
      config.conditions.forEach((condition: any, index: number) => {
        if (!condition.name) {
          errors.push(`条件[${index}]缺少name字段`);
        }
        if (!condition.targetNodeId) {
          errors.push(`条件[${index}]缺少targetNodeId字段`);
        }
        if (condition.operator && !this.isValidOperator(condition.operator)) {
          errors.push(`条件[${index}]包含无效的操作符: ${condition.operator}`);
        }
      });
    }

    // 验证matchMode
    if (config.matchMode && !['first', 'all', 'any'].includes(config.matchMode)) {
      errors.push('matchMode必须是first、all或any之一');
    }

    return errors;
  }

  private isValidOperator(operator: string): boolean {
    const validOperators = ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_equal', 'less_equal', 'contains', 'not_contains'];
    return validOperators.includes(operator);
  }

  async route(context: any, config: any): Promise<string | string[]> {
    this.checkInitialized();

    const conditions = config.conditions || [];
    const defaultNodeId = config.defaultNodeId || 'default';
    const matchMode = config.matchMode || 'first';

    if (conditions.length === 0) {
      return defaultNodeId;
    }

    const matchedTargets: string[] = [];

    // 评估每个条件
    for (const condition of conditions) {
      const isMatch = this.evaluateCondition(condition, context);
      
      if (isMatch) {
        matchedTargets.push(condition.targetNodeId);
        
        // 如果是first模式，找到第一个匹配就返回
        if (matchMode === 'first') {
          return condition.targetNodeId;
        }
      }
    }

    // 根据匹配模式返回结果
    switch (matchMode) {
      case 'all':
        // all模式：只有所有条件都匹配时才返回所有目标节点
        return matchedTargets.length === conditions.length ? matchedTargets : defaultNodeId;
      
      case 'any':
        // any模式：返回所有匹配的目标节点，如果没有匹配则返回默认节点
        return matchedTargets.length > 0 ? matchedTargets : defaultNodeId;
      
      case 'first':
      default:
        // first模式：已经在上面处理了，这里作为fallback
        return matchedTargets.length > 0 ? matchedTargets[0]! : defaultNodeId;
    }
  }

  /**
   * 评估单个条件
   * @param condition 条件配置
   * @param context 执行上下文
   * @returns 是否匹配
   */
  private evaluateCondition(condition: any, context: any): boolean {
    const { name, value, operator = 'equals', negate = false } = condition;

    let result: boolean;

    // 如果条件有value字段，使用value进行评估
    if (value !== undefined) {
      result = this.evaluateValueCondition(value, operator, context);
    } else {
      // 否则使用name作为表达式进行评估
      result = this.evaluateExpressionCondition(name, context);
    }

    // 处理否定条件
    return negate ? !result : result;
  }

  /**
   * 评估基于值的条件
   * @param value 条件值
   * @param operator 操作符
   * @param context 执行上下文
   * @returns 评估结果
   */
  private evaluateValueCondition(value: any, operator: string, context: any): boolean {
    // 如果value是字符串表达式，先评估它
    let evaluatedValue = value;
    if (typeof value === 'string' && value.includes('${')) {
      evaluatedValue = ExpressionEvaluator.evaluate(value, context);
    }

    // 根据操作符进行评估
    switch (operator) {
      case 'equals':
        return Boolean(evaluatedValue);
      case 'not_equals':
        return !Boolean(evaluatedValue);
      case 'greater_than':
        return Number(evaluatedValue) > 0;
      case 'less_than':
        return Number(evaluatedValue) <= 0;
      case 'greater_equal':
        return Number(evaluatedValue) >= 0;
      case 'less_equal':
        return Number(evaluatedValue) <= 0;
      case 'contains':
        return String(evaluatedValue).length > 0;
      case 'not_contains':
        return String(evaluatedValue).length === 0;
      default:
        return Boolean(evaluatedValue);
    }
  }

  /**
   * 评估基于表达式的条件
   * @param expression 表达式
   * @param context 执行上下文
   * @returns 评估结果
   */
  private evaluateExpressionCondition(expression: string, context: any): boolean {
    try {
      const result = ExpressionEvaluator.evaluate(expression, context);
      return Boolean(result);
    } catch (error) {
      console.warn(`表达式评估失败: ${expression}`, error);
      return false;
    }
  }
}