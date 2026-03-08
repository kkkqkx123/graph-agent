/**
 * 工具模块入口
 * 导出所有工具相关的类型、注册中心和工具定义
 */

// 类型导出
export type { ToolResult, ToolDefinition, ToolRegistryConfig } from './types.js';

// 注册中心导出
export { ToolRegistry, createToolRegistry } from './registry.js';

// 复用 tool-executors 的组件导出
export {
  FunctionRegistry,
  StatelessExecutor,
  StatefulExecutor,
  TimeoutController,
  ParameterValidator,
  RetryStrategy
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
  createBashBackgroundTool,
  createBashOutputTool,
  createBashKillTool
} from './stateful/index.js';

// 辅助函数导出
export { generateToolId, truncateText, formatLineNumbers, resolvePath } from './utils.js';
