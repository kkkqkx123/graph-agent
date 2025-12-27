/**
 * 基础设施层服务键常量定义
 *
 * 统一管理基础设施层服务的键名，避免硬编码字符串
 */

/**
 * 基础设施层服务键
 */
export const INFRASTRUCTURE_SERVICE_KEYS = {
  // 日志服务
  LOGGER_CONFIG_MANAGER: 'LoggerConfigManager',
  LOGGER_FACTORY: 'LoggerFactory',
  LOGGER: 'ILogger',

  // 配置服务
  CONFIG_MANAGER: 'IConfigManager',

  // 数据库服务
  DATABASE: 'IDatabase',

  // 缓存服务
  CACHE: 'ICache',

  // LLM服务
  LLM_CLIENT: 'ILLMClient',
  LLM_CONFIG: 'ILLMConfig',

  // 提示词服务
  PROMPT_LOADER: 'PromptLoader',
  PROMPT_INJECTOR: 'PromptInjector',
  PROMPT_REPOSITORY: 'PromptRepository',

  // 仓储服务
  SESSION_REPOSITORY: 'SessionRepository',
  THREAD_REPOSITORY: 'ThreadRepository',
  THREAD_DEFINITION_REPOSITORY: 'ThreadDefinitionRepository',
  THREAD_EXECUTION_REPOSITORY: 'ThreadExecutionRepository',
  WORKFLOW_REPOSITORY: 'WorkflowRepository',
  CHECKPOINT_REPOSITORY: 'CheckpointRepository',
  HISTORY_REPOSITORY: 'HistoryRepository',

  // 工作流执行器
  FUNCTION_REGISTRY: 'FunctionRegistry',
  FUNCTION_EXECUTOR: 'FunctionExecutor',
  VALUE_OBJECT_EXECUTOR: 'ValueObjectExecutor',
  NODE_EXECUTOR: 'NodeExecutor',
  EDGE_EXECUTOR: 'EdgeExecutor',
  HOOK_EXECUTOR: 'HookExecutor',
  EDGE_EVALUATOR: 'EdgeEvaluator',
  NODE_ROUTER: 'NodeRouter',

  // 图算法服务
  GRAPH_ALGORITHM_SERVICE: 'GraphAlgorithmService',
  GRAPH_VALIDATION_SERVICE: 'GraphValidationService',

  // 线程服务
  THREAD_COORDINATOR_SERVICE: 'ThreadCoordinatorService',
  THREAD_LIFECYCLE_SERVICE: 'ThreadLifecycleService'
} as const;

/**
 * 基础设施层服务键类型
 */
export type InfrastructureServiceKey = typeof INFRASTRUCTURE_SERVICE_KEYS[keyof typeof INFRASTRUCTURE_SERVICE_KEYS];