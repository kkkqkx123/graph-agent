import { NodeId } from '../../../domain/workflow/value-objects/node/node-id';
import {
  NodeType,
  NodeTypeValue,
  NodeContextTypeValue,
} from '../../../domain/workflow/value-objects/node/node-type';
import {
  Node,
  NodeExecutionResult,
  NodeMetadata,
  ValidationResult,
  WorkflowExecutionContext,
} from '../../../domain/workflow/entities/node';

/**
 * 条件检查节点
 * 根据条件表达式进行条件判断和路由决策
 */
export class ConditionNode extends Node {
  constructor(
    id: NodeId,
    public readonly condition: string,
    public readonly variables: Record<string, unknown> = {},
    name?: string,
    description?: string,
    position?: { x: number; y: number }
  ) {
    super(id, NodeType.condition(NodeContextTypeValue.PASS_THROUGH), name, description, position);
  }

  async execute(context: WorkflowExecutionContext): Promise<NodeExecutionResult> {
    // 获取上下文中的变量
    const contextVariables = context.getAllVariables();

    // 合并变量
    const allVariables = { ...contextVariables, ...this.variables };

    try {
      // 评估条件表达式
      const result = this.evaluateCondition(this.condition, allVariables);

      // 记录条件检查结果
      const conditionResult = {
        condition: this.condition,
        result: result,
        variables: allVariables,
        timestamp: new Date().toISOString(),
      };

      // 存储条件检查结果
      context.setVariable(`condition_result_${context.getExecutionId()}`, conditionResult);

      // 更新上下文中的条件结果
      const conditionResults = context.getVariable('condition_results') || [];
      conditionResults.push(conditionResult);
      context.setVariable('condition_results', conditionResults);

      return {
        success: true,
        output: conditionResult,
        executionTime: 0,
        metadata: {
          condition: this.condition,
          result: result,
        },
      };
    } catch (error) {
      // 记录错误
      const errors = context.getVariable('errors') || [];
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push({
        type: 'condition_evaluation_error',
        condition: this.condition,
        message: errorMessage,
        timestamp: new Date().toISOString(),
      });
      context.setVariable('errors', errors);

      return {
        success: false,
        error: errorMessage,
        executionTime: 0,
        metadata: {
          condition: this.condition,
        },
      };
    }
  }

  validate(): ValidationResult {
    const errors: string[] = [];

    if (!this.condition || typeof this.condition !== 'string') {
      errors.push('condition是必需的字符串参数');
    }

    if (this.variables && typeof this.variables !== 'object') {
      errors.push('variables必须是对象类型');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  getMetadata(): NodeMetadata {
    return {
      id: this.nodeId.toString(),
      type: this.type.toString(),
      name: this.name,
      description: this.description,
      status: this.status.toString(),
      parameters: [
        {
          name: 'condition',
          type: 'string',
          required: true,
          description: '条件表达式',
        },
        {
          name: 'variables',
          type: 'object',
          required: false,
          description: '条件变量',
          defaultValue: {},
        },
      ],
    };
  }

  getInputSchema(): Record<string, any> {
    return {
      type: 'object',
      properties: {
        condition: { type: 'string', description: '决策条件' },
        context: { type: 'object', description: '上下文数据' },
      },
      required: ['condition'],
    };
  }

  getOutputSchema(): Record<string, any> {
    return {
      type: 'object',
      properties: {
        decision: { type: 'string', description: '决策结果' },
        branch: { type: 'string', description: '选择的分支' },
      },
    };
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

  protected createNodeFromProps(props: any): any {
    return new ConditionNode(
      props.id,
      props.condition,
      props.variables,
      props.name,
      props.description,
      props.position
    );
  }
}
