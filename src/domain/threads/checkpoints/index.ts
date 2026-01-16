/**
 * Checkpoint 模块入口
 *
 * 包含 Checkpoint 的所有领域组件：
 * - Checkpoint 实体和值对象
 * - 检查点仓储接口
 * 
 * 设计原则：
 * - Thread 是唯一的执行引擎，负责实际的 workflow 执行和状态管理
 * - Checkpoint 只记录 Thread 的状态快照
 * - Session 的状态通过聚合其 Thread 的 checkpoint 间接获取
 */

// 导出实体
export * from './entities/checkpoint';

// 导出值对象
export * from './value-objects/checkpoint-scope';
export * from './value-objects/checkpoint-status';
export * from './value-objects/checkpoint-type';
export * from './value-objects/checkpoint-statistics';
export * from './value-objects/checkpoint-tuple';
export * from './value-objects/state-data';
export * from './value-objects/tags';

// 导出仓储
export * from './repositories/checkpoint-repository';