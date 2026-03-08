/**
 * 有状态工具入口
 */

import type { ToolRegistry } from '../registry.js';
import type { ToolRegistryConfig } from '../types.js';
import { createRecordNoteTool, createRecallNoteTool } from './session-note-tool.js';
import { createShellBackgroundTool, createShellOutputTool, createShellKillTool } from './background-shell-tool.js';

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

  // 后台Shell工具
  registry.register(createShellBackgroundTool());
  registry.register(createShellOutputTool());
  registry.register(createShellKillTool());
}

// 导出各个工具创建函数
export { createRecordNoteTool, createRecallNoteTool } from './session-note-tool.js';
export { createShellBackgroundTool, createShellOutputTool, createShellKillTool } from './background-shell-tool.js';
