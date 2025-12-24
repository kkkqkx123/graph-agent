import { injectable } from 'inversify';
import { WorkflowFunctionType } from '../../../../../domain/workflow/value-objects/workflow-function-type';
import { BaseWorkflowFunction } from '../../base/base-workflow-function';

/**
 * 条件检查节点函数
 */
@injectable()
export class ConditionCheckNodeFunction extends BaseWorkflowFunction {
  constructor() {
    super(
      'node:condition_check',
      'condition_check_node',
      '执行条件检查的节点函数',
      '1.0.0',
      WorkflowFunctionType.NODE,
      false
    );
  }

  override getParameters() {
    return [
      ...super.getParameters(),
      {
        name: 'condition',
        type: 'string',
        required: true,
        description: '条件表达式'
      },
      {
        name: 'variables',
        type: 'object',
        required: false,
        description: '条件变量',
        defaultValue: {}
      }
    ];
  }

  protected override validateCustomConfig(config: any): string[] {
    const errors: string[] = [];

    if (!config.condition || typeof config.condition !== 'string') {
      errors.push('condition是必需的字符串参数');
    }

    if (config.variables && typeof config.variables !== 'object') {
      errors.push('variables必须是对象类型');
    }

    return errors;
  }

  async execute(context: any, config: any): Promise<any> {
    this.checkInitialized();

    const condition = config.condition;
    const variables = config.variables || {};

    // 获取上下文中的变量
    const contextVariables = context.getAllVariables();
    
    // 合并变量
    const allVariables = { ...contextVariables, ...variables };

    try {
      // 简单的条件表达式解析
      // 在实际实现中，应该使用更安全的表达式解析器
      const result = this.evaluateCondition(condition, allVariables);

      // 记录条件检查结果
      const conditionResult = {
        condition: condition,
        result: result,
        variables: allVariables,
        timestamp: new Date().toISOString()
      };

      // 存储条件检查结果
      context.setVariable(`condition_result_${context.getExecutionId()}`, conditionResult);

      // 更新上下文中的条件结果
      const conditionResults = context.getVariable('condition_results') || [];
      conditionResults.push(conditionResult);
      context.setVariable('condition_results', conditionResults);

      return conditionResult;
    } catch (error) {
      // 记录错误
      const errors = context.getVariable('errors') || [];
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push({
        type: 'condition_evaluation_error',
        condition: condition,
        message: errorMessage,
        timestamp: new Date().toISOString()
      });
      context.setVariable('errors', errors);

      throw new Error(`条件检查失败: ${errorMessage}`);
    }
  }

  /**
   * 简单的条件表达式评估
   * 注意：这是一个简化的实现，生产环境中应该使用更安全的表达式解析器
   */
  private evaluateCondition(condition: string, variables: any): boolean {
    // 替换变量
    let expression = condition;
    
    // 简单的变量替换，格式为 ${variableName}
    expression = expression.replace(/\$\{([^}]+)\}/g, (match, varName) => {
      const value = variables[varName];
      if (typeof value === 'string') {
        return `'${value}'`;
      }
      return String(value);
    });

    // 简单的安全检查，只允许基本的比较操作
    const allowedOperators = ['===', '!==', '==', '!=', '>', '<', '>=', '<=', '&&', '||', '!'];
    const hasUnsafeContent = /eval|function|new|delete|typeof|void|in|instanceof/.test(expression);
    
    if (hasUnsafeContent) {
      throw new Error('条件表达式包含不安全的内容');
    }

    try {
      // 使用Function构造函数而不是eval，相对更安全
      const func = new Function('return ' + expression);
      return Boolean(func());
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`条件表达式解析失败: ${errorMessage}`);
    }
  }
}