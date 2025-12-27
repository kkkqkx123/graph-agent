import { HookPoint } from '@domain/workflow/value-objects/hook-point';
import { HookContext } from './hook-context';
import { HookExecutionResult, HookExecutionResultBuilder } from './hook-execution-result';

/**
 * 基础钩子抽象类
 * 
 * 所有钩子都应该继承此类
 */
export abstract class BaseHook {
  /**
   * 钩子ID
   */
  private readonly id: string;

  /**
   * 钩子点
   */
  private readonly hookPoint: HookPoint;

  /**
   * 钩子是否启用
   */
  private enabled: boolean;

  /**
   * 钩子优先级
   */
  private priority: number;

  /**
   * 钩子元数据
   */
  private metadata: Record<string, unknown>;

  /**
   * 构造函数
   */
  constructor(id: string, hookPoint: HookPoint) {
    this.id = id;
    this.hookPoint = hookPoint;
    this.enabled = true;
    this.priority = 0;
    this.metadata = {};
  }

  /**
   * 获取钩子ID
   */
  public getId(): string {
    return this.id;
  }

  /**
   * 获取钩子点
   */
  public getHookPoint(): HookPoint {
    return this.hookPoint;
  }

  /**
   * 检查钩子是否启用
   */
  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * 设置钩子启用状态
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * 获取钩子优先级
   */
  public getPriority(): number {
    return this.priority;
  }

  /**
   * 设置钩子优先级
   */
  public setPriority(priority: number): void {
    this.priority = priority;
  }

  /**
   * 获取钩子元数据
   */
  public getMetadata(): Record<string, unknown> {
    return { ...this.metadata };
  }

  /**
   * 设置钩子元数据
   */
  public setMetadata(metadata: Record<string, unknown>): void {
    this.metadata = { ...metadata };
  }

  /**
   * 添加元数据
   */
  public addMetadata(key: string, value: unknown): void {
    this.metadata[key] = value;
  }

  /**
   * 执行钩子
   */
  public async execute(context: HookContext): Promise<HookExecutionResult> {
    if (!this.enabled) {
      return HookExecutionResultBuilder.skipped(this.id, '钩子已禁用');
    }

    if (!this.shouldExecute(context)) {
      return HookExecutionResultBuilder.skipped(this.id, '钩子条件不满足');
    }

    const startTime = Date.now();

    try {
      const result = await this.onExecute(context);
      const executionTime = Date.now() - startTime;
      return HookExecutionResultBuilder.success(this.id, result, executionTime);
    } catch (error) {
      const executionTime = Date.now() - startTime;
      return HookExecutionResultBuilder.failure(this.id, error as Error, executionTime);
    }
  }

  /**
   * 检查钩子是否应该执行
   */
  public shouldExecute(context: HookContext): boolean {
    return true;
  }

  /**
   * 子类实现的执行方法
   */
  protected abstract onExecute(context: HookContext): Promise<any>;

  /**
   * 比较钩子优先级
   */
  public static compareByPriority(a: BaseHook, b: BaseHook): number {
    return b.getPriority() - a.getPriority();
  }

  /**
   * 比较钩子ID
   */
  public static compareById(a: BaseHook, b: BaseHook): number {
    return a.getId().localeCompare(b.getId());
  }
}