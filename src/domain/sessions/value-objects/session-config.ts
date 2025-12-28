import { ValueObject } from '../../common/value-objects';
/**
 * 会话配置接口
 */
export interface SessionConfigProps {
  maxDuration: number; // 最大持续时间（分钟）
  maxMessages: number; // 最大消息数量
  autoSave: boolean; // 是否自动保存
  enableHistory: boolean; // 是否启用历史记录
  timeoutMinutes: number; // 超时时间（分钟）
  [key: string]: unknown;
}

/**
 * 会话配置值对象
 * 
 * 用于表示会话的配置信息
 */
export class SessionConfig extends ValueObject<SessionConfigProps> {
  /**
   * 创建默认配置
   * @returns 默认配置实例
   */
  public static default(): SessionConfig {
    return new SessionConfig({
      maxDuration: 60, // 60分钟
      maxMessages: 1000,
      autoSave: true,
      enableHistory: true,
      timeoutMinutes: 30
    });
  }

  /**
   * 创建自定义配置
   * @param config 配置参数
   * @returns 配置实例
   */
  public static create(config: Partial<SessionConfigProps>): SessionConfig {
    const defaultConfig = this.default();
    return new SessionConfig({
      ...defaultConfig.value,
      ...config
    });
  }

  /**
   * 获取最大持续时间
   * @returns 最大持续时间（分钟）
   */
  public getMaxDuration(): number {
    return this.props.maxDuration;
  }

  /**
   * 获取最大消息数量
   * @returns 最大消息数量
   */
  public getMaxMessages(): number {
    return this.props.maxMessages;
  }

  /**
   * 检查是否启用自动保存
   * @returns 是否启用自动保存
   */
  public isAutoSaveEnabled(): boolean {
    return this.props.autoSave;
  }

  /**
   * 检查是否启用历史记录
   * @returns 是否启用历史记录
   */
  public isHistoryEnabled(): boolean {
    return this.props.enableHistory;
  }

  /**
   * 获取超时时间
   * @returns 超时时间（分钟）
   */
  public getTimeoutMinutes(): number {
    return this.props.timeoutMinutes;
  }

  /**
   * 更新配置
   * @param updates 更新的配置
   * @returns 新的配置实例
   */
  public update(updates: Partial<SessionConfigProps>): SessionConfig {
    return new SessionConfig({
      ...this.props,
      ...updates
    });
  }

  /**
   * 比较两个配置是否相等
   * @param config 另一个配置
   * @returns 是否相等
   */
  public override equals(config?: SessionConfig): boolean {
    if (config === null || config === undefined) {
      return false;
    }
    return (
      this.props.maxDuration === config.getMaxDuration() &&
      this.props.maxMessages === config.getMaxMessages() &&
      this.props.autoSave === config.isAutoSaveEnabled() &&
      this.props.enableHistory === config.isHistoryEnabled() &&
      this.props.timeoutMinutes === config.getTimeoutMinutes()
    );
  }

  /**
   * 验证配置的有效性
   */
  public validate(): void {
    if (this.props.maxDuration <= 0) {
      throw new Error('最大持续时间必须大于0');
    }

    if (this.props.maxMessages <= 0) {
      throw new Error('最大消息数量必须大于0');
    }

    if (this.props.timeoutMinutes <= 0) {
      throw new Error('超时时间必须大于0');
    }

    if (this.props.timeoutMinutes > this.props.maxDuration) {
      throw new Error('超时时间不能大于最大持续时间');
    }
  }

  /**
   * 获取配置的字符串表示
   * @returns 字符串表示
   */
  public override toString(): string {
    return JSON.stringify(this.props);
  }
}