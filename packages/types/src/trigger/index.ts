/**
 * Trigger类型定义统一导出
 * 定义触发器的类型和结构，用于实现基于事件的触发器机制
 *
 * 设计原则：
 * - Trigger 专用于事件监听
 * - 不涉及时间触发和状态触发
 * - 使用类型别名和接口，保持简单性
 * - 便于序列化和反序列化
 */

// 导出触发器定义
export * from './definition';

// 导出状态类型
export * from './state';

// 导出配置类型
export * from './config';

// 导出执行相关类型
export * from './execution';