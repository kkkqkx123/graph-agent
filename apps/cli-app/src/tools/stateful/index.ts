/**
 * 有状态工具入口
 */

import type { ToolRegistry } from '../registry.js';
import type { ToolRegistryConfig } from '../types.js';
import { createRecordNoteTool, createRecallNoteTool } from './session-note-tool.js';
import { createBashBackgroundTool, createBashOutputTool, createBashKillTool } from './background-bash-tool.js';

/**
 * 注册所有有状态工具
 */
export async function registerStatefulTools(
  registry: ToolRegistry,
  config: ToolRegistryConfig
): Promise<void> {
  // 会话笔记工具
  registry.register(createRecordNoteTool(config));
  registry.register(createRecallNoteTool(config));
  
  // 后台Bash工具
  registry.register(createBashBackgroundTool());
  registry.register(createBashOutputTool());
  registry.register(createBashKillTool());
}

// 导出各个工具创建函数
export { createRecordNoteTool, createRecallNoteTool } from './session-note-tool.js';
export { createBashBackgroundTool, createBashOutputTool, createBashKillTool } from './background-bash-tool.js';
