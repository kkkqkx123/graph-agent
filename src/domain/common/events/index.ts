/**
 * 事件模块入口
 *
 * 导出所有事件相关的类型和接口
 */

export { DomainEvent } from './domain-event';
// EventDispatcher 已迁移到 infrastructure 层
export * from './events';