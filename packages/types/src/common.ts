/**
 * Common类型定义
 * 定义通用的基础类型，包括ID、时间戳、版本、元数据等
 *
 * 设计原则：
 * - 使用类型别名而非类，保持简单性
 * - 便于序列化和反序列化
 * - 适合SDK的使用场景
 * - 工具函数统一放在 sdk/utils/ 目录
 */

/**
 * ID类型（类型别名）
 * 使用字符串作为ID，支持UUID或其他格式
 */
export type ID = string;

/**
 * 时间戳类型（类型别名）
 * 使用毫秒时间戳
 */
export type Timestamp = number;

/**
 * 版本类型（类型别名）
 * 遵循语义化版本规范（如 "1.0.0"）
 */
export type Version = string;

/**
 * 元数据类型（类型别名）
 * 支持任意键值对
 */
export type Metadata = Record<string, any>;

/**
 * 变量作用域类型
 * 定义工作流中变量的作用域级别
 */
export type VariableScope = 'global' | 'thread' | 'local' | 'loop';

/**
 * ThreadContext 接口
 * 线程执行上下文，用于有状态工具的线程隔离
 */
export interface ThreadContext {
  /**
   * 注册有状态工具工厂
   */
  registerStatefulTool(toolName: string, factory: any): void;
  
  /**
   * 获取有状态工具实例
   */
  getStatefulTool(toolName: string): any;
}