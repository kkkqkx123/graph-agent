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
 * 等待类型枚举
 */
export enum WaitType {
  /** 时间等待（秒） */
  TIME_SECONDS = 'time_seconds',
  /** 时间等待（分钟） */
  TIME_MINUTES = 'time_minutes',
  /** 时间等待（小时） */
  TIME_HOURS = 'time_hours',
  /** 条件等待 */
  CONDITION = 'condition',
  /** 事件等待 */
  EVENT = 'event',
}

/**
 * 等待节点
 * 支持时间等待、条件等待和事件等待
 */
export class WaitNode extends Node {
  constructor(
    id: NodeId,
    public readonly waitType: WaitType,
    public readonly duration?: number,
    public readonly condition?: string,
    public readonly eventName?: string,
    public readonly pollInterval: number = 1000, // 轮询间隔（毫秒）
    public readonly timeout: number = 300000, // 默认5分钟超时
    name?: string,
    description?: string,
    position?: { x: number; y: number }
  ) {
    super(
      id,
      NodeType.wait(NodeContextTypeValue.PASS_THROUGH),
      name || 'Wait',
      description || '等待节点',
      position
    );
  }

  async execute(context: WorkflowExecutionContext): Promise<NodeExecutionResult> {
    const startTime = Date.now();

    try {
      let result: any;

      switch (this.waitType) {
        case WaitType.TIME_SECONDS:
        case WaitType.TIME_MINUTES:
        case WaitType.TIME_HOURS:
          result = await this.waitForTime();
          break;

        case WaitType.CONDITION:
          result = await this.waitForCondition(context);
          break;

        case WaitType.EVENT:
          result = await this.waitForEvent(context);
          break;

        default:
          throw new Error(`不支持的等待类型: ${this.waitType}`);
      }

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        output: {
          message: '等待完成',
          waitType: this.waitType,
          result,
        },
        executionTime,
        metadata: {
          nodeId: this.nodeId.toString(),
          nodeType: this.type.toString(),
          waitType: this.waitType,
          duration: this.duration,
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        error: errorMessage,
        executionTime,
        metadata: {
          nodeId: this.nodeId.toString(),
          nodeType: this.type.toString(),
          waitType: this.waitType,
        },
      };
    }
  }

  /**
   * 等待指定时间
   * @returns 等待结果
   */
  private async waitForTime(): Promise<{ waitedTime: number }> {
    if (this.duration === undefined || this.duration <= 0) {
      throw new Error('duration必须是正数');
    }

    let waitTimeMs = 0;

    switch (this.waitType) {
      case WaitType.TIME_SECONDS:
        waitTimeMs = this.duration * 1000;
        break;

      case WaitType.TIME_MINUTES:
        waitTimeMs = this.duration * 60 * 1000;
        break;

      case WaitType.TIME_HOURS:
        waitTimeMs = this.duration * 60 * 60 * 1000;
        break;
    }

    await this.sleep(waitTimeMs);

    return {
      waitedTime: waitTimeMs,
    };
  }

  /**
   * 等待条件满足
   * @param context 执行上下文
   * @returns 等待结果
   */
  private async waitForCondition(
    context: WorkflowExecutionContext
  ): Promise<{ satisfied: boolean; attempts: number }> {
    if (!this.condition) {
      throw new Error('condition是必需的');
    }

    const startTime = Date.now();
    let attempts = 0;

    while (Date.now() - startTime < this.timeout) {
      attempts++;

      // 评估条件
      const satisfied = this.evaluateCondition(this.condition, context);

      if (satisfied) {
        return {
          satisfied: true,
          attempts,
        };
      }

      // 等待下一次轮询
      await this.sleep(this.pollInterval);
    }

    // 超时
    throw new Error(`条件等待超时，已尝试 ${attempts} 次`);
  }

  /**
   * 等待事件
   * @param context 执行上下文
   * @returns 等待结果
   */
  private async waitForEvent(
    context: WorkflowExecutionContext
  ): Promise<{ eventName: string; eventData?: any }> {
    if (!this.eventName) {
      throw new Error('eventName是必需的');
    }

    const startTime = Date.now();
    let attempts = 0;

    while (Date.now() - startTime < this.timeout) {
      attempts++;

      // 检查事件是否发生
      const eventOccurred = context.getVariable(`event_${this.eventName}`);

      if (eventOccurred) {
        // 清除事件标记
        context.setVariable(`event_${this.eventName}`, undefined);

        return {
          eventName: this.eventName,
          eventData: eventOccurred,
        };
      }

      // 等待下一次轮询
      await this.sleep(this.pollInterval);
    }

    // 超时
    throw new Error(`事件等待超时: ${this.eventName}，已尝试 ${attempts} 次`);
  }

  /**
   * 评估条件
   * @param condition 条件表达式
   * @param context 执行上下文
   * @returns 评估结果
   */
  private evaluateCondition(condition: string, context: WorkflowExecutionContext): boolean {
    try {
      // 简单的条件评估逻辑
      const variables: Record<string, unknown> = {
        executionId: context.getExecutionId(),
        workflowId: context.getWorkflowId(),
      };

      // 替换变量引用
      let expression = condition;
      expression = expression.replace(/\$\{([^}]+)\}/g, (match, varName) => {
        const value = variables[varName];
        if (typeof value === 'string') {
          return `'${value}'`;
        }
        return String(value);
      });

      // 安全检查
      const hasUnsafeContent = /eval|function|new|delete|typeof|void|in|instanceof/.test(
        expression
      );
      if (hasUnsafeContent) {
        return false;
      }

      const func = new Function('return ' + expression);
      return Boolean(func());
    } catch {
      return false;
    }
  }

  /**
   * 延迟执行
   * @param ms 延迟时间（毫秒）
   * @returns Promise
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  validate(): ValidationResult {
    const errors: string[] = [];

    if (!Object.values(WaitType).includes(this.waitType)) {
      errors.push('waitType必须是有效的WaitType值');
    }

    if (
      this.waitType === WaitType.TIME_SECONDS ||
      this.waitType === WaitType.TIME_MINUTES ||
      this.waitType === WaitType.TIME_HOURS
    ) {
      if (this.duration === undefined || this.duration <= 0) {
        errors.push('时间等待需要指定有效的duration');
      }
    }

    if (this.waitType === WaitType.CONDITION && !this.condition) {
      errors.push('条件等待需要指定condition');
    }

    if (this.waitType === WaitType.EVENT && !this.eventName) {
      errors.push('事件等待需要指定eventName');
    }

    if (typeof this.pollInterval !== 'number' || this.pollInterval <= 0) {
      errors.push('pollInterval必须是正数');
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
          name: 'waitType',
          type: 'string',
          required: true,
          description: '等待类型：time_seconds、time_minutes、time_hours、condition、event',
        },
        {
          name: 'duration',
          type: 'number',
          required: false,
          description: '等待时长（根据waitType确定单位）',
        },
        {
          name: 'condition',
          type: 'string',
          required: false,
          description: '条件表达式（condition类型时必需）',
        },
        {
          name: 'eventName',
          type: 'string',
          required: false,
          description: '事件名称（event类型时必需）',
        },
        {
          name: 'pollInterval',
          type: 'number',
          required: false,
          description: '轮询间隔（毫秒）',
          defaultValue: 1000,
        },
        {
          name: 'timeout',
          type: 'number',
          required: false,
          description: '超时时间（毫秒）',
          defaultValue: 300000,
        },
      ],
    };
  }

  getInputSchema(): Record<string, any> {
    return {
      type: 'object',
      properties: {},
      required: [],
    };
  }

  getOutputSchema(): Record<string, any> {
    return {
      type: 'object',
      properties: {
        message: { type: 'string', description: '执行消息' },
        waitType: { type: 'string', description: '等待类型' },
        result: { type: 'object', description: '等待结果' },
      },
    };
  }

  protected createNodeFromProps(props: any): any {
    return new WaitNode(
      props.id,
      props.waitType,
      props.duration,
      props.condition,
      props.eventName,
      props.pollInterval,
      props.timeout,
      props.name,
      props.description,
      props.position
    );
  }
}
