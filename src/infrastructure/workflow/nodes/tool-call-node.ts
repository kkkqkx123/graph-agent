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
 * 工具调用节点
 * 执行工具调用并处理结果
 */
export class ToolCallNode extends Node {
  constructor(
    id: NodeId,
    public readonly toolName: string,
    public readonly toolParameters: Record<string, unknown> = {},
    public readonly timeout: number = 30000,
    name?: string,
    description?: string,
    position?: { x: number; y: number }
  ) {
    super(id, NodeType.tool(NodeContextTypeValue.TOOL_CONTEXT), name, description, position);
  }

  async execute(context: WorkflowExecutionContext): Promise<NodeExecutionResult> {
    const startTime = Date.now();

    // 获取工具调用ID
    const toolCallId = context.getVariable('current_tool_call_id') || `tool_${Date.now()}`;

    // 记录工具调用开始
    const toolCall: any = {
      id: toolCallId,
      name: this.toolName,
      parameters: this.toolParameters,
      timestamp: new Date().toISOString(),
      status: 'executing',
    };

    // 更新上下文中的工具调用信息
    const toolCalls = context.getVariable('tool_calls') || [];
    toolCalls.push(toolCall);
    context.setVariable('tool_calls', toolCalls);

    try {
      // 获取工具执行器服务
      const toolExecutor = context.getService<any>('ToolExecutor');

      // 执行工具调用
      const result = await toolExecutor.execute(this.toolName, this.toolParameters, {
        timeout: this.timeout,
      });

      const executionTime = Date.now() - startTime;

      // 更新工具调用状态
      toolCall.status = 'completed';
      toolCall.result = result;
      toolCall.executionTime = executionTime;

      // 将工具结果添加到消息列表
      const messages = context.getVariable('messages') || [];
      messages.push({
        role: 'tool',
        tool_call_id: toolCallId,
        content: result.data || result.result,
        timestamp: new Date().toISOString(),
      });
      context.setVariable('messages', messages);

      // 存储工具执行结果
      context.setVariable(`tool_result_${toolCallId}`, {
        toolCallId,
        toolName: this.toolName,
        result: result.data || result.result,
        success: result.success,
        executionTime,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        output: result.data || result.result,
        executionTime,
        metadata: {
          toolName: this.toolName,
          toolCallId,
          timeout: this.timeout,
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // 更新工具调用状态为失败
      toolCall.status = 'failed';
      toolCall.error = errorMessage;
      toolCall.executionTime = executionTime;

      // 记录错误
      const errors = context.getVariable('errors') || [];
      errors.push({
        type: 'tool_execution_error',
        toolName: this.toolName,
        toolCallId,
        message: errorMessage,
        timestamp: new Date().toISOString(),
      });
      context.setVariable('errors', errors);

      return {
        success: false,
        error: errorMessage,
        executionTime,
        metadata: {
          toolName: this.toolName,
          toolCallId,
          timeout: this.timeout,
        },
      };
    }
  }

  validate(): ValidationResult {
    const errors: string[] = [];

    if (!this.toolName || typeof this.toolName !== 'string') {
      errors.push('toolName是必需的字符串参数');
    }

    if (this.toolParameters && typeof this.toolParameters !== 'object') {
      errors.push('toolParameters必须是对象类型');
    }

    if (typeof this.timeout !== 'number' || this.timeout <= 0) {
      errors.push('timeout必须是正数');
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
          name: 'toolName',
          type: 'string',
          required: true,
          description: '工具名称',
        },
        {
          name: 'toolParameters',
          type: 'object',
          required: false,
          description: '工具参数',
          defaultValue: {},
        },
        {
          name: 'timeout',
          type: 'number',
          required: false,
          description: '超时时间（毫秒）',
          defaultValue: 30000,
        },
      ],
    };
  }

  getInputSchema(): Record<string, any> {
    return {
      type: 'object',
      properties: {
        toolName: { type: 'string', description: '工具名称' },
        parameters: { type: 'object', description: '工具参数' },
      },
      required: ['toolName'],
    };
  }

  getOutputSchema(): Record<string, any> {
    return {
      type: 'object',
      properties: {
        result: { type: 'any', description: '工具执行结果' },
        success: { type: 'boolean', description: '是否成功' },
      },
    };
  }

  protected createNodeFromProps(props: any): any {
    return new ToolCallNode(
      props.id,
      props.toolName,
      props.toolParameters,
      props.timeout,
      props.name,
      props.description,
      props.position
    );
  }
}
