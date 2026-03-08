/**
 * 无状态工具入口
 */

import type { ToolRegistry } from '../registry.js';
import type { ToolRegistryConfig } from '../types.js';
import { createReadTool } from './read-tool.js';
import { createWriteTool } from './write-tool.js';
import { createEditTool } from './edit-tool.js';
import { createShellTool } from './shell-tool.js';

/**
 * 注册所有无状态工具
 */
export async function registerStatelessTools(
  registry: ToolRegistry,
  config: ToolRegistryConfig
): Promise<void> {
  // 文件操作工具
  registry.register(createReadTool(config));
  registry.register(createWriteTool(config));
  registry.register(createEditTool(config));

  // Bash工具
  registry.register(createShellTool());
}

// 导出各个工具创建函数
export { createReadTool } from './read-tool.js';
export { createWriteTool } from './write-tool.js';
export { createEditTool } from './edit-tool.js';
export { createShellTool as createBashTool } from './shell-tool.js';
