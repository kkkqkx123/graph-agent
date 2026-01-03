import { NodeId } from '../../../domain/workflow/value-objects/node/node-id';
import { NodeType, NodeTypeValue, NodeContextTypeValue } from '../../../domain/workflow/value-objects/node/node-type';
import { Node, NodeExecutionResult, NodeMetadata, ValidationResult, WorkflowExecutionContext } from '../../../domain/workflow/entities/node';

/**
 * 交互类型枚举
 */
export enum InteractionType {
  /** 表单输入 */
  FORM = 'form',
  /** 审批 */
  APPROVAL = 'approval',
  /** 通知 */
  NOTIFICATION = 'notification',
  /** 对话 */
  CONVERSATION = 'conversation'
}

/**
 * 表单字段接口
 */
export interface FormField {
  /** 字段名称 */
  name: string;
  /** 字段类型 */
  type: 'text' | 'number' | 'boolean' | 'select' | 'textarea' | 'date';
  /** 字段标签 */
  label: string;
  /** 是否必需 */
  required?: boolean;
  /** 默认值 */
  defaultValue?: any;
  /** 选项（select类型） */
  options?: Array<{ value: any; label: string }>;
  /** 验证规则 */
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

/**
 * 用户交互节点
 * 支持与用户的交互协作
 */
export class UserInteractionNode extends Node {
  constructor(
    id: NodeId,
    public readonly interactionType: InteractionType,
    public readonly title: string,
    public readonly message: string,
    public readonly formFields?: FormField[],
    public readonly approvalOptions?: string[],
    public readonly notificationChannels?: string[],
    public readonly timeout: number = 86400000, // 默认24小时超时
    public readonly allowMultipleResponses: boolean = false,
    name?: string,
    description?: string,
    position?: { x: number; y: number }
  ) {
    super(
      id,
      NodeType.userInteraction(NodeContextTypeValue.PASS_THROUGH),
      name || 'UserInteraction',
      description || '用户交互节点',
      position
    );
  }

  async execute(context: WorkflowExecutionContext): Promise<NodeExecutionResult> {
    const startTime = Date.now();

    try {
      // 获取用户交互服务
      const interactionService = context.getService<any>('UserInteractionService');
      if (!interactionService) {
        throw new Error('UserInteractionService不可用，无法处理用户交互');
      }

      // 创建交互任务
      const interactionTask = this.createInteractionTask(context);

      // 提交交互任务
      const taskId = await interactionService.createTask(interactionTask);

      // 存储任务ID到上下文
      context.setVariable('user_interaction_task_id', taskId);
      context.setVariable('user_interaction_type', this.interactionType);
      context.setVariable('user_interaction_start_time', new Date().toISOString());

      // 等待用户响应
      const response = await interactionService.waitForResponse(taskId, {
        timeout: this.timeout,
        allowMultipleResponses: this.allowMultipleResponses
      });

      // 处理用户响应
      const processedResponse = this.processResponse(response, context);

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        output: {
          message: '用户交互完成',
          taskId,
          response: processedResponse,
          interactionType: this.interactionType
        },
        executionTime,
        metadata: {
          nodeId: this.nodeId.toString(),
          nodeType: this.type.toString(),
          interactionType: this.interactionType,
          taskId,
          responseCount: Array.isArray(response) ? response.length : 1
        }
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // 记录错误
      const errors = context.getVariable('errors') || [];
      errors.push({
        type: 'user_interaction_error',
        interactionType: this.interactionType,
        message: errorMessage,
        timestamp: new Date().toISOString()
      });
      context.setVariable('errors', errors);

      return {
        success: false,
        error: errorMessage,
        executionTime,
        metadata: {
          nodeId: this.nodeId.toString(),
          nodeType: this.type.toString(),
          interactionType: this.interactionType
        }
      };
    }
  }

  /**
   * 创建交互任务
   * @param context 执行上下文
   * @returns 交互任务
   */
  private createInteractionTask(context: WorkflowExecutionContext): Record<string, unknown> {
    const task: Record<string, unknown> = {
      type: this.interactionType,
      title: this.title,
      message: this.message,
      workflowId: context.getWorkflowId(),
      executionId: context.getExecutionId(),
      nodeId: this.nodeId.toString(),
      createdAt: new Date().toISOString(),
      timeout: this.timeout,
      allowMultipleResponses: this.allowMultipleResponses
    };

    // 根据交互类型添加特定配置
    switch (this.interactionType) {
      case InteractionType.FORM:
        task['formFields'] = this.formFields || [];
        break;

      case InteractionType.APPROVAL:
        task['approvalOptions'] = this.approvalOptions || ['approve', 'reject'];
        break;

      case InteractionType.NOTIFICATION:
        task['notificationChannels'] = this.notificationChannels || ['email'];
        break;

      case InteractionType.CONVERSATION:
        task['conversationHistory'] = context.getVariable('messages') || [];
        break;
    }

    return task;
  }

  /**
   * 处理用户响应
   * @param response 用户响应
   * @param context 执行上下文
   * @returns 处理后的响应
   */
  private processResponse(response: any, context: WorkflowExecutionContext): Record<string, unknown> {
    const processed: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      type: this.interactionType
    };

    if (Array.isArray(response)) {
      // 多个响应
      processed['responses'] = response;
      processed['responseCount'] = response.length;

      // 将所有响应存储到上下文
      response.forEach((resp, index) => {
        context.setVariable(`user_interaction_response_${index}`, resp);
      });
    } else {
      // 单个响应
      processed['response'] = response;

      // 根据交互类型处理响应
      switch (this.interactionType) {
        case InteractionType.FORM:
          // 将表单数据存储到上下文
          if (response.formData) {
            for (const [key, value] of Object.entries(response.formData)) {
              context.setVariable(key, value);
            }
          }
          processed['formData'] = response.formData;
          break;

        case InteractionType.APPROVAL:
          processed['approved'] = response.approved;
          processed['approver'] = response.approver;
          processed['comment'] = response.comment;
          break;

        case InteractionType.NOTIFICATION:
          processed['acknowledged'] = response.acknowledged;
          processed['recipient'] = response.recipient;
          break;

        case InteractionType.CONVERSATION:
          processed['userMessage'] = response.userMessage;
          // 更新对话历史
          const messages = context.getVariable('messages') || [];
          messages.push({
            role: 'user',
            content: response.userMessage,
            timestamp: new Date().toISOString()
          });
          context.setVariable('messages', messages);
          break;
      }
    }

    return processed;
  }

  validate(): ValidationResult {
    const errors: string[] = [];

    if (!Object.values(InteractionType).includes(this.interactionType)) {
      errors.push('interactionType必须是有效的InteractionType值');
    }

    if (!this.title || typeof this.title !== 'string') {
      errors.push('title是必需的字符串');
    }

    if (!this.message || typeof this.message !== 'string') {
      errors.push('message是必需的字符串');
    }

    if (this.interactionType === InteractionType.FORM) {
      if (!Array.isArray(this.formFields) || this.formFields.length === 0) {
        errors.push('FORM类型需要指定formFields');
      } else {
        this.formFields.forEach((field, index) => {
          if (!field.name || typeof field.name !== 'string') {
            errors.push(`formFields[${index}]缺少name`);
          }
          if (!field.type || typeof field.type !== 'string') {
            errors.push(`formFields[${index}]缺少type`);
          }
          if (!field.label || typeof field.label !== 'string') {
            errors.push(`formFields[${index}]缺少label`);
          }
        });
      }
    }

    if (this.interactionType === InteractionType.APPROVAL) {
      if (!Array.isArray(this.approvalOptions) || this.approvalOptions.length === 0) {
        errors.push('APPROVAL类型需要指定approvalOptions');
      }
    }

    if (this.interactionType === InteractionType.NOTIFICATION) {
      if (!Array.isArray(this.notificationChannels) || this.notificationChannels.length === 0) {
        errors.push('NOTIFICATION类型需要指定notificationChannels');
      }
    }

    if (typeof this.timeout !== 'number' || this.timeout <= 0) {
      errors.push('timeout必须是正数');
    }

    if (typeof this.allowMultipleResponses !== 'boolean') {
      errors.push('allowMultipleResponses必须是布尔类型');
    }

    return {
      valid: errors.length === 0,
      errors
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
          name: 'interactionType',
          type: 'string',
          required: true,
          description: '交互类型：form、approval、notification、conversation'
        },
        {
          name: 'title',
          type: 'string',
          required: true,
          description: '交互标题'
        },
        {
          name: 'message',
          type: 'string',
          required: true,
          description: '交互消息'
        },
        {
          name: 'formFields',
          type: 'array',
          required: false,
          description: '表单字段（form类型时必需）'
        },
        {
          name: 'approvalOptions',
          type: 'array',
          required: false,
          description: '审批选项（approval类型时必需）'
        },
        {
          name: 'notificationChannels',
          type: 'array',
          required: false,
          description: '通知渠道（notification类型时必需）'
        },
        {
          name: 'timeout',
          type: 'number',
          required: false,
          description: '超时时间（毫秒）',
          defaultValue: 86400000
        },
        {
          name: 'allowMultipleResponses',
          type: 'boolean',
          required: false,
          description: '是否允许多个响应',
          defaultValue: false
        }
      ]
    };
  }

  getInputSchema(): Record<string, any> {
    return {
      type: 'object',
      properties: {},
      required: []
    };
  }

  getOutputSchema(): Record<string, any> {
    return {
      type: 'object',
      properties: {
        message: { type: 'string', description: '执行消息' },
        taskId: { type: 'string', description: '任务ID' },
        response: { type: 'object', description: '用户响应' },
        interactionType: { type: 'string', description: '交互类型' }
      }
    };
  }

  protected createNodeFromProps(props: any): any {
    return new UserInteractionNode(
      props.id,
      props.interactionType,
      props.title,
      props.message,
      props.formFields,
      props.approvalOptions,
      props.notificationChannels,
      props.timeout,
      props.allowMultipleResponses,
      props.name,
      props.description,
      props.position
    );
  }
}