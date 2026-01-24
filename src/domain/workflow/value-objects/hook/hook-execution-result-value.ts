import { ValueObject } from '../../../common/value-objects';
import { ValidationError } from '../../../common/exceptions';

/**
 * 钩子执行结果值对象属性接口
 */
export interface HookExecutionResultProps {
  hookId: string;
  success: boolean;
  output?: any;
  error?: string;
  metadata?: Record<string, any>;
  shouldContinue: boolean;
  executionTime: number;
}

/**
 * 钩子执行结果值对象
 *
 * 表示钩子执行的结果
 */
export class HookExecutionResultValue extends ValueObject<HookExecutionResultProps> {
  constructor(props: HookExecutionResultProps) {
    super(props);
    this.validate();
  }

  /**
   * 验证钩子执行结果
   */
  public validate(): void {
    if (!this.props.hookId || this.props.hookId.trim() === '') {
      throw new ValidationError('钩子ID不能为空');
    }
    if (this.props.executionTime < 0) {
      throw new ValidationError('执行时间不能为负数');
    }
    if (this.props.success && this.props.error) {
      throw new ValidationError('成功的执行结果不能包含错误信息');
    }
  }

  /**
   * 获取钩子ID
   */
  public getHookId(): string {
    return this.props.hookId;
  }

  /**
   * 检查执行是否成功
   */
  public isSuccess(): boolean {
    return this.props.success;
  }

  /**
   * 获取执行结果
   */
  public getOutput(): any {
    return this.props.output;
  }

  /**
   * 获取执行错误
   */
  public getError(): string | undefined {
    return this.props.error;
  }

  /**
   * 获取元数据
   */
  public getMetadata(): Record<string, any> | undefined {
    return this.props.metadata;
  }

  /**
   * 检查是否应该继续执行后续钩子
   */
  public shouldContinue(): boolean {
    return this.props.shouldContinue;
  }

  /**
   * 获取执行时间（毫秒）
   */
  public getExecutionTime(): number {
    return this.props.executionTime;
  }

  /**
   * 创建成功的执行结果
   */
  public static success(
    hookId: string,
    output: any,
    executionTime: number,
    shouldContinue: boolean = true,
    metadata?: Record<string, any>
  ): HookExecutionResultValue {
    return new HookExecutionResultValue({
      hookId,
      success: true,
      output,
      executionTime,
      shouldContinue,
      metadata,
    });
  }

  /**
   * 创建失败的执行结果
   */
  public static failure(
    hookId: string,
    error: string,
    executionTime: number,
    shouldContinue: boolean = false,
    metadata?: Record<string, any>
  ): HookExecutionResultValue {
    return new HookExecutionResultValue({
      hookId,
      success: false,
      error,
      executionTime,
      shouldContinue,
      metadata,
    });
  }

  /**
   * 创建跳过的执行结果
   */
  public static skipped(hookId: string, metadata?: Record<string, any>): HookExecutionResultValue {
    return new HookExecutionResultValue({
      hookId,
      success: true,
      executionTime: 0,
      shouldContinue: true,
      metadata: { ...metadata, skipped: true },
    });
  }

  /**
   * 比较两个执行结果是否相等
   */
  public override equals(vo?: ValueObject<HookExecutionResultProps>): boolean {
    if (!vo) return false;
    const other = vo as HookExecutionResultValue;
    return (
      this.props.hookId === other.props.hookId &&
      this.props.success === other.props.success &&
      this.props.executionTime === other.props.executionTime
    );
  }

  /**
   * 转换为字符串
   */
  public override toString(): string {
    return `HookExecutionResult(hookId=${this.props.hookId}, success=${this.props.success}, executionTime=${this.props.executionTime}ms)`;
  }

  /**
   * 转换为JSON
   */
  public toJSON(): Record<string, any> {
    return {
      hookId: this.props.hookId,
      success: this.props.success,
      output: this.props.output,
      error: this.props.error,
      metadata: this.props.metadata,
      shouldContinue: this.props.shouldContinue,
      executionTime: this.props.executionTime,
    };
  }
}