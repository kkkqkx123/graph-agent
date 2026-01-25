import { BaseTriggerFunction } from './base-trigger-function';
import { TriggerFunctionConfig, WorkflowExecutionContext } from '../types';

/**
 * 基于工具错误数量的触发器函数
 */
export class ToolErrorTrigger extends BaseTriggerFunction<TriggerFunctionConfig> {
  constructor() {
    super(
      'trigger:tool_error',
      'tool_error_trigger',
      '基于工具执行错误数量的触发器',
      '1.0.0',
      'builtin'
    );
  }

  override getParameters() {
    return [
      ...super.getParameters(),
      {
        name: 'maxErrorCount',
        type: 'number',
        required: false,
        description: '最大错误数量阈值',
        defaultValue: 3,
      },
      {
        name: 'toolName',
        type: 'string',
        required: false,
        description: '特定工具名称，不指定则监控所有工具',
        defaultValue: null,
      },
      {
        name: 'errorType',
        type: 'string',
        required: false,
        description: '特定错误类型，不指定则监控所有错误类型',
        defaultValue: null,
      },
    ];
  }

  protected override validateCustomConfig(config: any): string[] {
    const errors: string[] = [];

    if (config['maxErrorCount'] !== undefined) {
      if (typeof config['maxErrorCount'] !== 'number' || config['maxErrorCount'] <= 0) {
        errors.push('maxErrorCount必须是正数');
      }
    }

    if (config['toolName'] && typeof config['toolName'] !== 'string') {
      errors.push('toolName必须是字符串类型');
    }

    if (config['errorType'] && typeof config['errorType'] !== 'string') {
      errors.push('errorType必须是字符串类型');
    }

    return errors;
  }

  override async execute(
    context: WorkflowExecutionContext,
    config: TriggerFunctionConfig
  ): Promise<boolean> {
    const maxErrorCount = config['maxErrorCount'] || 3;
    const toolName = config['toolName'];
    const errorType = config['errorType'];

    // 获取错误列表
    const errors = context.getVariable('errors') || [];

    // 过滤工具执行错误
    const toolErrors = errors.filter((error: any) => {
      // 检查是否为工具执行错误
      if (error.type !== 'tool_execution_error') {
        return false;
      }

      // 检查工具名称
      if (toolName && error.toolName !== toolName) {
        return false;
      }

      // 检查错误类型
      if (errorType && error.errorType !== errorType) {
        return false;
      }

      return true;
    });

    // 检查错误数量是否达到阈值
    return toolErrors.length >= maxErrorCount;
  }
}
