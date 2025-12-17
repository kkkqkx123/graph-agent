import { ValueObject } from '../../common/value-objects/value-object';
import { DomainError } from '../../common/errors/domain-error';
import { LLMRequest } from '../entities/llm-request';
import { LLMResponse } from '../entities/llm-response';
import { Echelon } from '../entities/task-group';
import { FallbackExhaustedException, FallbackConfigurationException } from '../exceptions';

/**
 * 降级策略类型枚举
 */
export enum FallbackStrategyType {
  ECHELON_DOWN = 'echelon_down',
  GROUP_FALLBACK = 'group_fallback',
  CUSTOM = 'custom'
}

/**
 * 降级策略值对象
 * 
 * 定义当主要资源不可用时的降级处理策略
 */
export class FallbackStrategy extends ValueObject<{
  type: FallbackStrategyType;
  options: Record<string, unknown>;
}> {
  private constructor(props: {
    type: FallbackStrategyType;
    options: Record<string, unknown>;
  }) {
    super(props);
    this.validate();
  }

  /**
   * 创建降级策略
   */
  public static create(
    type: FallbackStrategyType,
    options: Record<string, unknown> = {}
  ): FallbackStrategy {
    return new FallbackStrategy({ type, options });
  }

  /**
   * 创建层级降级策略
   */
  public static echelonDown(options: {
    maxAttempts?: number;
    retryDelay?: number;
    skipUnavailable?: boolean;
  } = {}): FallbackStrategy {
    return new FallbackStrategy({
      type: FallbackStrategyType.ECHELON_DOWN,
      options: {
        maxAttempts: options.maxAttempts || 3,
        retryDelay: options.retryDelay || 1000,
        skipUnavailable: options.skipUnavailable !== false
      }
    });
  }

  /**
   * 创建组降级策略
   */
  public static groupFallback(options: {
    fallbackGroups?: string[];
    maxAttempts?: number;
    retryDelay?: number;
    preserveOrder?: boolean;
  } = {}): FallbackStrategy {
    return new FallbackStrategy({
      type: FallbackStrategyType.GROUP_FALLBACK,
      options: {
        fallbackGroups: options.fallbackGroups || [],
        maxAttempts: options.maxAttempts || 3,
        retryDelay: options.retryDelay || 1000,
        preserveOrder: options.preserveOrder !== false
      }
    });
  }

  /**
   * 创建自定义降级策略
   */
  public static custom(options: {
    handler?: (request: LLMRequest, context: FallbackContext) => Promise<LLMResponse>;
    maxAttempts?: number;
    retryDelay?: number;
    timeout?: number;
  } = {}): FallbackStrategy {
    return new FallbackStrategy({
      type: FallbackStrategyType.CUSTOM,
      options: {
        handler: options.handler,
        maxAttempts: options.maxAttempts || 3,
        retryDelay: options.retryDelay || 1000,
        timeout: options.timeout || 30000
      }
    });
  }

  /**
   * 获取策略类型
   */
  public getType(): FallbackStrategyType {
    return this.props.type;
  }

  /**
   * 获取策略选项
   */
  public getOptions(): Record<string, unknown> {
    return { ...this.props.options };
  }

  /**
   * 获取特定选项值
   */
  public getOption<T>(key: string, defaultValue?: T): T {
    return (this.props.options[key] as T) ?? defaultValue;
  }

  /**
   * 执行降级策略
   */
  public async execute(
    request: LLMRequest,
    context: FallbackContext
  ): Promise<LLMResponse> {
    const maxAttempts = this.getOption<number>('maxAttempts', 3);
    const retryDelay = this.getOption<number>('retryDelay', 1000);
    
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        switch (this.props.type) {
          case FallbackStrategyType.ECHELON_DOWN:
            return await this.executeEchelonDown(request, context, attempt);
          case FallbackStrategyType.GROUP_FALLBACK:
            return await this.executeGroupFallback(request, context, attempt);
          case FallbackStrategyType.CUSTOM:
            return await this.executeCustom(request, context, attempt);
          default:
            throw new FallbackConfigurationException(`不支持的降级策略类型: ${this.props.type}`);
        }
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxAttempts && retryDelay > 0) {
          await this.delay(retryDelay);
        }
      }
    }

    throw new FallbackExhaustedException(
      `降级策略已耗尽，最大尝试次数: ${maxAttempts}。最后错误: ${lastError?.message}`
    );
  }

  private async executeEchelonDown(
    request: LLMRequest,
    context: FallbackContext,
    attempt: number
  ): Promise<LLMResponse> {
    const skipUnavailable = this.getOption<boolean>('skipUnavailable', true);
    const echelons = context.echelons;

    // 按优先级排序层级
    const sortedEchelons = Array.from(echelons.entries())
      .sort(([, a], [, b]) => a.getPriority() - b.getPriority());

    // 如果是重试，从失败的层级开始
    const startIndex = attempt > 1 ? this.findFailedEchelonIndex(sortedEchelons, context) : 0;

    for (let i = startIndex; i < sortedEchelons.length; i++) {
      const [echelonName, echelon] = sortedEchelons[i];
      
      if (skipUnavailable && !echelon.isAvailable()) {
        continue;
      }

      try {
        // 这里应该调用实际的LLM客户端
        // 暂时返回模拟响应
        return LLMResponse.create(
          context.requestId,
          `层级降级响应来自 ${echelonName} (尝试 ${attempt})`,
          {
            promptTokens: 100,
            completionTokens: 50,
            totalTokens: 150
          },
          'stop',
          {
            echelon: echelonName,
            attempt,
            strategy: 'echelon_down'
          }
        );
      } catch (error) {
        context.failedEchelons.add(echelonName);
        continue;
      }
    }

    throw new Error('所有层级都执行失败');
  }

  private async executeGroupFallback(
    request: LLMRequest,
    context: FallbackContext,
    attempt: number
  ): Promise<LLMResponse> {
    const fallbackGroups = this.getOption<string[]>('fallbackGroups', []);
    const preserveOrder = this.getOption<boolean>('preserveOrder', true);

    if (fallbackGroups.length === 0) {
      throw new Error('没有配置降级组');
    }

    // 如果是重试，从失败的组开始
    const startIndex = attempt > 1 ? this.findFailedGroupIndex(fallbackGroups, context) : 0;

    for (let i = startIndex; i < fallbackGroups.length; i++) {
      const groupName = fallbackGroups[i];
      
      if (context.failedGroups.has(groupName)) {
        continue;
      }

      try {
        // 这里应该调用其他任务组
        // 暂时返回模拟响应
        return LLMResponse.create(
          context.requestId,
          `组降级响应来自 ${groupName} (尝试 ${attempt})`,
          {
            promptTokens: 100,
            completionTokens: 50,
            totalTokens: 150
          },
          'stop',
          {
            group: groupName,
            attempt,
            strategy: 'group_fallback'
          }
        );
      } catch (error) {
        context.failedGroups.add(groupName);
        continue;
      }
    }

    throw new Error('所有降级组都执行失败');
  }

  private async executeCustom(
    request: LLMRequest,
    context: FallbackContext,
    attempt: number
  ): Promise<LLMResponse> {
    const handler = this.getOption<(request: LLMRequest, context: FallbackContext) => Promise<LLMResponse>>('handler');
    const timeout = this.getOption<number>('timeout', 30000);

    if (!handler) {
      throw new Error('自定义降级策略没有配置处理函数');
    }

    // 添加超时处理
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('自定义降级策略执行超时')), timeout);
    });

    try {
      return await Promise.race([
        handler(request, { ...context, attempt }),
        timeoutPromise
      ]);
    } catch (error) {
      throw new Error(`自定义降级策略执行失败: ${error}`);
    }
  }

  private findFailedEchelonIndex(
    sortedEchelons: [string, Echelon][],
    context: FallbackContext
  ): number {
    for (let i = 0; i < sortedEchelons.length; i++) {
      const [echelonName] = sortedEchelons[i];
      if (context.failedEchelons.has(echelonName)) {
        return i + 1; // 从下一个开始
      }
    }
    return 0;
  }

  private findFailedGroupIndex(
    fallbackGroups: string[],
    context: FallbackContext
  ): number {
    for (let i = 0; i < fallbackGroups.length; i++) {
      const groupName = fallbackGroups[i];
      if (context.failedGroups.has(groupName)) {
        return i + 1; // 从下一个开始
      }
    }
    return 0;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private validate(): void {
    if (!Object.values(FallbackStrategyType).includes(this.props.type)) {
      throw new DomainError(`无效的降级策略类型: ${this.props.type}`);
    }

    if (!this.props.options || typeof this.props.options !== 'object') {
      throw new DomainError('降级策略选项必须是对象');
    }

    // 验证特定策略的选项
    switch (this.props.type) {
      case FallbackStrategyType.ECHELON_DOWN:
        this.validateEchelonDownOptions();
        break;
      case FallbackStrategyType.GROUP_FALLBACK:
        this.validateGroupFallbackOptions();
        break;
      case FallbackStrategyType.CUSTOM:
        this.validateCustomOptions();
        break;
    }
  }

  private validateEchelonDownOptions(): void {
    const maxAttempts = this.getOption<number>('maxAttempts');
    if (maxAttempts !== undefined && maxAttempts < 1) {
      throw new DomainError('层级降级策略的最大尝试次数必须至少为1');
    }

    const retryDelay = this.getOption<number>('retryDelay');
    if (retryDelay !== undefined && retryDelay < 0) {
      throw new DomainError('层级降级策略的重试延迟不能为负数');
    }
  }

  private validateGroupFallbackOptions(): void {
    const fallbackGroups = this.getOption<string[]>('fallbackGroups');
    if (fallbackGroups !== undefined && (!Array.isArray(fallbackGroups) || fallbackGroups.length === 0)) {
      throw new DomainError('组降级策略必须配置至少一个降级组');
    }

    const maxAttempts = this.getOption<number>('maxAttempts');
    if (maxAttempts !== undefined && maxAttempts < 1) {
      throw new DomainError('组降级策略的最大尝试次数必须至少为1');
    }
  }

  private validateCustomOptions(): void {
    const handler = this.getOption<Function>('handler');
    if (handler !== undefined && typeof handler !== 'function') {
      throw new DomainError('自定义降级策略的处理函数必须是函数');
    }

    const timeout = this.getOption<number>('timeout');
    if (timeout !== undefined && timeout <= 0) {
      throw new DomainError('自定义降级策略的超时时间必须大于0');
    }
  }

  /**
   * 转换为JSON对象
   */
  public toJSON(): Record<string, unknown> {
    return {
      type: this.props.type,
      options: this.props.options
    };
  }

  /**
   * 从JSON对象创建降级策略
   */
  public static fromJSON(json: Record<string, unknown>): FallbackStrategy {
    const type = json.type as FallbackStrategyType;
    const options = (json.options as Record<string, unknown>) || {};
    
    if (!Object.values(FallbackStrategyType).includes(type)) {
      throw new DomainError(`无效的降级策略类型: ${type}`);
    }

    return new FallbackStrategy({ type, options });
  }

  /**
   * 比较两个降级策略是否相等
   */
  public override equals(other?: FallbackStrategy): boolean {
    if (other === null || other === undefined) {
      return false;
    }

    if (!(other instanceof FallbackStrategy)) {
      return false;
    }

    return (
      this.props.type === other.props.type &&
      JSON.stringify(this.props.options) === JSON.stringify(other.props.options)
    );
  }

  /**
   * 获取策略描述
   */
  public getDescription(): string {
    switch (this.props.type) {
      case FallbackStrategyType.ECHELON_DOWN:
        return '层级降级策略：从高优先级层级向低优先级层级降级';
      case FallbackStrategyType.GROUP_FALLBACK:
        return '组降级策略：在配置的降级组之间切换';
      case FallbackStrategyType.CUSTOM:
        return '自定义降级策略：使用自定义处理逻辑';
      default:
        return '未知策略';
    }
  }
}

/**
 * 降级上下文
 */
export interface FallbackContext {
  requestId: string;
  echelons: Map<string, Echelon>;
  failedEchelons: Set<string>;
  failedGroups: Set<string>;
  attempt?: number;
  metadata?: Record<string, unknown>;
}

/**
 * 降级策略工厂
 */
export class FallbackStrategyFactory {
  /**
   * 创建默认策略
   */
  public static createDefault(): FallbackStrategy {
    return FallbackStrategy.echelonDown();
  }

  /**
   * 根据配置创建策略
   */
  public static fromConfig(config: {
    type: string;
    options?: Record<string, unknown>;
  }): FallbackStrategy {
    const type = config.type as FallbackStrategyType;
    
    if (!Object.values(FallbackStrategyType).includes(type)) {
      throw new DomainError(`不支持的降级策略类型: ${type}`);
    }

    return FallbackStrategy.create(type, config.options || {});
  }

  /**
   * 获取所有可用的策略类型
   */
  public static getAvailableTypes(): FallbackStrategyType[] {
    return Object.values(FallbackStrategyType);
  }

  /**
   * 获取策略类型的描述
   */
  public static getTypeDescription(type: FallbackStrategyType): string {
    const strategy = FallbackStrategy.create(type);
    return strategy.getDescription();
  }
}