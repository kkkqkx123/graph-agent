import { WorkflowFunctionType } from '../../../../domain/workflow/value-objects/function-type';

/**
 * Hook函数基类
 *
 * 提供纯执行逻辑的函数基类，不定义具体的hook点。
 * Hook点由Hook实体定义，此类仅提供可复用的执行逻辑。
 *
 * 设计原则：
 * - 不关心在哪个hook点执行
 * - 只关注执行逻辑本身
 * - 可以被多个Hook实体复用
 */
export abstract class BaseHookFunction {
  /**
   * 函数的唯一标识符
   */
  abstract readonly id: string;

  /**
   * 函数名称
   */
  abstract readonly name: string;

  /**
   * 函数描述
   */
  abstract readonly description: string;

  /**
   * 函数版本
   */
  readonly version: string = '1.0.0';

  /**
   * 函数类型标识
   */
  readonly type: WorkflowFunctionType = WorkflowFunctionType.HOOK;

  /**
   * 执行函数逻辑
   *
   * @param context - 执行上下文
   * @param config - 函数配置参数
   * @returns 执行结果
   */
  abstract execute(context: any, config?: Record<string, any>): Promise<any>;

  /**
   * 验证配置参数
   *
   * @param config - 待验证的配置
   * @returns 验证结果
   */
  validateConfig?(config: Record<string, any>): { valid: boolean; errors: string[] };

  /**
   * 获取函数元数据
   */
  getMetadata(): HookFunctionMetadata {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      version: this.version,
    };
  }
}

/**
 * Hook函数元数据接口
 */
export interface HookFunctionMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
}

/**
 * Hook函数执行结果接口
 */
export interface HookFunctionResult {
  success: boolean;
  data?: any;
  error?: Error | string;
  executionTime?: number;
  shouldContinue?: boolean;
}

/**
 * 创建Hook函数执行结果的辅助函数
 */
export function createHookFunctionResult(
  success: boolean,
  data?: any,
  error?: Error | string,
  executionTime?: number,
  shouldContinue: boolean = true
): HookFunctionResult {
  return {
    success,
    data,
    error,
    executionTime,
    shouldContinue,
  };
}
