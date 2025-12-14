/**
 * 图插件系统模块
 * 
 * 提供图执行过程中的插件机制，允许在特定节点插入自定义逻辑
 */

// 基础插件类
export { BasePlugin, PluginInfo, PluginStatus } from './base-plugin';

// 插件上下文
export { PluginContext, PluginContextBuilder, PluginContextUtils } from './plugin-context';

// 插件执行结果
export { 
  PluginExecutionResult, 
  PluginExecutionResultBuilder,
  PluginEvent
} from './plugin-execution-result';