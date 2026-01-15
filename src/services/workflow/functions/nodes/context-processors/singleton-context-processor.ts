import { PromptContext } from '@/domain/workflow/value-objects/context/prompt-context';

/**
 * 静态上下文处理器基类
 *
 * 适用于逻辑完全固定、无需配置的上下文处理器
 * 特点：
 * - 过滤规则硬编码，不需要从配置文件读取参数
 * - 适合预实例化，使用单例模式
 * - 性能最优，无配置加载开销
 *
 * 使用场景：
 * - human-context：过滤 user.*、human.*、input.* 变量
 * - system-context：过滤 system.*、config.*、env.* 变量
 * - tool-context：过滤 tool.*、function.* 变量
 * - llm-context：过滤 llm.*、prompt.*、model.* 变量
 */
export abstract class SingletonContextProcessor {
  /**
   * 处理器名称
   */
  abstract readonly name: string;

  /**
   * 处理器描述
   */
  abstract readonly description: string;

  /**
   * 处理器版本
   */
  readonly version: string = '1.0.0';

  /**
   * 执行上下文处理
   *
   * @param context 提示词上下文
   * @param variables 变量映射
   * @param config 处理器配置（静态处理器通常忽略此参数）
   * @returns 处理后的上下文（包含context和variables）
   */
  abstract process(
    context: PromptContext,
    variables: Map<string, unknown>,
    config?: Record<string, unknown>
  ): { context: PromptContext; variables: Map<string, unknown> };

  /**
   * 验证配置参数
   * 静态处理器通常不需要配置，返回默认验证结果
   */
  validateConfig?(config: Record<string, unknown>): { valid: boolean; errors: string[] } {
    return { valid: true, errors: [] };
  }

  /**
   * 转换为 ContextProcessor 函数
   *
   * @returns ContextProcessor 函数
   */
  toProcessor(): (
    context: PromptContext,
    variables: Map<string, unknown>,
    config?: Record<string, unknown>
  ) => { context: PromptContext; variables: Map<string, unknown> } {
    return (context: PromptContext, variables: Map<string, unknown>, config?: Record<string, unknown>) => {
      return this.process(context, variables, config);
    };
  }

  /**
   * 获取处理器元数据
   */
  getMetadata(): {
    name: string;
    description: string;
    version: string;
  } {
    return {
      name: this.name,
      description: this.description,
      version: this.version,
    };
  }
}