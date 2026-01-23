/**
 * 配置系统类型定义
 * 仅保留实际使用的类型
 */

/**
 * 配置处理器接口
 */
export interface IConfigProcessor {
  process(config: Record<string, any>): Record<string, any>;
}

/**
 * 环境变量处理器选项
 */
export interface EnvironmentProcessorOptions {
  pattern?: RegExp;
}

/**
 * 继承处理器选项
 */
export interface InheritanceProcessorOptions {
  separator?: string;
  maxDepth?: number;
}