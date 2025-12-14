/**
 * 通用领域模块入口
 *
 * 包含所有领域模块共用的基础组件：
 * - 基础值对象（ID、时间戳、版本等）
 * - 领域事件系统
 * - 领域错误类型
 * - 仓储接口定义
 */

// 导出值对象
export * from './value-objects';

// 导出领域事件
export * from './events';

// 导出错误类型
export * from './errors';

// 导出仓储接口
export * from './repositories';

// 导出基础类
export * from './base';