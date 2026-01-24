/**
 * 领域层入口文件
 *
 * 领域层包含纯业务逻辑和领域实体，提供所有主要组件的契约：
 * LLM、存储、工作流、会话等。
 * 领域层不包含任何技术实现细节，只包含业务规则。
 */

// 导出通用领域模块
export * from './common';

// 导出LLM领域模块
export * from './llm';

// 导出提示词领域模块
export * from './prompts';

// 导出会话领域模块
export * from './sessions';

// 导出线程领域模块
export {
  Thread,
  ThreadStatus,
  ThreadDefinition,
  ThreadExecution,
  ThreadExecutionContext,
  NodeExecution,
} from './threads';

// 导出交互领域模块
export {
  InteractionSession,
  InteractionMessage,
  InteractionToolCall,
  InteractionLLMCall,
  MessageRole,
  Message,
  ToolCall,
  LLMCall,
  InteractionTokenUsage,
  LLMConfig,
  ToolConfig,
  UserInteractionConfig,
  InteractionException,
  InteractionSessionNotFoundException,
  InteractionExecutionException,
  LLMExecutionException,
  ToolExecutionException,
  UserInteractionException,
  TokenLimitExceededException,
  IInteractionSessionRepository,
} from './interaction';

// 导出工具领域模块
export * from './tools';

// 导出工作流领域模块
export {
  Workflow,
  WorkflowStatus,
  WorkflowType,
  WorkflowConfig,
  NodeId,
  NodeType,
  EdgeId,
  EdgeType,
  HookPoint,
  WorkflowValidationResult as ValidationResult,
} from './workflow';
