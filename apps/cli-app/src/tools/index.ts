/**
 * 工具模块入口
 * 导出所有工具相关的类型、注册中心和工具定义
 */

// 类型导出（从 SDK 重新导出）
export type { ToolOutput } from '@modular-agent/types';

// app 层特有类型导出
export type { ToolRegistryConfig } from './types.js';

// 从 tool-executors 导出工具定义类型
export type { ToolDefinitionLike } from '@modular-agent/tool-executors';

// 注册中心导出
export { ToolRegistry, createToolRegistry } from './registry.js';

// 复用 tool-executors 的组件导出
export {
  FunctionRegistry,
  StatelessExecutor,
  StatefulExecutor,
  TimeoutController,
  ParameterValidator,
  RetryStrategy,
  toSdkTool,
  toSdkTools
} from '@modular-agent/tool-executors';

// 无状态工具导出
export {
  registerStatelessTools,
  createReadTool,
  createWriteTool,
  createEditTool,
  createBashTool
} from './stateless/index.js';

// 有状态工具导出
export {
  registerStatefulTools,
  createRecordNoteTool,
  createRecallNoteTool,
  createShellBackgroundTool,
  createShellOutputTool,
  createShellKillTool
} from './stateful/index.js';

// 辅助函数导出（从 common-utils 重新导出）
export { generateToolId, truncateText, formatLineNumbers, resolvePath } from './utils.js';
