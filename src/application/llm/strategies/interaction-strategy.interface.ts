/**
 * 用户交互策略接口
 *
 * 定义用户交互的抽象接口，支持多种交互方式
 */

/**
 * 交互类型枚举
 */
export enum InteractionType {
  TERMINAL = 'terminal',
  WEB = 'web',
  API = 'api'
}

/**
 * 用户交互策略接口
 */
export interface IInteractionStrategy {
  /**
   * 提示用户并获取输入
   * @param prompt 提示内容
   * @param timeout 超时时间（毫秒）
   * @returns 用户输入
   */
  promptUser(prompt: string, timeout: number): Promise<string>;

  /**
   * 关闭交互
   */
  close(): Promise<void>;

  /**
   * 获取策略类型
   */
  getType(): InteractionType;
}