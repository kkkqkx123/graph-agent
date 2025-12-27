/**
 * 触发器类型枚举
 * 定义了图系统中可用的各种触发器类型
 */
export enum TriggerType {
  /** 时间触发器 - 基于时间计划触发 */
  TIME = 'time',
  /** 事件触发器 - 基于事件触发 */
  EVENT = 'event',
  /** 状态触发器 - 基于状态变化触发 */
  STATE = 'state',
  /** 条件触发器 - 基于条件满足触发 */
  CONDITION = 'condition',
  /** 外部触发器 - 基于外部信号触发 */
  EXTERNAL = 'external',
  /** 手动触发器 - 手动触发 */
  MANUAL = 'manual'
}

/**
 * 触发器类型工具类
 */
export class TriggerTypeUtils {
  /**
   * 检查是否为时间触发器
   */
  static isTimeTrigger(type: TriggerType): boolean {
    return type === TriggerType.TIME;
  }

  /**
   * 检查是否为事件触发器
   */
  static isEventTrigger(type: TriggerType): boolean {
    return type === TriggerType.EVENT;
  }

  /**
   * 检查是否为状态触发器
   */
  static isStateTrigger(type: TriggerType): boolean {
    return type === TriggerType.STATE;
  }

  /**
   * 检查是否为条件触发器
   */
  static isConditionTrigger(type: TriggerType): boolean {
    return type === TriggerType.CONDITION;
  }

  /**
   * 检查是否为外部触发器
   */
  static isExternalTrigger(type: TriggerType): boolean {
    return type === TriggerType.EXTERNAL;
  }

  /**
   * 检查是否为手动触发器
   */
  static isManualTrigger(type: TriggerType): boolean {
    return type === TriggerType.MANUAL;
  }

  /**
   * 获取所有触发器类型
   */
  static getAllTypes(): TriggerType[] {
    return Object.values(TriggerType);
  }

  /**
   * 获取触发器类型的显示名称
   */
  static getDisplayName(type: TriggerType): string {
    const displayNames = {
      [TriggerType.TIME]: '时间触发器',
      [TriggerType.EVENT]: '事件触发器',
      [TriggerType.STATE]: '状态触发器',
      [TriggerType.CONDITION]: '条件触发器',
      [TriggerType.EXTERNAL]: '外部触发器',
      [TriggerType.MANUAL]: '手动触发器'
    };
    return displayNames[type] || type;
  }

  /**
   * 获取触发器类型的描述
   */
  static getDescription(type: TriggerType): string {
    const descriptions = {
      [TriggerType.TIME]: '基于时间计划触发的触发器',
      [TriggerType.EVENT]: '基于事件触发的触发器',
      [TriggerType.STATE]: '基于状态变化触发的触发器',
      [TriggerType.CONDITION]: '基于条件满足触发的触发器',
      [TriggerType.EXTERNAL]: '基于外部信号触发的触发器',
      [TriggerType.MANUAL]: '手动触发的触发器'
    };
    return descriptions[type] || '未知触发器类型';
  }
}