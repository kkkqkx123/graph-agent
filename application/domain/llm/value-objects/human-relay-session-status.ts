/**
 * HumanRelay会话状态值对象
 *
 * 定义HumanRelay会话的各种状态
 */

export enum HumanRelaySessionStatus {
  /**
   * 活跃状态
   * 会话正在运行，可以接收新的交互
   */
  ACTIVE = 'active',

  /**
   * 等待用户输入
   * 已发送提示给用户，等待用户响应
   */
  WAITING_FOR_USER = 'waiting_for_user',

  /**
   * 处理中
   * 正在处理用户输入或系统响应
   */
  PROCESSING = 'processing',

  /**
   * 已完成
   * 会话正常结束
   */
  COMPLETED = 'completed',

  /**
   * 超时
   * 用户响应超时
   */
  TIMEOUT = 'timeout',

  /**
   * 已取消
   * 会话被用户或系统取消
   */
  CANCELLED = 'cancelled',

  /**
   * 错误
   * 会话过程中发生错误
   */
  ERROR = 'error',
}

/**
 * HumanRelay会话状态工具类
 */
export class HumanRelaySessionStatusUtils {
  /**
   * 验证状态是否有效
   */
  public static isValid(status: string): status is HumanRelaySessionStatus {
    return Object.values(HumanRelaySessionStatus).includes(status as HumanRelaySessionStatus);
  }

  /**
   * 获取所有可用状态
   */
  public static getAllStatuses(): HumanRelaySessionStatus[] {
    return Object.values(HumanRelaySessionStatus);
  }

  /**
   * 获取状态的描述
   */
  public static getDescription(status: HumanRelaySessionStatus): string {
    switch (status) {
      case HumanRelaySessionStatus.ACTIVE:
        return '活跃 - 会话正在运行';
      case HumanRelaySessionStatus.WAITING_FOR_USER:
        return '等待用户 - 等待用户输入';
      case HumanRelaySessionStatus.PROCESSING:
        return '处理中 - 正在处理请求';
      case HumanRelaySessionStatus.COMPLETED:
        return '已完成 - 会话正常结束';
      case HumanRelaySessionStatus.TIMEOUT:
        return '超时 - 用户响应超时';
      case HumanRelaySessionStatus.CANCELLED:
        return '已取消 - 会话被取消';
      case HumanRelaySessionStatus.ERROR:
        return '错误 - 发生错误';
      default:
        return '未知状态';
    }
  }

  /**
   * 检查状态是否为终态
   */
  public static isTerminal(status: HumanRelaySessionStatus): boolean {
    return [
      HumanRelaySessionStatus.COMPLETED,
      HumanRelaySessionStatus.TIMEOUT,
      HumanRelaySessionStatus.CANCELLED,
      HumanRelaySessionStatus.ERROR,
    ].includes(status);
  }

  /**
   * 检查状态是否为活跃状态
   */
  public static isActive(status: HumanRelaySessionStatus): boolean {
    return [
      HumanRelaySessionStatus.ACTIVE,
      HumanRelaySessionStatus.WAITING_FOR_USER,
      HumanRelaySessionStatus.PROCESSING,
    ].includes(status);
  }

  /**
   * 检查状态是否可以接收新的交互
   */
  public static canAcceptInteraction(status: HumanRelaySessionStatus): boolean {
    return status === HumanRelaySessionStatus.ACTIVE;
  }

  /**
   * 检查状态是否正在等待用户
   */
  public static isWaitingForUser(status: HumanRelaySessionStatus): boolean {
    return status === HumanRelaySessionStatus.WAITING_FOR_USER;
  }

  /**
   * 获取状态转换规则
   */
  public static getValidTransitions(status: HumanRelaySessionStatus): HumanRelaySessionStatus[] {
    switch (status) {
      case HumanRelaySessionStatus.ACTIVE:
        return [
          HumanRelaySessionStatus.WAITING_FOR_USER,
          HumanRelaySessionStatus.COMPLETED,
          HumanRelaySessionStatus.CANCELLED,
          HumanRelaySessionStatus.ERROR,
        ];

      case HumanRelaySessionStatus.WAITING_FOR_USER:
        return [
          HumanRelaySessionStatus.PROCESSING,
          HumanRelaySessionStatus.TIMEOUT,
          HumanRelaySessionStatus.CANCELLED,
          HumanRelaySessionStatus.ERROR,
        ];

      case HumanRelaySessionStatus.PROCESSING:
        return [
          HumanRelaySessionStatus.ACTIVE,
          HumanRelaySessionStatus.COMPLETED,
          HumanRelaySessionStatus.ERROR,
        ];

      case HumanRelaySessionStatus.COMPLETED:
      case HumanRelaySessionStatus.TIMEOUT:
      case HumanRelaySessionStatus.CANCELLED:
      case HumanRelaySessionStatus.ERROR:
        return []; // 终态，无法转换

      default:
        return [];
    }
  }

  /**
   * 验证状态转换是否有效
   */
  public static isValidTransition(
    from: HumanRelaySessionStatus,
    to: HumanRelaySessionStatus
  ): boolean {
    return this.getValidTransitions(from).includes(to);
  }
}
