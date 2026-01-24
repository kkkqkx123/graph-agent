/**
 * 状态领域模块入口
 *
 * 包含状态相关的所有领域组件：
 * - 状态实体
 * - 状态值对象
 * - 状态仓库接口
 * - 状态异常定义
 */

// 导出实体
export * from './entities/state';

// 导出值对象
export * from './value-objects/state-id';
export * from './value-objects/state-entity-type';
// StateData 已迁移到 checkpoint 模块，从那里导入

// 导出仓库接口
export * from './repositories/state-repository';
