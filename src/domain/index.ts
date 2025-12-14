/**
 * 领域层入口文件
 * 
 * 领域层包含纯业务逻辑和领域实体，提供所有主要组件的契约：
 * LLM、存储、工作流、会话等。
 * 领域层不包含任何技术实现细节，只包含业务规则。
 */

// 导出通用领域模块
export * from './common';

// 导出会话领域模块
export * from './session';

// 导出线程领域模块
export * from './thread';

// 导出工作流领域模块
export {
  Workflow,
  WorkflowType,
  WorkflowConfig,
  WorkflowStatus as WorkflowStatusEnum
} from './workflow';

// 导出图领域模块
export {
  Graph,
  Node,
  Edge,
  GraphDomainService,
  NodeType,
  EdgeType,
  HookPoint
} from './workflow/graph';

// 重新导出有冲突的值对象，使用别名
export {
  NodeId as GraphNodeId,
  EdgeId as GraphEdgeId
} from './workflow/graph';