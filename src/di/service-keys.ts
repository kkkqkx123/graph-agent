/**
 * Inversify服务标识符（类型安全版本）
 *
 * 定义所有服务的唯一标识符，用于依赖注入
 * 提供完整的类型映射，确保编译时类型检查
 *
 * 注意：Services层服务直接绑定实现类，不使用接口
 */

// ========== 导入服务类型 ==========

// LLM模块服务
import { HttpClient } from '../infrastructure/common/http/http-client';
import { ConfigLoadingModule } from '../infrastructure/config/loading/config-loading-module';
import { TokenBucketLimiter } from '../services/llm/rate-limiters/token-bucket-limiter';
import { TokenCalculator } from '../services/llm/token-calculators/token-calculator';
import { OpenAIChatClient } from '../services/llm/clients/openai-chat-client';
import { OpenAIResponseClient } from '../services/llm/clients/openai-response-client';
import { AnthropicClient } from '../services/llm/clients/anthropic-client';
import { GeminiClient } from '../services/llm/clients/gemini-client';
import { GeminiOpenAIClient } from '../services/llm/clients/gemini-openai-client';
import { MockClient } from '../services/llm/clients/mock-client';
import { HumanRelayClient } from '../services/llm/clients/human-relay-client';
import { LLMClientFactory } from '../services/llm/clients/llm-client-factory';
import { PollingPoolManager } from '../services/llm/managers/pool-manager';
import { TaskGroupManager } from '../services/llm/managers/task-group-manager';
import { LLMWrapperManager } from '../services/llm/managers/llm-wrapper-manager';

// Domain层接口（用于类型定义，不注册到容器）
import { ISessionRepository } from '../domain/sessions/repositories/session-repository';
import { IThreadRepository } from '../domain/threads/repositories/thread-repository';
import { IWorkflowRepository } from '../domain/workflow/repositories/workflow-repository';
import { IPromptRepository as PromptDomainRepository } from '../domain/prompts/repositories/prompt-repository';
import { ICheckpointRepository } from '../domain/threads/checkpoints/repositories/checkpoint-repository';
import { IHumanRelayService } from '../services/llm/human-relay';

// Services层实现
import { ThreadCopy } from '../services/threads/thread-copy';
import { ThreadExecution } from '../services/threads/thread-execution';
import { ThreadFork } from '../services/threads/thread-fork';
import { ThreadLifecycle } from '../services/threads/thread-lifecycle';
import { ThreadMaintenance } from '../services/threads/thread-maintenance';
import { ThreadManagement } from '../services/threads/thread-management';
import { ThreadMonitoring } from '../services/threads/thread-monitoring';
import { HumanRelay } from '../services/llm/human-relay';
import { Wrapper } from '../services/llm/wrapper';
import { SessionLifecycle } from '../services/sessions/session-lifecycle';
import { SessionMaintenance } from '../services/sessions/session-maintenance';
import { SessionManagement } from '../services/sessions/session-management';
import { SessionMonitoring } from '../services/sessions/session-monitoring';
import { SessionOrchestration } from '../services/sessions/session-orchestration';
import { SessionResource } from '../services/sessions/session-resource';
import { SessionCheckpointManagement } from '../services/sessions/session-checkpoint-management';
import { StateHistory } from '../services/state/state-history';
import { StateManagement } from '../services/state/state-management';
import { StateRecovery } from '../services/state/state-recovery';
import { FunctionManagement } from '../services/workflow/function-management';
import { WorkflowLifecycle } from '../services/workflow/workflow-lifecycle';
import { WorkflowManagement } from '../services/workflow/workflow-management';
import { WorkflowValidator } from '../services/workflow/workflow-validator';
import { ExpressionEvaluator } from '../services/workflow/expression-evaluator';
import { FunctionExecutionEngine } from '../services/workflow/function-execution-engine';
import { GraphAlgorithmImpl } from '../services/workflow/graph-algorithm';
import { MonitoringService } from '../services/workflow/monitoring';
import { NodeRouter } from '../services/workflow/node-router';
import { WorkflowExecutionEngine as WorkflowExecution } from '../services/workflow/workflow-execution';
import { CheckpointAnalysis } from '../services/checkpoints/checkpoint-analysis';
import { CheckpointBackup } from '../services/checkpoints/checkpoint-backup';
import { CheckpointCleanup } from '../services/checkpoints/checkpoint-cleanup';
import { CheckpointCreation } from '../services/checkpoints/checkpoint-creation';
import { CheckpointManagement } from '../services/checkpoints/checkpoint-management';
import { CheckpointQuery } from '../services/checkpoints/checkpoint-query';
import { CheckpointRestore } from '../services/checkpoints/checkpoint-restore';
import { ThreadStateManager } from '../services/threads/thread-state-manager';
import { ThreadHistoryManager } from '../services/threads/thread-history-manager';
import { ThreadConditionalRouter } from '../services/threads/thread-conditional-router';
import { WorkflowExecutionEngine } from '../services/threads/workflow-execution-engine';
import { FunctionRegistry } from '../services/workflow/functions/function-registry';
import { NodeExecutor } from '../services/workflow/nodes/node-executor';
import { EdgeExecutor } from '../services/workflow/edges/edge-executor';
import { HookExecutor } from '../services/workflow/hooks/hook-executor';
import { HookFactory } from '../services/workflow/hooks/hook-factory';
import { PromptBuilder } from '../services/prompts/prompt-builder';
import { TemplateProcessor } from '../services/prompts/template-processor';
import { PromptReferenceParser } from '../services/prompts/prompt-reference-parser';
import { PromptReferenceValidator } from '../services/prompts/prompt-reference-validator';

// Infrastructure层实现
import { SessionRepository as SessionInfrastructureRepository } from '../infrastructure/persistence/repositories/session-repository';
import { ThreadRepository as ThreadInfrastructureRepository } from '../infrastructure/persistence/repositories/thread-repository';
import { WorkflowRepository as WorkflowInfrastructureRepository } from '../infrastructure/persistence/repositories/workflow-repository';
import { PromptRepository as PromptInfrastructureRepository } from '../infrastructure/persistence/repositories/prompt-repository';
import { CheckpointRepository as CheckpointInfrastructureRepository } from '../infrastructure/persistence/repositories/checkpoint-repository';
import { ConnectionManager } from '../infrastructure/persistence/connection-manager';
import { Logger } from '../infrastructure/logging/logger';

// ========== 服务类型映射接口 ==========

/**
 * 服务类型映射接口
 * 将服务标识符映射到对应的服务类型
 */
export interface ServiceTypes {
  // ========== LLM模块服务 ==========

  // 基础设施组件
  HttpClient: HttpClient;
  ConfigLoadingModule: ConfigLoadingModule;
  TokenBucketLimiter: TokenBucketLimiter;
  TokenCalculator: TokenCalculator;

  // 客户端实现
  OpenAIChatClient: OpenAIChatClient;
  OpenAIResponseClient: OpenAIResponseClient;
  AnthropicClient: AnthropicClient;
  GeminiClient: GeminiClient;
  GeminiOpenAIClient: GeminiOpenAIClient;
  MockClient: MockClient;
  HumanRelayClient: HumanRelayClient;

  // 工厂类
  LLMClientFactory: LLMClientFactory;

  // 管理器
  PollingPoolManager: PollingPoolManager;
  TaskGroupManager: TaskGroupManager;
  LLMWrapperManager: LLMWrapperManager;

  // ========== Domain层接口（仅用于类型定义） ==========

  // 仓储接口
  SessionRepository: ISessionRepository;
  ThreadRepository: IThreadRepository;
  WorkflowRepository: IWorkflowRepository;
  PromptRepository: PromptDomainRepository;
  CheckpointRepository: ICheckpointRepository;

  // 业务服务接口
  HumanRelayService: IHumanRelayService;

  // ========== Services层实现 ==========

  // 线程服务
  ThreadCopy: ThreadCopy;
  ThreadExecution: ThreadExecution;
  ThreadFork: ThreadFork;
  ThreadLifecycle: ThreadLifecycle;
  ThreadMaintenance: ThreadMaintenance;
  ThreadManagement: ThreadManagement;
  ThreadMonitoring: ThreadMonitoring;
  ThreadStateManager: ThreadStateManager;
  ThreadHistoryManager: ThreadHistoryManager;
  ThreadConditionalRouter: ThreadConditionalRouter;
  WorkflowExecutionEngine: WorkflowExecutionEngine;

  // LLM服务
  HumanRelay: HumanRelay;
  Wrapper: Wrapper;

  // 会话服务
  SessionLifecycle: SessionLifecycle;
  SessionMaintenance: SessionMaintenance;
  SessionManagement: SessionManagement;
  SessionMonitoring: SessionMonitoring;
  SessionOrchestration: SessionOrchestration;
  SessionResource: SessionResource;
  SessionCheckpointManagement: SessionCheckpointManagement;

  // 状态服务
  StateHistory: StateHistory;
  StateManagement: StateManagement;
  StateRecovery: StateRecovery;

  // 工作流服务
  FunctionManagement: FunctionManagement;
  WorkflowLifecycle: WorkflowLifecycle;
  WorkflowManagement: WorkflowManagement;
  WorkflowValidator: WorkflowValidator;
  ExpressionEvaluator: ExpressionEvaluator;
  FunctionExecutionEngine: FunctionExecutionEngine;
  GraphAlgorithm: GraphAlgorithmImpl;
  MonitoringService: MonitoringService;
  NodeRouter: NodeRouter;
  WorkflowExecution: WorkflowExecution;

  // 检查点服务
  CheckpointAnalysis: CheckpointAnalysis;
  CheckpointBackup: CheckpointBackup;
  CheckpointCleanup: CheckpointCleanup;
  CheckpointCreation: CheckpointCreation;
  CheckpointManagement: CheckpointManagement;
  CheckpointQuery: CheckpointQuery;
  CheckpointRestore: CheckpointRestore;

  // Prompt服务
  PromptBuilder: PromptBuilder;
  TemplateProcessor: TemplateProcessor;
  PromptReferenceParser: PromptReferenceParser;
  PromptReferenceValidator: PromptReferenceValidator;

  // 函数注册表
  FunctionRegistry: FunctionRegistry;

  // 节点和边执行器
  NodeExecutor: NodeExecutor;
  EdgeExecutor: EdgeExecutor;
  HookExecutor: HookExecutor;
  HookFactory: HookFactory;

  // ========== Infrastructure层实现 ==========

  // 仓储实现
  SessionRepositoryImpl: SessionInfrastructureRepository;
  ThreadRepositoryImpl: ThreadInfrastructureRepository;
  WorkflowRepositoryImpl: WorkflowInfrastructureRepository;
  PromptRepositoryImpl: PromptInfrastructureRepository;
  CheckpointRepositoryImpl: CheckpointInfrastructureRepository;

  // 基础设施服务
  ConnectionManager: ConnectionManager;
  Logger: Logger;
}

/**
 * 服务标识符类型
 * 提取ServiceTypes的所有键作为服务标识符类型
 */
export type ServiceIdentifier = keyof ServiceTypes;

/**
 * 类型化的服务标识符
 * 将服务标识符与对应的类型关联
 */
export type TypedServiceIdentifier<K extends ServiceIdentifier> = symbol & {
  __serviceType: ServiceTypes[K];
};

/**
 * 服务标识符映射
 * 将服务名称映射到类型化的symbol
 */
export const TYPES: {
  [K in ServiceIdentifier]: TypedServiceIdentifier<K>;
} = {
  // ========== LLM模块服务 ==========

  // 基础设施组件
  HttpClient: Symbol.for('HttpClient') as TypedServiceIdentifier<'HttpClient'>,
  ConfigLoadingModule: Symbol.for(
    'ConfigLoadingModule'
  ) as TypedServiceIdentifier<'ConfigLoadingModule'>,
  TokenBucketLimiter: Symbol.for(
    'TokenBucketLimiter'
  ) as TypedServiceIdentifier<'TokenBucketLimiter'>,
  TokenCalculator: Symbol.for('TokenCalculator') as TypedServiceIdentifier<'TokenCalculator'>,

  // 客户端实现
  OpenAIChatClient: Symbol.for('OpenAIChatClient') as TypedServiceIdentifier<'OpenAIChatClient'>,
  OpenAIResponseClient: Symbol.for(
    'OpenAIResponseClient'
  ) as TypedServiceIdentifier<'OpenAIResponseClient'>,
  AnthropicClient: Symbol.for('AnthropicClient') as TypedServiceIdentifier<'AnthropicClient'>,
  GeminiClient: Symbol.for('GeminiClient') as TypedServiceIdentifier<'GeminiClient'>,
  GeminiOpenAIClient: Symbol.for(
    'GeminiOpenAIClient'
  ) as TypedServiceIdentifier<'GeminiOpenAIClient'>,
  MockClient: Symbol.for('MockClient') as TypedServiceIdentifier<'MockClient'>,
  HumanRelayClient: Symbol.for('HumanRelayClient') as TypedServiceIdentifier<'HumanRelayClient'>,

  // 工厂类
  LLMClientFactory: Symbol.for('LLMClientFactory') as TypedServiceIdentifier<'LLMClientFactory'>,

  // 管理器
  PollingPoolManager: Symbol.for(
    'PollingPoolManager'
  ) as TypedServiceIdentifier<'PollingPoolManager'>,
  TaskGroupManager: Symbol.for('TaskGroupManager') as TypedServiceIdentifier<'TaskGroupManager'>,
  LLMWrapperManager: Symbol.for('LLMWrapperManager') as TypedServiceIdentifier<'LLMWrapperManager'>,

  // ========== Domain层接口（仅用于类型定义） ==========

  // 仓储接口
  SessionRepository: Symbol.for('SessionRepository') as TypedServiceIdentifier<'SessionRepository'>,
  ThreadRepository: Symbol.for('ThreadRepository') as TypedServiceIdentifier<'ThreadRepository'>,
  WorkflowRepository: Symbol.for(
    'WorkflowRepository'
  ) as TypedServiceIdentifier<'WorkflowRepository'>,
  PromptRepository: Symbol.for('PromptRepository') as TypedServiceIdentifier<'PromptRepository'>,
  CheckpointRepository: Symbol.for(
    'CheckpointRepository'
  ) as TypedServiceIdentifier<'CheckpointRepository'>,

  // 业务服务接口
  HumanRelayService: Symbol.for('HumanRelayService') as TypedServiceIdentifier<'HumanRelayService'>,

  // ========== Services层实现 ==========

  // 线程服务
  ThreadCopy: Symbol.for('ThreadCopy') as TypedServiceIdentifier<'ThreadCopy'>,
  ThreadExecution: Symbol.for('ThreadExecution') as TypedServiceIdentifier<'ThreadExecution'>,
  ThreadFork: Symbol.for('ThreadFork') as TypedServiceIdentifier<'ThreadFork'>,
  ThreadLifecycle: Symbol.for('ThreadLifecycle') as TypedServiceIdentifier<'ThreadLifecycle'>,
  ThreadMaintenance: Symbol.for(
    'ThreadMaintenance'
  ) as TypedServiceIdentifier<'ThreadMaintenance'>,
  ThreadManagement: Symbol.for('ThreadManagement') as TypedServiceIdentifier<'ThreadManagement'>,
  ThreadMonitoring: Symbol.for('ThreadMonitoring') as TypedServiceIdentifier<'ThreadMonitoring'>,
  ThreadStateManager: Symbol.for(
    'ThreadStateManager'
  ) as TypedServiceIdentifier<'ThreadStateManager'>,
  ThreadHistoryManager: Symbol.for(
    'ThreadHistoryManager'
  ) as TypedServiceIdentifier<'ThreadHistoryManager'>,
  ThreadConditionalRouter: Symbol.for(
    'ThreadConditionalRouter'
  ) as TypedServiceIdentifier<'ThreadConditionalRouter'>,
  WorkflowExecutionEngine: Symbol.for(
    'WorkflowExecutionEngine'
  ) as TypedServiceIdentifier<'WorkflowExecutionEngine'>,

  // LLM服务
  HumanRelay: Symbol.for('HumanRelay') as TypedServiceIdentifier<'HumanRelay'>,
  Wrapper: Symbol.for('Wrapper') as TypedServiceIdentifier<'Wrapper'>,

  // 会话服务
  SessionLifecycle: Symbol.for('SessionLifecycle') as TypedServiceIdentifier<'SessionLifecycle'>,
  SessionMaintenance: Symbol.for(
    'SessionMaintenance'
  ) as TypedServiceIdentifier<'SessionMaintenance'>,
  SessionManagement: Symbol.for('SessionManagement') as TypedServiceIdentifier<'SessionManagement'>,
  SessionMonitoring: Symbol.for('SessionMonitoring') as TypedServiceIdentifier<'SessionMonitoring'>,
  SessionOrchestration: Symbol.for(
    'SessionOrchestration'
  ) as TypedServiceIdentifier<'SessionOrchestration'>,
  SessionResource: Symbol.for('SessionResource') as TypedServiceIdentifier<'SessionResource'>,
  SessionCheckpointManagement: Symbol.for(
    'SessionCheckpointManagement'
  ) as TypedServiceIdentifier<'SessionCheckpointManagement'>,

  // 状态服务
  StateHistory: Symbol.for('StateHistory') as TypedServiceIdentifier<'StateHistory'>,
  StateManagement: Symbol.for('StateManagement') as TypedServiceIdentifier<'StateManagement'>,
  StateRecovery: Symbol.for('StateRecovery') as TypedServiceIdentifier<'StateRecovery'>,

  // 工作流服务
  FunctionManagement: Symbol.for('FunctionManagement') as TypedServiceIdentifier<'FunctionManagement'>,
  WorkflowLifecycle: Symbol.for('WorkflowLifecycle') as TypedServiceIdentifier<'WorkflowLifecycle'>,
  WorkflowManagement: Symbol.for('WorkflowManagement') as TypedServiceIdentifier<'WorkflowManagement'>,
  WorkflowValidator: Symbol.for('WorkflowValidator') as TypedServiceIdentifier<'WorkflowValidator'>,
  ExpressionEvaluator: Symbol.for('ExpressionEvaluator') as TypedServiceIdentifier<'ExpressionEvaluator'>,
  FunctionExecutionEngine: Symbol.for(
    'FunctionExecutionEngine'
  ) as TypedServiceIdentifier<'FunctionExecutionEngine'>,
  GraphAlgorithm: Symbol.for('GraphAlgorithm') as TypedServiceIdentifier<'GraphAlgorithm'>,
  MonitoringService: Symbol.for('MonitoringService') as TypedServiceIdentifier<'MonitoringService'>,
  NodeRouter: Symbol.for('NodeRouter') as TypedServiceIdentifier<'NodeRouter'>,
  WorkflowExecution: Symbol.for('WorkflowExecution') as TypedServiceIdentifier<'WorkflowExecution'>,

  // 检查点服务
  CheckpointAnalysis: Symbol.for('CheckpointAnalysis') as TypedServiceIdentifier<'CheckpointAnalysis'>,
  CheckpointBackup: Symbol.for('CheckpointBackup') as TypedServiceIdentifier<'CheckpointBackup'>,
  CheckpointCleanup: Symbol.for('CheckpointCleanup') as TypedServiceIdentifier<'CheckpointCleanup'>,
  CheckpointCreation: Symbol.for('CheckpointCreation') as TypedServiceIdentifier<'CheckpointCreation'>,
  CheckpointManagement: Symbol.for(
    'CheckpointManagement'
  ) as TypedServiceIdentifier<'CheckpointManagement'>,
  CheckpointQuery: Symbol.for('CheckpointQuery') as TypedServiceIdentifier<'CheckpointQuery'>,
  CheckpointRestore: Symbol.for('CheckpointRestore') as TypedServiceIdentifier<'CheckpointRestore'>,

  // Prompt服务
  PromptBuilder: Symbol.for('PromptBuilder') as TypedServiceIdentifier<'PromptBuilder'>,
  TemplateProcessor: Symbol.for('TemplateProcessor') as TypedServiceIdentifier<'TemplateProcessor'>,
  PromptReferenceParser: Symbol.for(
    'PromptReferenceParser'
  ) as TypedServiceIdentifier<'PromptReferenceParser'>,
  PromptReferenceValidator: Symbol.for(
    'PromptReferenceValidator'
  ) as TypedServiceIdentifier<'PromptReferenceValidator'>,

  // 函数注册表
  FunctionRegistry: Symbol.for('FunctionRegistry') as TypedServiceIdentifier<'FunctionRegistry'>,

  // 节点和边执行器
  NodeExecutor: Symbol.for('NodeExecutor') as TypedServiceIdentifier<'NodeExecutor'>,
  EdgeExecutor: Symbol.for('EdgeExecutor') as TypedServiceIdentifier<'EdgeExecutor'>,
  HookExecutor: Symbol.for('HookExecutor') as TypedServiceIdentifier<'HookExecutor'>,
  HookFactory: Symbol.for('HookFactory') as TypedServiceIdentifier<'HookFactory'>,

  // ========== Infrastructure层实现 ==========

  // 仓储实现
  SessionRepositoryImpl: Symbol.for(
    'SessionRepositoryImpl'
  ) as TypedServiceIdentifier<'SessionRepositoryImpl'>,
  ThreadRepositoryImpl: Symbol.for(
    'ThreadRepositoryImpl'
  ) as TypedServiceIdentifier<'ThreadRepositoryImpl'>,
  WorkflowRepositoryImpl: Symbol.for(
    'WorkflowRepositoryImpl'
  ) as TypedServiceIdentifier<'WorkflowRepositoryImpl'>,
  PromptRepositoryImpl: Symbol.for(
    'PromptRepositoryImpl'
  ) as TypedServiceIdentifier<'PromptRepositoryImpl'>,
  CheckpointRepositoryImpl: Symbol.for(
    'CheckpointRepositoryImpl'
  ) as TypedServiceIdentifier<'CheckpointRepositoryImpl'>,

  // 基础设施服务
  ConnectionManager: Symbol.for('ConnectionManager') as TypedServiceIdentifier<'ConnectionManager'>,
  Logger: Symbol.for('Logger') as TypedServiceIdentifier<'Logger'>,
};

/**
 * 获取服务的类型
 * @param K 服务标识符
 * @returns 服务类型
 */
export type GetServiceType<K extends ServiceIdentifier> = ServiceTypes[K];

/**
 * 类型安全的容器获取服务辅助函数
 * @param container Inversify容器
 * @param serviceIdentifier 服务标识符
 * @returns 服务实例
 */
export function getService<K extends ServiceIdentifier>(
  container: any,
  serviceIdentifier: TypedServiceIdentifier<K>
): GetServiceType<K> {
  return container.get(serviceIdentifier) as GetServiceType<K>;
}