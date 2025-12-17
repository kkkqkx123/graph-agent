/**
 * HumanRelay模式值对象
 * 
 * 定义HumanRelay支持的操作模式
 */

export enum HumanRelayMode {
  /**
   * 单轮对话模式
   * 每次交互都提供完整的上下文（包括历史对话）
   * 适用于外部LLM无法保持会话状态的情况
   */
  SINGLE = 'single',
  
  /**
   * 多轮对话模式
   * 每次交互只提供增量内容（新消息）
   * 适用于外部LLM可以保持会话状态的情况
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
        return '单轮对话模式 - 每次提供完整上下文，适用于无状态LLM';
      case HumanRelayMode.MULTI:
        return '多轮对话模式 - 每次提供增量内容，适用于有状态LLM';
      default:
        return '未知模式';
    }
  }

  /**
   * 检查模式是否需要完整历史记录
   */
  public static requiresFullHistory(mode: HumanRelayMode): boolean {
    return mode === HumanRelayMode.SINGLE;
  }

  /**
   * 检查模式是否需要会话持久化
   */
  public static requiresPersistence(mode: HumanRelayMode): boolean {
    return mode === HumanRelayMode.MULTI;
  }
}