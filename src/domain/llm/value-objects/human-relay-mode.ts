/**
 * HumanRelay模式值对象
 * 
 * 定义HumanRelay支持的操作模式
 */

export enum HumanRelayMode {
  /**
   * 单轮对话模式
   * 每次交互都是独立的，不保留历史记录
   */
  SINGLE = 'single',
  
  /**
   * 多轮对话模式
   * 保留对话历史，支持上下文相关的多轮交互
   */
  MULTI = 'multi'
}

/**
 * HumanRelay模式工具类
 */
export class HumanRelayModeUtils {
  /**
   * 验证模式是否有效
   */
  public static isValid(mode: string): mode is HumanRelayMode {
    return Object.values(HumanRelayMode).includes(mode as HumanRelayMode);
  }

  /**
   * 获取所有可用模式
   */
  public static getAllModes(): HumanRelayMode[] {
    return Object.values(HumanRelayMode);
  }

  /**
   * 获取模式的描述
   */
  public static getDescription(mode: HumanRelayMode): string {
    switch (mode) {
      case HumanRelayMode.SINGLE:
        return '单轮对话模式 - 每次交互独立，不保留历史';
      case HumanRelayMode.MULTI:
        return '多轮对话模式 - 保留对话历史，支持上下文交互';
      default:
        return '未知模式';
    }
  }

  /**
   * 检查模式是否支持历史记录
   */
  public static supportsHistory(mode: HumanRelayMode): boolean {
    return mode === HumanRelayMode.MULTI;
  }

  /**
   * 检查模式是否需要会话持久化
   */
  public static requiresPersistence(mode: HumanRelayMode): boolean {
    return mode === HumanRelayMode.MULTI;
  }
}