/**
 * 工作流函数模块导出
 */

// 内置函数
export * from './builtin';

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