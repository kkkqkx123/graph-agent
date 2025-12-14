/**
 * 触发器状态枚举
 * 定义了触发器的生命周期状态
 */
export enum TriggerState {
  /** 未激活 - 触发器已创建但未激活 */
  INACTIVE = 'inactive',
  /** 激活 - 触发器已激活并监听触发条件 */
  ACTIVE = 'active',
  /** 暂停 - 触发器暂时暂停监听 */
  PAUSED = 'paused',
  /** 触发中 - 触发器正在执行触发逻辑 */
  TRIGGERING = 'triggering',
  /** 错误 - 触发器处于错误状态 */
  ERROR = 'error',
  /** 已禁用 - 触发器被禁用 */
  DISABLED = 'disabled'
}

/**
 * 触发器状态工具类
 */
export class TriggerStateUtils {
  /**
   * 检查是否为活跃状态
   */
  static isActive(state: TriggerState): boolean {
    return state === TriggerState.ACTIVE;
  }

  /**
   * 检查是否为非活跃状态
   */
  static isInactive(state: TriggerState): boolean {
    return state === TriggerState.INACTIVE;
  }

  /**
   * 检查是否为暂停状态
   */
  static isPaused(state: TriggerState): boolean {
    return state === TriggerState.PAUSED;
  }

  /**
   * 检查是否为触发中状态
   */
  static isTriggering(state: TriggerState): boolean {
    return state === TriggerState.TRIGGERING;
  }

  /**
   * 检查是否为错误状态
   */
  static isError(state: TriggerState): boolean {
    return state === TriggerState.ERROR;
  }

  /**
   * 检查是否为禁用状态
   */
  static isDisabled(state: TriggerState): boolean {
    return state === TriggerState.DISABLED;
  }

  /**
   * 检查是否可以激活
   */
  static canActivate(state: TriggerState): boolean {
    return state === TriggerState.INACTIVE || state === TriggerState.PAUSED || state === TriggerState.ERROR;
  }

  /**
   * 检查是否可以暂停
   */
  static canPause(state: TriggerState): boolean {
    return state === TriggerState.ACTIVE || state === TriggerState.TRIGGERING;
  }

  /**
   * 检查是否可以禁用
   */
  static canDisable(state: TriggerState): boolean {
    return state !== TriggerState.DISABLED;
  }

  /**
   * 检查是否可以启用
   */
  static canEnable(state: TriggerState): boolean {
    return state === TriggerState.DISABLED;
  }

  /**
   * 获取所有状态
   */
  static getAllStates(): TriggerState[] {
    return Object.values(TriggerState);
  }

  /**
   * 获取状态的显示名称
   */
  static getDisplayName(state: TriggerState): string {
    const displayNames = {
      [TriggerState.INACTIVE]: '未激活',
      [TriggerState.ACTIVE]: '激活',
      [TriggerState.PAUSED]: '暂停',
      [TriggerState.TRIGGERING]: '触发中',
      [TriggerState.ERROR]: '错误',
      [TriggerState.DISABLED]: '已禁用'
    };
    return displayNames[state] || state;
  }

  /**
   * 获取状态的描述
   */
  static getDescription(state: TriggerState): string {
    const descriptions = {
      [TriggerState.INACTIVE]: '触发器已创建但未激活',
      [TriggerState.ACTIVE]: '触发器已激活并监听触发条件',
      [TriggerState.PAUSED]: '触发器暂时暂停监听',
      [TriggerState.TRIGGERING]: '触发器正在执行触发逻辑',
      [TriggerState.ERROR]: '触发器处于错误状态',
      [TriggerState.DISABLED]: '触发器被禁用'
    };
    return descriptions[state] || '未知触发器状态';
  }
}