/**
 * 操作相关值对象模块入口
 *
 * 导出所有线程操作相关的值对象
 */

// 基础操作值对象
export * from './thread-operation-result';

// Fork操作值对象
export * from './fork/fork-strategy';
export * from './fork/fork-context';

// Copy操作值对象
export * from './copy/copy-strategy';
export * from './copy/copy-context';