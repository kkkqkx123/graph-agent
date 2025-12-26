/**
 * 触发器实体实现
 * 
 * 本文件实现了图工作流中的触发器实体，使用函数式编程风格
 */

import {
  TriggerId,
  TriggerType,
  TriggerAction,
  TriggerStatus,
  TriggerConfig,
  createTriggerId,
  ExecutionContext,
  WorkflowEngine,
  TriggerFunction
} from '../types/workflow-types';

import { getTriggerFunction } from '../functions/triggers/trigger-functions';

/**
 * 触发器实体类
 */
export class TriggerImpl {
  private _id: TriggerId;
  private _type: TriggerType;
  private _name: string;
  private _config: TriggerConfig;
  private _action: TriggerAction;
  private _targetNodeId: string | undefined;
  private _status: TriggerStatus;
  private _triggeredAt: number | undefined;

  constructor(
    id: string,
    type: TriggerType,
    name: string,
    config: TriggerConfig,
    action: TriggerAction,
    targetNodeId?: string
  ) {
    this._id = createTriggerId(id);
    this._type = type;
    this._name = name;
    this._config = { ...config };
    this._action = action;
    this._targetNodeId = targetNodeId;
    this._status = TriggerStatus.ENABLED;
    this._triggeredAt = undefined;
  }

  /**
   * 获取触发器ID
   */
  get id(): TriggerId {
    return this._id;
  }

  /**
   * 获取触发器类型
   */
  get type(): TriggerType {
    return this._type;
  }

  /**
   * 获取触发器名称
   */
  get name(): string {
    return this._name;
  }

  /**
   * 获取触发器配置
   */
  get config(): TriggerConfig {
    return { ...this._config };
  }

  /**
   * 获取触发器动作
   */
  get action(): TriggerAction {
    return this._action;
  }

  /**
   * 获取目标节点ID
   */
  get targetNodeId(): string | undefined {
    return this._targetNodeId;
  }

  /**
   * 获取触发器状态
   */
  get status(): TriggerStatus {
    return this._status;
  }

  /**
   * 获取触发时间
   */
  get triggeredAt(): number | undefined {
    return this._triggeredAt;
  }

  /**
   * 启用触发器
   */
  enable(): void {
    this._status = TriggerStatus.ENABLED;
    this._triggeredAt = undefined;
  }

  /**
   * 禁用触发器
   */
  disable(): void {
    this._status = TriggerStatus.DISABLED;
  }

  /**
   * 获取输入Schema
   * 根据触发器类型返回不同的输入Schema
   */
  getInputSchema(): Record<string, any> {
    switch (this._type) {
      case TriggerType.TIME:
        return {
          type: 'object',
          properties: {
            triggerId: { type: 'string', description: '触发器ID' },
            delay: { type: 'number', description: '延迟毫秒数' },
            interval: { type: 'number', description: '间隔毫秒数' },
            cron: { type: 'string', description: 'Cron表达式' }
          },
          required: ['triggerId']
        };

      case TriggerType.EVENT:
        return {
          type: 'object',
          properties: {
            triggerId: { type: 'string', description: '触发器ID' },
            eventType: { type: 'string', description: '事件类型' },
            eventDataPattern: { type: 'object', description: '事件数据模式' }
          },
          required: ['triggerId', 'eventType']
        };

      case TriggerType.STATE:
        return {
          type: 'object',
          properties: {
            triggerId: { type: 'string', description: '触发器ID' },
            statePath: { type: 'string', description: '状态路径' },
            expectedValue: { type: 'any', description: '期望值' }
          },
          required: ['triggerId', 'statePath', 'expectedValue']
        };

      default:
        return {
          type: 'object',
          properties: {},
          required: []
        };
    }
  }

  /**
   * 获取输出Schema
   */
  getOutputSchema(): Record<string, any> {
    return {
      type: 'object',
      properties: {
        shouldTrigger: { type: 'boolean', description: '是否应该触发' },
        reason: { type: 'string', description: '原因说明' },
        metadata: { type: 'object', description: '元数据' }
      },
      required: ['shouldTrigger', 'reason']
    };
  }

  /**
   * 评估触发器是否应该触发
   * 使用函数式编程风格，调用对应的触发器函数
   * 
   * @param context 执行上下文
   * @returns 是否应该触发
   */
  async evaluate(context: ExecutionContext): Promise<boolean> {
    // 如果触发器被禁用，不触发
    if (this._status === TriggerStatus.DISABLED) {
      return false;
    }

    // 如果已经触发过，不重复触发
    if (this._status === TriggerStatus.TRIGGERED) {
      return false;
    }

    try {
      // 获取触发器函数
      const triggerFunction: TriggerFunction | undefined = getTriggerFunction(this._type.toString());

      if (!triggerFunction) {
        console.warn(`未找到触发器类型 ${this._type} 的函数`);
        return false;
      }

      // 准备输入
      const input = {
        triggerId: this._id.toString(),
        targetNodeId: this._targetNodeId
      };

      // 调用触发器函数
      const output = await triggerFunction(input, this._config, context);

      return output.shouldTrigger;
    } catch (error) {
      console.error(`评估触发器失败: ${this._id}`, error);
      return false;
    }
  }

  /**
   * 执行触发器动作
   * 
   * @param engine 工作流引擎
   */
  async executeAction(engine: WorkflowEngine): Promise<void> {
    // 标记为已触发
    this._status = TriggerStatus.TRIGGERED;
    this._triggeredAt = Date.now();

    try {
      switch (this._action) {
        case TriggerAction.START:
          // 启动工作流（由引擎处理）
          console.log(`触发器 ${this._id} 执行动作: START`);
          break;

        case TriggerAction.STOP:
          engine.stop();
          console.log(`触发器 ${this._id} 执行动作: STOP`);
          break;

        case TriggerAction.PAUSE:
          engine.pause();
          console.log(`触发器 ${this._id} 执行动作: PAUSE`);
          break;

        case TriggerAction.RESUME:
          engine.resume();
          console.log(`触发器 ${this._id} 执行动作: RESUME`);
          break;

        case TriggerAction.SKIP_NODE:
          if (this._targetNodeId) {
            console.log(`触发器 ${this._id} 执行动作: SKIP_NODE ${this._targetNodeId}`);
            // 跳过节点的逻辑由引擎处理
          }
          break;

        default:
          console.warn(`未知的触发器动作: ${this._action}`);
      }
    } catch (error) {
      console.error(`执行触发器动作失败: ${this._id}`, error);
    }
  }

  /**
   * 转换为字符串表示
   */
  toString(): string {
    return `Trigger(id=${this._id}, type=${this._type}, name=${this._name}, action=${this._action}, status=${this._status})`;
  }
}

/**
 * 创建触发器的工厂函数
 */
export function createTrigger(
  id: string,
  type: TriggerType,
  name: string,
  config: TriggerConfig,
  action: TriggerAction,
  targetNodeId?: string
): TriggerImpl {
  return new TriggerImpl(id, type, name, config, action, targetNodeId);
}

/**
 * 创建时间触发器
 */
export function createTimeTrigger(
  id: string,
  name: string,
  config: TriggerConfig,
  action: TriggerAction,
  targetNodeId?: string
): TriggerImpl {
  return new TriggerImpl(id, TriggerType.TIME, name, config, action, targetNodeId);
}

/**
 * 创建事件触发器
 */
export function createEventTrigger(
  id: string,
  name: string,
  config: TriggerConfig,
  action: TriggerAction,
  targetNodeId?: string
): TriggerImpl {
  return new TriggerImpl(id, TriggerType.EVENT, name, config, action, targetNodeId);
}

/**
 * 创建状态触发器
 */
export function createStateTrigger(
  id: string,
  name: string,
  config: TriggerConfig,
  action: TriggerAction,
  targetNodeId?: string
): TriggerImpl {
  return new TriggerImpl(id, TriggerType.STATE, name, config, action, targetNodeId);
}

/**
 * 创建超时触发器
 */
export function createTimeoutTrigger(
  id: string,
  delay: number,
  targetNodeId?: string
): TriggerImpl {
  return new TriggerImpl(
    id,
    TriggerType.TIME,
    `TimeoutTrigger_${id}`,
    { delay },
    TriggerAction.SKIP_NODE,
    targetNodeId
  );
}

/**
 * 创建错误触发器
 */
export function createErrorTrigger(
  id: string,
  nodeId: string
): TriggerImpl {
  return new TriggerImpl(
    id,
    TriggerType.STATE,
    `ErrorTrigger_${id}`,
    {
      statePath: `${nodeId}.status`,
      expectedValue: 'failed'
    },
    TriggerAction.STOP
  );
}

export { TriggerAction, TriggerType };