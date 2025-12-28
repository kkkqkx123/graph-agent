import { ValueObject, ID } from '../../common/value-objects';
import { HookPointValue } from './hook-point';

/**
 * 钩子配置接口
 */
export interface HookConfig {
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
  errorHandling?: 'fail-fast' | 'continue-on-error' | 'retry';
  [key: string]: unknown;
}

/**
 * 钩子值对象属性接口
 */
export interface HookValueObjectProps {
  readonly id: ID;
  readonly hookPoint: HookPointValue;
  readonly name: string;
  readonly description?: string;
  readonly enabled: boolean;
  readonly priority: number;
  readonly config: HookConfig;
  readonly metadata: Record<string, unknown>;
}

/**
 * 钩子值对象
 * 封装钩子数据，提供类型安全和验证
 */
export class HookValueObject extends ValueObject<HookValueObjectProps> {
  /**
   * 创建钩子值对象
   */
  public static create(props: HookValueObjectProps): HookValueObject {
    // 验证
    if (!props.id) {
      throw new Error('钩子ID不能为空');
    }
    if (!props.hookPoint) {
      throw new Error('钩子点不能为空');
    }
    if (!props.name) {
      throw new Error('钩子名称不能为空');
    }

    return new HookValueObject(props);
  }

  /**
   * 获取钩子ID
   */
  public get id(): ID {
    return this.props.id;
  }

  /**
   * 获取钩子点
   */
  public get hookPoint(): HookPointValue {
    return this.props.hookPoint;
  }

  /**
   * 获取钩子名称
   */
  public get name(): string {
    return this.props.name;
  }

  /**
   * 获取钩子描述
   */
  public get description(): string | undefined {
    return this.props.description;
  }

  /**
   * 检查钩子是否启用
   */
  public get enabled(): boolean {
    return this.props.enabled;
  }

  /**
   * 获取钩子优先级
   */
  public get priority(): number {
    return this.props.priority;
  }

  /**
   * 获取钩子配置
   */
  public get config(): HookConfig {
    return { ...this.props.config };
  }

  /**
   * 获取钩子元数据
   */
  public get metadata(): Record<string, unknown> {
    return { ...this.props.metadata };
  }

  /**
   * 检查是否为执行前钩子
   */
  public isBeforeExecute(): boolean {
    return this.props.hookPoint.isBeforeExecute();
  }

  /**
   * 检查是否为执行后钩子
   */
  public isAfterExecute(): boolean {
    return this.props.hookPoint.isAfterExecute();
  }

  /**
   * 检查是否为错误钩子
   */
  public isError(): boolean {
    return this.props.hookPoint.isError();
  }

  /**
   * 检查是否为节点执行前钩子
   */
  public isBeforeNodeExecute(): boolean {
    return this.props.hookPoint.isBeforeNodeExecute();
  }

  /**
   * 检查是否为节点执行后钩子
   */
  public isAfterNodeExecute(): boolean {
    return this.props.hookPoint.isAfterNodeExecute();
  }

  /**
   * 检查是否为工作流开始钩子
   */
  public isWorkflowStart(): boolean {
    return this.props.hookPoint.isWorkflowStart();
  }

  /**
   * 检查是否为工作流结束钩子
   */
  public isWorkflowEnd(): boolean {
    return this.props.hookPoint.isWorkflowEnd();
  }

  /**
   * 检查是否为控制流钩子
   */
  public isControlFlow(): boolean {
    return this.props.hookPoint.isControlFlow();
  }

  /**
   * 检查是否为数据流钩子
   */
  public isDataFlow(): boolean {
    return this.props.hookPoint.isDataFlow();
  }

  /**
   * 检查是否为状态钩子
   */
  public isState(): boolean {
    return this.props.hookPoint.isState();
  }

  /**
   * 检查是否为生命周期钩子
   */
  public isLifecycle(): boolean {
    return this.props.hookPoint.isLifecycle();
  }

  /**
   * 检查是否为自定义钩子
   */
  public isCustom(): boolean {
    return this.props.hookPoint.isCustom();
  }

  /**
   * 检查是否应该执行
   */
  public shouldExecute(): boolean {
    return this.props.enabled;
  }

  /**
   * 获取超时时间
   */
  public getTimeout(): number | undefined {
    return this.props.config.timeout;
  }

  /**
   * 获取重试次数
   */
  public getRetryCount(): number {
    return this.props.config.retryCount || 0;
  }

  /**
   * 获取重试延迟
   */
  public getRetryDelay(): number {
    return this.props.config.retryDelay || 0;
  }

  /**
   * 获取错误处理策略
   */
  public getErrorHandling(): 'fail-fast' | 'continue-on-error' | 'retry' {
    return this.props.config.errorHandling || 'fail-fast';
  }

  /**
   * 检查是否应该重试
   */
  public shouldRetry(): boolean {
    return this.getErrorHandling() === 'retry' && this.getRetryCount() > 0;
  }

  /**
   * 检查是否应该在错误时继续
   */
  public shouldContinueOnError(): boolean {
    return this.getErrorHandling() === 'continue-on-error';
  }

  /**
   * 检查是否应该在错误时快速失败
   */
  public shouldFailFast(): boolean {
    return this.getErrorHandling() === 'fail-fast';
  }

  /**
   * 获取元数据值
   */
  public getMetadataValue(key: string): unknown {
    return this.props.metadata[key];
  }

  /**
   * 检查是否有元数据
   */
  public hasMetadata(key: string): boolean {
    return key in this.props.metadata;
  }

  /**
   * 验证值对象的有效性
   */
  public override validate(): void {
    if (!this.props.id) {
      throw new Error('钩子ID不能为空');
    }
    if (!this.props.hookPoint) {
      throw new Error('钩子点不能为空');
    }
    if (!this.props.name) {
      throw new Error('钩子名称不能为空');
    }

    this.props.hookPoint.validate();

    // 验证优先级
    if (this.props.priority < 0) {
      throw new Error('钩子优先级不能为负数');
    }

    // 验证配置
    if (this.props.config.timeout !== undefined && this.props.config.timeout < 0) {
      throw new Error('钩子超时时间不能为负数');
    }

    if (this.props.config.retryCount !== undefined && this.props.config.retryCount < 0) {
      throw new Error('钩子重试次数不能为负数');
    }

    if (this.props.config.retryDelay !== undefined && this.props.config.retryDelay < 0) {
      throw new Error('钩子重试延迟不能为负数');
    }

    // 验证错误处理策略
    const validErrorHandling = ['fail-fast', 'continue-on-error', 'retry'];
    if (this.props.config.errorHandling && !validErrorHandling.includes(this.props.config.errorHandling)) {
      throw new Error(`无效的错误处理策略: ${this.props.config.errorHandling}`);
    }
  }

  /**
   * 获取字符串表示
   */
  public override toString(): string {
    return `HookValueObject(id=${this.props.id.toString()}, hookPoint=${this.props.hookPoint.toString()}, name=${this.props.name}, enabled=${this.props.enabled}, priority=${this.props.priority})`;
  }

  /**
   * 比较钩子优先级
   */
  public compareByPriority(other: HookValueObject): number {
    return other.props.priority - this.props.priority;
  }

  /**
   * 比较钩子ID
   */
  public compareById(other: HookValueObject): number {
    return this.props.id.toString().localeCompare(other.props.id.toString());
  }
}