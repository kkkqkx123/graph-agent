/**
 * 协调器模块
 *
 * 协调器是无状态的组件，负责协调各个管理器之间的交互
 *
 * 设计原则：
 * - 协调逻辑：封装复杂的协调逻辑
 * - 依赖注入：通过构造函数接收依赖的管理器
 *
 */

export * from './llm-execution-coordinator.js';
export * from './tool-approval-coordinator.js';