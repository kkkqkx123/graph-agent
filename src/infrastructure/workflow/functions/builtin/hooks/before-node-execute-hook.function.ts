import { injectable } from 'inversify';
import { WorkflowFunctionType } from '../../../../../domain/workflow/value-objects/workflow-function-type';
import { BaseWorkflowFunction } from '../../base/base-workflow-function';

/**
 * 节点执行前钩子函数
 * 在节点执行前调用，用于节点级别的预处理
 */
@injectable()
export class BeforeNodeExecuteHookFunction extends BaseWorkflowFunction {
  constructor() {
    super(
      'hook:before_node_execute',
      'before_node_execute_hook',
      '在节点执行前调用的钩子，用于节点级别的预处理',
      '1.0.0',
      WorkflowFunctionType.NODE,
      true
    );
  }

  override getParameters() {
    return [
      ...super.getParameters(),
      {
        name: 'nodeId',
        type: 'string',
        required: true,
        description: '节点ID'
      },
      {
        name: 'nodeType',
        type: 'string',
        required: true,
        description: '节点类型'
      },
      {
        name: 'inputValidation',
        type: 'object',
        required: false,
        description: '输入验证规则'
      }
    ];
  }

  protected override validateCustomConfig(config: any): string[] {
    const errors: string[] = [];

    if (!config.nodeId) {
      errors.push('nodeId 是必需的');
    }

    if (!config.nodeType) {
      errors.push('nodeType 是必需的');
    }

    if (config.inputValidation && typeof config.inputValidation !== 'object') {
      errors.push('inputValidation 必须是对象类型');
    }

    return errors;
  }

  async execute(context: any, config: any): Promise<any> {
    this.checkInitialized();

    const result: {
      success: boolean;
      shouldContinue: boolean;
      data: Record<string, any>;
      metadata: Record<string, any>;
    } = {
      success: true,
      shouldContinue: true,
      data: {},
      metadata: {
        hookPoint: 'before_node_execute',
        nodeId: config.nodeId,
        nodeType: config.nodeType,
        timestamp: Date.now()
      }
    };

    // 执行输入验证
    if (config.inputValidation) {
      const validationResult = this.validateNodeInput(context, config.inputValidation);
      if (!validationResult.valid) {
        result.success = false;
        result.shouldContinue = false;
        result.data['validationErrors'] = validationResult.errors;
        return result;
      }
    }

    // 记录节点执行开始
    result.data['executionStarted'] = true;

    return result;
  }

  private validateNodeInput(context: any, rules: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 简化的输入验证逻辑
    if (rules.required) {
      for (const field of rules.required) {
        if (!(field in context)) {
          errors.push(`节点输入缺少必需字段: ${field}`);
        }
      }
    }

    if (rules.typeCheck) {
      for (const [field, expectedType] of Object.entries(rules.typeCheck)) {
        if (field in context && typeof context[field] !== expectedType) {
          errors.push(`字段 ${field} 类型错误，期望 ${expectedType}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}