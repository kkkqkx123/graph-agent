/**
 * 会话领域模块入口
 *
 * 包含会话相关的所有领域组件：
 * - Session实体和值对象
 * - History子模块
 * - 会话领域服务
 * - 会话仓储接口
 */

// 导出实体
export * from './entities';

// 导出值对象
export * from './value-objects';

// 导出仓储
export * from './repositories';

// 操作相关值对象已移至 value-objects/operations
