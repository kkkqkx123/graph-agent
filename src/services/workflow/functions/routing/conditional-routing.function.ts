import { injectable, inject } from 'inversify';
import { BaseTargetRoutingFunction } from './base-routing-function';
import { RoutingFunctionConfig, WorkflowExecutionContext } from '../types';
import { IConfigManager } from '../../../../infrastructure/config/loading/config-manager.interface';
import { TYPES } from '../../../../di/service-keys';

/**
 * 条件路由函数
 * 基于配置的条件数组进行路由决策，支持复杂的条件组合和表达式评估
 */
@injectable()
export class ConditionalRoutingFunction extends BaseTargetRoutingFunction<RoutingFunctionConfig> {
  constructor(@inject(TYPES.ConfigManager) configManager: IConfigManager) {
    super(
      'route:conditional',
      'conditional_routing',
      '基于条件结果进行路由决策，支持复杂的条件组合和表达式评估',
      configManager,
      '1.0.0',
      'builtin'
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
        defaultValue: [],
      },
      {
        name: 'defaultNodeId',
        type: 'string',
        required: false,
        description: '默认节点ID，当所有条件都不匹配时使用',
        defaultValue: 'default',
      },
      {
        name: 'matchMode',
        type: 'string',
        required: false,
        description: '匹配模式：first（第一个匹配）、all（所有匹配）、any（任意匹配）',
        defaultValue: 'first',
      },
    ];
  }

  protected override validateCustomConfig(config: any): string[] {
    const errors: string[] = [];

    // 验证conditions数组
    if (config['conditions'] && !Array.isArray(config['conditions'])) {
      errors.push('conditions必须是数组类型');
    }

    // 验证每个条件的结构
    if (Array.isArray(config['conditions'])) {
      config['conditions'].forEach((condition: any, index: number) => {
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
    if (config['matchMode'] && !['first', 'all', 'any'].includes(config['matchMode'])) {
      errors.push('matchMode必须是first、all或any之一');
    }

    return errors;
  }

  private isValidOperator(operator: string): boolean {
    const validOperators = [
      'equals',
      'not_equals',
      'greater_than',
      'less_than',
      'greater_equal',
      'less_equal',
      'contains',
      'not_contains',
    ];
    return validOperators.includes(operator);
  }

  override async execute(
    context: WorkflowExecutionContext,
    config: RoutingFunctionConfig
  ): Promise<string | string[]> {
    this.checkInitialized();

    const conditions = config['conditions'] || [];
    const defaultNodeId = config['defaultNodeId'] || 'default';
    const matchMode = config['matchMode'] || 'first';

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
      evaluatedValue = this.evaluateExpression(value, context);
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
      const result = this.evaluateExpression(expression, context);
      return Boolean(result);
    } catch (error) {
      console.warn(`表达式评估失败: ${expression}`, error);
      return false;
    }
  }

  /**
   * 简单的表达式评估器
   * @param expression 表达式字符串
   * @param context 执行上下文
   * @returns 评估结果
   */
  private evaluateExpression(expression: string, context: any): any {
    // 处理变量引用: ${variable_name}
    if (expression.startsWith('${') && expression.endsWith('}')) {
      const variablePath = expression.slice(2, -1).trim();
      return this.getVariableValue(variablePath, context);
    }

    // 处理布尔表达式: ${iteration >= 10}
    if (expression.includes('${') && expression.includes('}')) {
      return this.evaluateBooleanExpression(expression, context);
    }

    // 处理直接值
    return this.evaluateDirectValue(expression);
  }

  /**
   * 获取变量值
   * @param path 变量路径
   * @param context 执行上下文
   * @returns 变量值
   */
  private getVariableValue(path: string, context: any): any {
    const parts = path.split('.');
    let value = context;

    for (const part of parts) {
      if (value === null || value === undefined) {
        return undefined;
      }
      value = value[part];
    }

    return value;
  }

  /**
   * 评估布尔表达式
   * @param expression 布尔表达式
   * @param context 执行上下文
   * @returns 布尔值
   */
  private evaluateBooleanExpression(expression: string, context: any): boolean {
    const variableMatch = expression.match(/\$\{([^}]+)\}/);
    if (!variableMatch) {
      return false;
    }

    const variableExpression = variableMatch[1];
    if (!variableExpression) {
      return false;
    }

    const operatorMatch = variableExpression.match(/(.+)\s*(>=|<=|==|!=|>|<)\s*(.+)/);

    if (operatorMatch) {
      const [, leftOperand, operator, rightOperand] = operatorMatch;
      if (leftOperand && operator && rightOperand) {
        const leftValue = this.getVariableValue(leftOperand.trim(), context);
        const rightValue = this.evaluateDirectValue(rightOperand.trim());
        return this.compareValues(leftValue, operator, rightValue);
      }
    }

    const value = this.getVariableValue(variableExpression, context);
    return Boolean(value);
  }

  /**
   * 评估直接值
   * @param value 值字符串
   * @returns 评估后的值
   */
  private evaluateDirectValue(value: string): any {
    if (value.startsWith('"') && value.endsWith('"')) {
      return value.slice(1, -1);
    }

    if (/^\d+$/.test(value)) {
      return parseInt(value, 10);
    }

    if (/^\d+\.\d+$/.test(value)) {
      return parseFloat(value);
    }

    if (value === 'true') return true;
    if (value === 'false') return false;

    if (value === 'null') return null;
    if (value === 'undefined') return undefined;

    return value;
  }

  /**
   * 比较两个值
   * @param leftValue 左值
   * @param operator 操作符
   * @param rightValue 右值
   * @returns 比较结果
   */
  private compareValues(leftValue: any, operator: string, rightValue: any): boolean {
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
}
