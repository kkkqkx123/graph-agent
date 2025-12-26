/**
 * 工作流函数模块导出
 */

// 执行器
export * from './executors';

// 注册表
export { FunctionRegistry } from './registry/function-registry';

// 内置函数
export * from './builtin/index';

// 组合
export * from './composition';

// 基础类
export * from './base/base-workflow-function';

// 公共接口
export interface BaseWorkflowFunction {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly description?: string;
  readonly metadata?: Record<string, any>;
}