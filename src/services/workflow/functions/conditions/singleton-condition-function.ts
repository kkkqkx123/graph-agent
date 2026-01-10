import { WorkflowExecutionContext, ConditionFunctionConfig } from '../types';
import { WorkflowFunctionType } from '../../../../domain/workflow/value-objects/function-type';

/**
 * 单例条件函数基类
 *
 * 适用于逻辑完全固定、无需配置的条件函数
 * 特点：
 * - 条件逻辑硬编码，不需要从配置文件读取参数
 * - 适合预实例化，使用单例模式
 * - 性能最优，无配置加载开销
 * - 不使用依赖注入，直接实例化
 *
 * 使用场景：
 * - has_errors：检查是否有错误
 * - has_tool_calls：检查是否有工具调用
 * - has_tool_results：检查是否有工具结果
 * - no_tool_calls：检查是否没有工具调用
 *
 * 设计原则：
 * - 提供统一的条件函数接口
 * - 简化实现，无需配置管理
 * - 支持预实例化和单例模式
 */
export abstract class SingletonConditionFunction {
  /**
   * 函数ID（唯一标识符）
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
  public readonly type: WorkflowFunctionType = WorkflowFunctionType.CONDITION;

  /**
   * 执行条件判断（抽象方法，子类必须实现）
   *
   * @param context 执行上下文
   * @param config 配置参数（单例条件函数通常忽略此参数）
   * @returns 条件判断结果
   */
  abstract execute(context: WorkflowExecutionContext, config?: ConditionFunctionConfig): Promise<boolean>;

  /**
   * 获取函数元数据
   */
  getMetadata(): {
    id: string;
    name: string;
    description: string;
    version: string;
    type: WorkflowFunctionType;
  } {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      version: this.version,
      type: this.type,
    };
  }

  /**
   * 转换为条件函数
   *
   * @returns 条件函数
   */
  toConditionFunction(): (
    context: WorkflowExecutionContext,
    config?: ConditionFunctionConfig
  ) => Promise<boolean> {
    return (context: WorkflowExecutionContext, config?: ConditionFunctionConfig) => {
      return this.execute(context, config);
    };
  }
}