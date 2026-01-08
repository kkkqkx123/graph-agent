import { PromptContext, ContextProcessor } from '../../../../domain/workflow/value-objects/context/prompt-context';

/**
 * 上下文处理器基类
 *
 * 提供统一的类型约束和基础功能，所有上下文处理器都应继承此类。
 *
 * 设计原则：
 * - 提供统一的处理器接口
 * - 支持配置化处理逻辑
 * - 提供默认实现和扩展点
 */
export abstract class BaseContextProcessor {
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
   * @param config 处理器配置（可选）
   * @returns 处理后的提示词上下文
   */
  abstract process(context: PromptContext, config?: Record<string, unknown>): PromptContext;

  /**
   * 验证配置参数
   *
   * @param config 待验证的配置
   * @returns 验证结果
   */
  validateConfig?(config: Record<string, unknown>): { valid: boolean; errors: string[] };

  /**
   * 转换为 ContextProcessor 函数
   *
   * @returns ContextProcessor 函数
   */
  toProcessor(): ContextProcessor {
    return (context: PromptContext, config?: Record<string, unknown>) => {
      // 如果有验证方法且提供了配置，先验证配置
      if (this.validateConfig && config) {
        const validation = this.validateConfig(config);
        if (!validation.valid) {
          throw new Error(`配置验证失败: ${validation.errors.join(', ')}`);
        }
      }
      return this.process(context, config);
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