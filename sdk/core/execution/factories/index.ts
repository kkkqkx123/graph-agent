/**
 * 工厂模块
 *
 * 工厂负责创建复杂的对象和上下文。主要提供给协调器使用
 *
 * 包含的工厂：
 * - NodeHandlerContextFactory: 节点处理器上下文工厂
 * - LLMContextFactory: LLM 执行上下文工厂
 */

export {
  NodeHandlerContextFactory,
  type NodeHandlerContextFactoryConfig
} from './node-handler-context-factory.js';

export {
  LLMContextFactory,
  type LLMContextFactoryConfig,
  type ToolApprovalContext,
  type InterruptionContext,
  type ToolExecutionContext,
  type LLMCallContext,
  type ToolVisibilityContext
} from './llm-context-factory.js';
