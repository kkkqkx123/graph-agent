/**
 * 工作流领域模块入口
 *
 * 包含工作流相关的所有领域组件：
 * - Workflow实体和值对象
 * - Workflow子模块核心结构
 * - 工作流领域服务
 * - 工作流仓储接口
 */

// 导出实体
export * from './entities';

// 导出值对象
export * from './value-objects';

// 导出服务 - 使用显式导出避免冲突
export {
  ExecutionStep as ServiceExecutionStep,
  ExecutionStatus as ServiceExecutionStatus,
  WorkflowDomainService
} from './services';

// 导出仓储
export * from './repositories';

// 导出事件
export * from './events';

// 导出状态管理
export * from './state';
