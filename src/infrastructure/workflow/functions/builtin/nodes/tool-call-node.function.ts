import { injectable } from 'inversify';
import { INodeFunction, WorkflowFunctionType } from '../../../../../domain/workflow/interfaces/workflow-functions';
import { BaseWorkflowFunction } from '../../base/base-workflow-function';

/**
 * 工具调用节点函数
 */
@injectable()
export class ToolCallNodeFunction extends BaseWorkflowFunction implements INodeFunction {
  constructor() {
    super(
      'node:tool_call',
      'tool_call_node',
      '执行工具调用的节点函数',
      '1.0.0',
      WorkflowFunctionType.NODE,
      true
    );
  }

  override getParameters() {
    return [
      ...super.getParameters(),
      {
        name: 'toolName',
        type: 'string',
        required: true,
        description: '工具名称'
      },
      {
        name: 'toolParameters',
        type: 'object',
        required: false,
        description: '工具参数',
        defaultValue: {}
      },
      {
        name: 'timeout',
        type: 'number',
        required: false,
        description: '超时时间（毫秒）',
        defaultValue: 30000
      }
    ];
  }

  protected override validateCustomConfig(config: any): string[] {
    const errors: string[] = [];

    if (!config.toolName || typeof config.toolName !== 'string') {
      errors.push('toolName是必需的字符串参数');
    }

    if (config.toolParameters && typeof config.toolParameters !== 'object') {
      errors.push('toolParameters必须是对象类型');
    }

    if (config.timeout !== undefined) {
      if (typeof config.timeout !== 'number' || config.timeout <= 0) {
        errors.push('timeout必须是正数');
      }
    }

    return errors;
  }

  async execute(context: any, config: any): Promise<any> {
    this.checkInitialized();

    const toolName = config.toolName;
    const toolParameters = config.toolParameters || {};
    const timeout = config.timeout || 30000;

    // 获取工具调用ID
    const toolCallId = context.getVariable('current_tool_call_id') || `tool_${Date.now()}`;
    
    // 记录工具调用开始
    const toolCall = {
      id: toolCallId,
      name: toolName,
      parameters: toolParameters,
      timestamp: new Date().toISOString(),
      status: 'executing'
    };

    // 更新上下文中的工具调用信息
    const toolCalls = context.getVariable('tool_calls') || [];
    toolCalls.push(toolCall);
    context.setVariable('tool_calls', toolCalls);

    try {
      // 这里应该调用实际的工具服务
      // 为了演示，返回模拟结果
      const result = {
        toolCallId: toolCallId,
        toolName: toolName,
        result: `工具 ${toolName} 的执行结果`,
        success: true,
        executionTime: Math.random() * 2 + 0.5,
        timestamp: new Date().toISOString()
      };

      // 更新工具调用状态
      toolCall.status = 'completed';
      toolCall.result = result;

      // 将工具结果添加到消息列表
      const messages = context.getVariable('messages') || [];
      messages.push({
        role: 'tool',
        tool_call_id: toolCallId,
        content: result.result,
        timestamp: new Date().toISOString()
      });
      context.setVariable('messages', messages);

      // 存储工具执行结果
      context.setVariable(`tool_result_${toolCallId}`, result);

      return result;
    } catch (error) {
      // 更新工具调用状态为失败
      toolCall.status = 'failed';
      toolCall.error = error.message;

      // 记录错误
      const errors = context.getVariable('errors') || [];
      errors.push({
        type: 'tool_execution_error',
        toolName: toolName,
        toolCallId: toolCallId,
        message: error.message,
        timestamp: new Date().toISOString()
      });
      context.setVariable('errors', errors);

      throw error;
    }
  }
}