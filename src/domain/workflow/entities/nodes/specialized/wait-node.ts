import { Node, NodeProps, NodePosition } from '@domain/workflow/graph/entities/nodes/base/node';
import { ID } from '@domain/common/value-objects/id';
import { NodeType } from '@/domain/workflow/value-objects/node-type';
import { WorkflowState } from '@domain/workflow/graph/entities/workflow-state';
import { Timestamp } from '@domain/common/value-objects/timestamp';
import { Version } from '@domain/common/value-objects/version';
import { DomainError } from '@domain/common/errors/domain-error';

/**
 * 等待类型枚举
 */
export enum WaitType {
  TIME = 'time',
  CONDITION = 'condition',
  EVENT = 'event',
  EXTERNAL = 'external'
}

/**
 * 等待条件接口
 */
export interface WaitCondition {
  conditionId: string;
  name: string;
  expression: string;
  parameters?: Record<string, unknown>;
  checkInterval?: number;
  timeout?: number;
}

/**
 * 事件等待配置接口
 */
export interface EventWaitConfig {
  eventType: string;
  source?: string;
  parameters?: Record<string, unknown>;
  timeout?: number;
}

/**
 * 等待节点属性接口
 */
export interface WaitNodeProps extends NodeProps {
  waitType: WaitType;
  duration?: number;
  condition?: WaitCondition;
  eventConfig?: EventWaitConfig;
  externalSignal?: string;
  checkInterval?: number;
  timeout?: number;
}

/**
 * 等待节点实体
 * 
 * 表示处理等待和延迟逻辑的节点
 */
export class WaitNode extends Node {
  private readonly waitProps: WaitNodeProps;

  protected constructor(props: WaitNodeProps) {
    super(props);
    this.waitProps = Object.freeze(props);
  }

  /**
   * 创建等待节点
   */
  public static override create(
    graphId: ID,
    type: NodeType,
    name?: string,
    description?: string,
    position?: NodePosition,
    properties?: Record<string, unknown>,
    waitType?: WaitType,
    options?: {
      duration?: number;
      condition?: WaitCondition;
      eventConfig?: EventWaitConfig;
      externalSignal?: string;
      checkInterval?: number;
      timeout?: number;
    }
  ): WaitNode {
    const now = Timestamp.now();
    const nodeId = ID.generate();

    const nodeProps: NodeProps = {
      id: nodeId,
      graphId,
      type,
      name,
      description,
      position,
      properties: properties || {},
      createdAt: now,
      updatedAt: now,
      version: Version.initial(),
      isDeleted: false
    };

    const props: WaitNodeProps = {
      ...nodeProps,
      waitType: waitType ?? WaitType.TIME,
      duration: options?.duration,
      condition: options?.condition,
      eventConfig: options?.eventConfig,
      externalSignal: options?.externalSignal,
      checkInterval: options?.checkInterval ?? 1000,
      timeout: options?.timeout
    };

    return new WaitNode(props);
  }

  /**
   * 从已有属性重建等待节点
   */
  public static override fromProps(props: WaitNodeProps): WaitNode {
    return new WaitNode(props);
  }

  /**
   * 获取等待类型
   */
  public get waitType(): WaitType {
    return this.waitProps.waitType;
  }

  /**
   * 获取等待时长
   */
  public get duration(): number | undefined {
    return this.waitProps.duration;
  }

  /**
   * 获取等待条件
   */
  public get condition(): WaitCondition | undefined {
    return this.waitProps.condition;
  }

  /**
   * 获取事件等待配置
   */
  public get eventConfig(): EventWaitConfig | undefined {
    return this.waitProps.eventConfig;
  }

  /**
   * 获取外部信号
   */
  public get externalSignal(): string | undefined {
    return this.waitProps.externalSignal;
  }

  /**
   * 获取检查间隔
   */
  public get checkInterval(): number {
    return this.waitProps.checkInterval ?? 1000;
  }

  /**
   * 获取超时时间
   */
  public get timeout(): number | undefined {
    return this.waitProps.timeout;
  }

  /**
   * 设置等待时长
   */
  public setDuration(duration: number): WaitNode {
    if (duration <= 0) {
      throw new DomainError('等待时长必须大于0');
    }
    return new WaitNode({
      ...this.waitProps,
      duration,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * 设置等待条件
   */
  public setCondition(condition: WaitCondition): WaitNode {
    return new WaitNode({
      ...this.waitProps,
      condition,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * 设置事件等待配置
   */
  public setEventConfig(eventConfig: EventWaitConfig): WaitNode {
    return new WaitNode({
      ...this.waitProps,
      eventConfig,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * 设置外部信号
   */
  public setExternalSignal(externalSignal: string): WaitNode {
    return new WaitNode({
      ...this.waitProps,
      externalSignal,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * 设置检查间隔
   */
  public setCheckInterval(checkInterval: number): WaitNode {
    if (checkInterval <= 0) {
      throw new DomainError('检查间隔必须大于0');
    }
    return new WaitNode({
      ...this.waitProps,
      checkInterval,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * 设置超时时间
   */
  public setTimeout(timeout: number): WaitNode {
    if (timeout <= 0) {
      throw new DomainError('超时时间必须大于0');
    }
    return new WaitNode({
      ...this.waitProps,
      timeout,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * 检查是否为时间等待
   */
  public isTimeWait(): boolean {
    return this.waitProps.waitType === WaitType.TIME;
  }

  /**
   * 检查是否为条件等待
   */
  public isConditionWait(): boolean {
    return this.waitProps.waitType === WaitType.CONDITION;
  }

  /**
   * 检查是否为事件等待
   */
  public isEventWait(): boolean {
    return this.waitProps.waitType === WaitType.EVENT;
  }

  /**
   * 检查是否为外部信号等待
   */
  public isExternalWait(): boolean {
    return this.waitProps.waitType === WaitType.EXTERNAL;
  }

  /**
   * 开始等待
   */
  public startWait(state: WorkflowState): WorkflowState {
    const waitStartTime = new Date();

    return state.setData('waitStartTime', waitStartTime)
      .setData('waitActive', true)
      .setData('waitType', this.waitProps.waitType);
  }

  /**
   * 检查等待是否完成
   */
  public async checkWaitComplete(state: WorkflowState): Promise<{
    completed: boolean;
    reason?: string;
    error?: Error;
  }> {
    try {
      switch (this.waitProps.waitType) {
        case WaitType.TIME:
          return this.checkTimeWait(state);
        case WaitType.CONDITION:
          return this.checkConditionWait(state);
        case WaitType.EVENT:
          return this.checkEventWait(state);
        case WaitType.EXTERNAL:
          return this.checkExternalWait(state);
        default:
          return {
            completed: false,
            error: new Error(`未知的等待类型: ${this.waitProps.waitType}`)
          };
      }
    } catch (error) {
      return {
        completed: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * 检查时间等待
   */
  private checkTimeWait(state: WorkflowState): {
    completed: boolean;
    reason?: string;
  } {
    const waitStartTime = state.getData('waitStartTime') as Date;
    const duration = this.waitProps.duration;

    if (!waitStartTime || !duration) {
      return {
        completed: false,
        reason: '等待开始时间或时长未设置'
      };
    }

    const elapsed = Date.now() - waitStartTime.getTime();
    const completed = elapsed >= duration;

    return {
      completed,
      reason: completed ? '等待时间已到' : undefined
    };
  }

  /**
   * 检查条件等待
   */
  private async checkConditionWait(state: WorkflowState): Promise<{
    completed: boolean;
    reason?: string;
  }> {
    const condition = this.waitProps.condition;
    if (!condition) {
      return {
        completed: false,
        reason: '等待条件未设置'
      };
    }

    try {
      const result = this.evaluateCondition(condition, state);
      return {
        completed: result,
        reason: result ? '条件已满足' : '条件未满足'
      };
    } catch (error) {
      return {
        completed: false,
        reason: `条件评估失败: ${error}`
      };
    }
  }

  /**
   * 检查事件等待
   */
  private checkEventWait(state: WorkflowState): {
    completed: boolean;
    reason?: string;
  } {
    const eventConfig = this.waitProps.eventConfig;
    if (!eventConfig) {
      return {
        completed: false,
        reason: '事件等待配置未设置'
      };
    }

    // 检查是否有匹配的事件
    const events = state.getData('events') as any[] || [];
    const matchingEvent = events.find(event =>
      event.type === eventConfig.eventType &&
      (!eventConfig.source || event.source === eventConfig.source)
    );

    return {
      completed: !!matchingEvent,
      reason: matchingEvent ? '等待的事件已到达' : '等待的事件未到达'
    };
  }

  /**
   * 检查外部信号等待
   */
  private checkExternalWait(state: WorkflowState): {
    completed: boolean;
    reason?: string;
  } {
    const externalSignal = this.waitProps.externalSignal;
    if (!externalSignal) {
      return {
        completed: false,
        reason: '外部信号未设置'
      };
    }

    const signals = state.getData('externalSignals') as Record<string, boolean> || {};
    const signalReceived = signals[externalSignal];

    return {
      completed: !!signalReceived,
      reason: signalReceived ? '外部信号已接收' : '外部信号未接收'
    };
  }

  /**
   * 评估条件
   */
  private evaluateCondition(condition: WaitCondition, state: WorkflowState): boolean {
    // 简单的条件评估实现
    // 在实际应用中，这里应该使用更复杂的表达式解析器
    const expression = condition.expression;
    const parameters = condition.parameters || {};

    // 替换表达式中的变量
    let evaluatedExpression = expression;
    for (const [key, value] of Object.entries(parameters)) {
      evaluatedExpression = evaluatedExpression.replace(
        new RegExp(`\\$\\{${key}\\}`, 'g'),
        String(value)
      );
    }

    // 从状态中获取变量
    for (const [key, value] of Object.entries(state.data)) {
      evaluatedExpression = evaluatedExpression.replace(
        new RegExp(`\\$\\{${key}\\}`, 'g'),
        String(value)
      );
    }

    // 简单的表达式评估
    return this.evaluateSimpleExpression(evaluatedExpression);
  }

  /**
   * 评估简单表达式
   */
  private evaluateSimpleExpression(expression: string): boolean {
    // 支持基本的比较操作：==, !=, >, <, >=, <=
    const operators = ['>=', '<=', '==', '!=', '>', '<'];

    for (const op of operators) {
      if (expression.includes(op)) {
        const [left, right] = expression.split(op).map(s => s.trim());
        const leftValue = this.parseValue(left || '');
        const rightValue = this.parseValue(right || '');

        switch (op) {
          case '==':
            return leftValue === rightValue;
          case '!=':
            return leftValue !== rightValue;
          case '>':
            return typeof leftValue === 'number' && typeof rightValue === 'number' && leftValue > rightValue;
          case '<':
            return typeof leftValue === 'number' && typeof rightValue === 'number' && leftValue < rightValue;
          case '>=':
            return typeof leftValue === 'number' && typeof rightValue === 'number' && leftValue >= rightValue;
          case '<=':
            return typeof leftValue === 'number' && typeof rightValue === 'number' && leftValue <= rightValue;
        }
      }
    }

    // 如果没有比较操作符，尝试解析为布尔值
    const boolValue = this.parseValue(expression);
    return Boolean(boolValue);
  }

  /**
   * 解析值
   */
  private parseValue(value: string): unknown {
    // 移除引号
    if (value.startsWith('"') && value.endsWith('"')) {
      return value.slice(1, -1);
    }
    if (value.startsWith("'") && value.endsWith("'")) {
      return value.slice(1, -1);
    }

    // 尝试解析为数字
    const numValue = Number(value);
    if (!isNaN(numValue)) {
      return numValue;
    }

    // 尝试解析为布尔值
    if (value.toLowerCase() === 'true') {
      return true;
    }
    if (value.toLowerCase() === 'false') {
      return false;
    }

    // 返回原始字符串
    return value;
  }

  /**
   * 检查等待是否超时
   */
  public checkWaitTimeout(state: WorkflowState): boolean {
    const timeout = this.waitProps.timeout;
    if (!timeout) {
      return false;
    }

    const waitStartTime = state.getData('waitStartTime') as Date;
    if (!waitStartTime) {
      return false;
    }

    const elapsed = Date.now() - waitStartTime.getTime();
    return elapsed >= timeout;
  }

  /**
   * 结束等待
   */
  public endWait(state: WorkflowState): WorkflowState {
    return state.setData('waitActive', false)
      .setData('waitEndTime', new Date());
  }

  /**
   * 获取等待统计信息
   */
  public getWaitStats(state: WorkflowState): {
    startTime?: Date;
    endTime?: Date;
    duration?: number;
    isActive: boolean;
    type: WaitType;
  } {
    const startTime = state.getData('waitStartTime') as Date;
    const endTime = state.getData('waitEndTime') as Date;
    const isActive = state.getData('waitActive') as boolean || false;

    let duration: number | undefined;
    if (startTime && endTime) {
      duration = endTime.getTime() - startTime.getTime();
    } else if (startTime && isActive) {
      duration = Date.now() - startTime.getTime();
    }

    return {
      startTime,
      endTime,
      duration,
      isActive,
      type: this.waitProps.waitType
    };
  }

  /**
   * 验证等待节点
   */
  public validateWaitNode(): string[] {
    const errors: string[] = [];

    if (!Object.values(WaitType).includes(this.waitProps.waitType)) {
      errors.push('无效的等待类型');
    }

    if (this.waitProps.waitType === WaitType.TIME && !this.waitProps.duration) {
      errors.push('时间等待必须设置等待时长');
    }

    if (this.waitProps.waitType === WaitType.CONDITION && !this.waitProps.condition) {
      errors.push('条件等待必须设置等待条件');
    }

    if (this.waitProps.waitType === WaitType.EVENT && !this.waitProps.eventConfig) {
      errors.push('事件等待必须设置事件配置');
    }

    if (this.waitProps.waitType === WaitType.EXTERNAL && !this.waitProps.externalSignal) {
      errors.push('外部信号等待必须设置外部信号');
    }

    if (this.waitProps.duration && this.waitProps.duration <= 0) {
      errors.push('等待时长必须大于0');
    }

    if (this.waitProps.checkInterval && this.waitProps.checkInterval <= 0) {
      errors.push('检查间隔必须大于0');
    }

    if (this.waitProps.timeout && this.waitProps.timeout <= 0) {
      errors.push('超时时间必须大于0');
    }

    return errors;
  }

  /**
   * 验证实体的有效性
   */
  public override validate(): void {
    super.validate();

    const waitErrors = this.validateWaitNode();
    if (waitErrors.length > 0) {
      throw new DomainError(`等待节点验证失败: ${waitErrors.join(', ')}`);
    }
  }
}