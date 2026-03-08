/**
 * 工具定义类型
 * 定义工具执行结果和工具定义接口
 */

/**
 * 工具执行结果
 */
export interface ToolResult {
  /** 是否成功 */
  success: boolean;
  /** 输出内容 */
  content: string;
  /** 错误信息 */
  error?: string;
}

/**
 * 工具定义接口
 * 所有工具必须实现此接口
 */
export interface ToolDefinition {
  /** 工具唯一标识符 */
  id: string;
  /** 工具名称 */
  name: string;
  /** 工具描述 */
  description: string;
  /** 参数schema (JSON Schema格式) */
  parameters: Record<string, any>;
  /** 工具类型 */
  type: 'STATELESS' | 'STATEFUL';
  /** 版本号（可选，用于 FunctionRegistry） */
  version?: string;
  /** 执行函数（无状态工具） */
  execute?: (parameters: Record<string, any>) => Promise<ToolResult>;
  /** 工厂函数（有状态工具） */
  factory?: () => { execute: (parameters: Record<string, any>) => Promise<ToolResult> };
}

/**
 * 工具注册配置
 */
export interface ToolRegistryConfig {
  /** 工作目录 */
  workspaceDir?: string;
  /** 内存文件路径 */
  memoryFile?: string;
}
