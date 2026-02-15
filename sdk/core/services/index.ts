/**
 * 服务模块导出
 * 提供全局单例服务：事件管理器、工作流注册表、线程注册表、节点注册表
 * 全部采用全局单例的设计模式，直接导出实例
 * 注意：节点注册器、触发器注册器是模板使用注册器，仅注册静态定义，不是实例注册器
 */

// 线程注册表单例
export { threadRegistry, type ThreadRegistry } from './thread-registry';

// 工作流注册表单例
export { workflowRegistry, type WorkflowRegistry } from './workflow-registry';

// 图注册表单例
export { graphRegistry, type GraphRegistry } from './graph-registry';

// 事件管理器单例
export { eventManager, type EventManager } from './event-manager';

// 节点注册表单例
export { nodeTemplateRegistry, type NodeTemplateRegistry } from './node-template-registry';

// 触发器模板注册表单例
export { triggerTemplateRegistry, type TriggerTemplateRegistry } from './trigger-template-registry';

// 全局消息存储单例
export { globalMessageStorage, type GlobalMessageStorage } from './global-message-storage';

// 工具服务（需要手动初始化）
export { ToolService } from './tool-service';