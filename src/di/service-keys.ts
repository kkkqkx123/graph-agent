/**
 * Inversify服务标识符（类型安全版本）
 *
 * 定义所有服务的唯一标识符，用于依赖注入
 * 提供完整的类型映射，确保编译时类型检查
 *
 * 注意：Application层服务直接绑定实现类，不使用接口
 */

// ========== 导入服务类型 ==========

// LLM模块服务
import { HttpClient } from '../infrastructure/common/http/http-client';
import { ConfigLoadingModule } from '../infrastructure/config/loading/config-loading-module';
import { TokenBucketLimiter } from '../infrastructure/llm/rate-limiters/token-bucket-limiter';
import { TokenCalculator } from '../infrastructure/llm/token-calculators/token-calculator';
import { OpenAIChatClient } from '../infrastructure/llm/clients/openai-chat-client';
import { OpenAIResponseClient } from '../infrastructure/llm/clients/openai-response-client';
import { AnthropicClient } from '../infrastructure/llm/clients/anthropic-client';
import { GeminiClient } from '../infrastructure/llm/clients/gemini-client';
import { GeminiOpenAIClient } from '../infrastructure/llm/clients/gemini-openai-client';
import { MockClient } from '../infrastructure/llm/clients/mock-client';
import { HumanRelayClient } from '../infrastructure/llm/clients/human-relay-client';
import { LLMClientFactory } from '../infrastructure/llm/clients/llm-client-factory';
import { LLMWrapperFactory } from '../infrastructure/llm/wrappers/wrapper-factory';
import { PollingPoolManager } from '../infrastructure/llm/managers/pool-manager';
import { TaskGroupManager } from '../infrastructure/llm/managers/task-group-manager';

// Domain层接口（用于类型定义，不注册到容器）
import { ISessionRepository } from '../domain/sessions/repositories/session-repository';
import { IThreadRepository } from '../domain/threads/repositories/thread-repository';
import { IWorkflowRepository } from '../domain/workflow/repositories/workflow-repository';
import { IPromptRepository as PromptDomainRepository } from '../domain/prompts/repositories/prompt-repository';
import { IThreadCheckpointRepository } from '../domain/threads/checkpoints/repositories/thread-checkpoint-repository';
import { IHistoryRepository } from '../domain/history/repositories/history-repository';
import { IHumanRelayService } from '../application/llm/services/human-relay-service';
import { ThreadLifecycleService } from '../application/threads/services/thread-lifecycle-service';
import { ThreadExecutionService } from '../application/threads/services/thread-execution-service';
import { ThreadMonitoringService } from '../application/threads/services/thread-monitoring-service';
import { SessionMonitoringService } from '../application/sessions/services/session-monitoring-service';
import { GraphAlgorithmService } from '../infrastructure/workflow/services/graph-algorithm-service';
import { ContextProcessorService } from '../infrastructure/workflow/services/context-processor-service';

// Infrastructure层实现
import { SessionRepository as SessionInfrastructureRepository } from '../infrastructure/persistence/repositories/session-repository';
import { ThreadRepository as ThreadInfrastructureRepository } from '../infrastructure/persistence/repositories/thread-repository';
import { WorkflowRepository as WorkflowInfrastructureRepository } from '../infrastructure/persistence/repositories/workflow-repository';
import { PromptRepository as PromptInfrastructureRepository } from '../infrastructure/persistence/repositories/prompt-repository';
import { ThreadCheckpointRepository as ThreadCheckpointInfrastructureRepository } from '../infrastructure/persistence/repositories/thread-checkpoint-repository';
import { HistoryRepository as HistoryInfrastructureRepository } from '../infrastructure/persistence/repositories/history-repository';
import { GraphAlgorithmServiceImpl } from '../infrastructure/workflow/services/graph-algorithm-service';
import { ContextProcessorServiceImpl } from '../infrastructure/workflow/services/context-processor-service';
import { FunctionExecutionEngine } from '../infrastructure/workflow/services/function-execution-engine';
import { MonitoringService } from '../infrastructure/workflow/services/monitoring-service';
import { ConnectionManager } from '../infrastructure/persistence/connections/connection-manager';
import { PromptBuilder } from '../infrastructure/prompts/services/prompt-builder';
import { TemplateProcessor } from '../infrastructure/prompts/services/template-processor';
import { PromptReferenceParser } from '../infrastructure/prompts/services/prompt-reference-parser';
import { PromptReferenceValidator } from '../infrastructure/prompts/services/prompt-reference-validator';
import { NodeExecutor } from '../infrastructure/workflow/nodes/node-executor';
import { EdgeExecutor } from '../infrastructure/workflow/edges/edge-executor';
import { NodeRouter } from '../infrastructure/workflow/services/node-router';
import { WorkflowExecutionEngine } from '../infrastructure/workflow/services/workflow-execution-engine';
import { HookExecutor } from '../infrastructure/workflow/hooks/hook-executor';
import { HookFactory } from '../infrastructure/workflow/hooks/hook-factory';
import { Logger } from '../infrastructure/logging/logger';

// Application层实现
import { SessionOrchestrationService } from '../application/sessions/services/session-orchestration-service';
import { SessionResourceService } from '../application/sessions/services/session-resource-service';
import { SessionLifecycleService } from '../application/sessions/services/session-lifecycle-service';
import { SessionManagementService } from '../application/sessions/services/session-management-service';
import { SessionMaintenanceService } from '../application/sessions/services/session-maintenance-service';
import { HumanRelayService } from '../application/llm/services/human-relay-service';

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
  LLMWrapperFactory: LLMWrapperFactory;

  // 管理器
  PollingPoolManager: PollingPoolManager;
  TaskGroupManager: TaskGroupManager;

  // ========== Domain层接口（仅用于类型定义） ==========

  // 仓储接口
  SessionRepository: ISessionRepository;
  ThreadRepository: IThreadRepository;
  WorkflowRepository: IWorkflowRepository;
  PromptRepository: PromptDomainRepository;
  ThreadCheckpointRepository: IThreadCheckpointRepository;
  HistoryRepository: IHistoryRepository;

  // 业务服务接口
  GraphAlgorithmService: GraphAlgorithmService;
  ContextProcessorService: ContextProcessorService;

  // ========== Application层接口（仅用于类型定义） ==========

  // LLM服务
  HumanRelayService: IHumanRelayService;

  // ========== Infrastructure层实现 ==========

  // 仓储实现
  SessionRepositoryImpl: SessionInfrastructureRepository;
  ThreadRepositoryImpl: ThreadInfrastructureRepository;
  WorkflowRepositoryImpl: WorkflowInfrastructureRepository;
  PromptRepositoryImpl: PromptInfrastructureRepository;
  ThreadCheckpointRepositoryImpl: ThreadCheckpointInfrastructureRepository;
  HistoryRepositoryImpl: HistoryInfrastructureRepository;

  // 业务服务实现
  GraphAlgorithmServiceImpl: GraphAlgorithmServiceImpl;
  ContextProcessorServiceImpl: ContextProcessorServiceImpl;
  FunctionExecutionEngine: FunctionExecutionEngine;
  MonitoringService: MonitoringService;

  // 基础设施服务
  ConnectionManager: ConnectionManager;
  PromptBuilder: PromptBuilder;
  TemplateProcessor: TemplateProcessor;
  PromptReferenceParser: PromptReferenceParser;
  PromptReferenceValidator: PromptReferenceValidator;
  NodeExecutor: NodeExecutor;
  EdgeExecutor: EdgeExecutor;
  NodeRouter: NodeRouter;
  WorkflowExecutionEngine: WorkflowExecutionEngine;
  ThreadExecutionEngine: any;
  HookExecutor: HookExecutor;
  HookFactory: HookFactory;
  Logger: Logger;

  // 线程相关服务
  ThreadLifecycleService: ThreadLifecycleService;
  ThreadExecutionService: ThreadExecutionService;
  ThreadMonitoringService: ThreadMonitoringService;
  ThreadDefinitionRepository: any; // TODO: 添加具体类型
  ThreadExecutionRepository: any; // TODO: 添加具体类型

  // 会话相关服务
  SessionMonitoringService: SessionMonitoringService;

  // ========== Application层实现 ==========

  SessionOrchestrationServiceImpl: SessionOrchestrationService;
  SessionResourceServiceImpl: SessionResourceService;
  SessionLifecycleServiceImpl: SessionLifecycleService;
  SessionManagementServiceImpl: SessionManagementService;
  SessionMaintenanceServiceImpl: SessionMaintenanceService;

  // LLM服务实现
  HumanRelayServiceImpl: HumanRelayService;
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
  LLMWrapperFactory: Symbol.for('LLMWrapperFactory') as TypedServiceIdentifier<'LLMWrapperFactory'>,

  // 管理器
  PollingPoolManager: Symbol.for(
    'PollingPoolManager'
  ) as TypedServiceIdentifier<'PollingPoolManager'>,
  TaskGroupManager: Symbol.for('TaskGroupManager') as TypedServiceIdentifier<'TaskGroupManager'>,

  // ========== Domain层接口（仅用于类型定义） ==========

  // 仓储接口
  SessionRepository: Symbol.for('SessionRepository') as TypedServiceIdentifier<'SessionRepository'>,
  ThreadRepository: Symbol.for('ThreadRepository') as TypedServiceIdentifier<'ThreadRepository'>,
  WorkflowRepository: Symbol.for(
    'WorkflowRepository'
  ) as TypedServiceIdentifier<'WorkflowRepository'>,
  PromptRepository: Symbol.for('PromptRepository') as TypedServiceIdentifier<'PromptRepository'>,
  ThreadCheckpointRepository: Symbol.for(
    'ThreadCheckpointRepository'
  ) as TypedServiceIdentifier<'ThreadCheckpointRepository'>,
  HistoryRepository: Symbol.for('HistoryRepository') as TypedServiceIdentifier<'HistoryRepository'>,

  // 业务服务接口
  GraphAlgorithmService: Symbol.for(
    'GraphAlgorithmService'
  ) as TypedServiceIdentifier<'GraphAlgorithmService'>,
  ContextProcessorService: Symbol.for(
    'ContextProcessorService'
  ) as TypedServiceIdentifier<'ContextProcessorService'>,

  // ========== Application层接口（仅用于类型定义） ==========

  // LLM服务
  HumanRelayService: Symbol.for('HumanRelayService') as TypedServiceIdentifier<'HumanRelayService'>,

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
  ThreadCheckpointRepositoryImpl: Symbol.for(
    'ThreadCheckpointRepositoryImpl'
  ) as TypedServiceIdentifier<'ThreadCheckpointRepositoryImpl'>,
  HistoryRepositoryImpl: Symbol.for(
    'HistoryRepositoryImpl'
  ) as TypedServiceIdentifier<'HistoryRepositoryImpl'>,

  // 业务服务实现
  GraphAlgorithmServiceImpl: Symbol.for(
    'GraphAlgorithmServiceImpl'
  ) as TypedServiceIdentifier<'GraphAlgorithmServiceImpl'>,
  ContextProcessorServiceImpl: Symbol.for(
    'ContextProcessorServiceImpl'
  ) as TypedServiceIdentifier<'ContextProcessorServiceImpl'>,
  FunctionExecutionEngine: Symbol.for(
    'FunctionExecutionEngine'
  ) as TypedServiceIdentifier<'FunctionExecutionEngine'>,
  MonitoringService: Symbol.for('MonitoringService') as TypedServiceIdentifier<'MonitoringService'>,

  // 基础设施服务
  ConnectionManager: Symbol.for('ConnectionManager') as TypedServiceIdentifier<'ConnectionManager'>,
  PromptBuilder: Symbol.for('PromptBuilder') as TypedServiceIdentifier<'PromptBuilder'>,
  TemplateProcessor: Symbol.for('TemplateProcessor') as TypedServiceIdentifier<'TemplateProcessor'>,
  PromptReferenceParser: Symbol.for(
    'PromptReferenceParser'
  ) as TypedServiceIdentifier<'PromptReferenceParser'>,
  PromptReferenceValidator: Symbol.for(
    'PromptReferenceValidator'
  ) as TypedServiceIdentifier<'PromptReferenceValidator'>,
  NodeExecutor: Symbol.for('NodeExecutor') as TypedServiceIdentifier<'NodeExecutor'>,
  EdgeExecutor: Symbol.for('EdgeExecutor') as TypedServiceIdentifier<'EdgeExecutor'>,
  NodeRouter: Symbol.for('NodeRouter') as TypedServiceIdentifier<'NodeRouter'>,
  WorkflowExecutionEngine: Symbol.for(
    'WorkflowExecutionEngine'
  ) as TypedServiceIdentifier<'WorkflowExecutionEngine'>,
  ThreadExecutionEngine: Symbol.for(
    'ThreadExecutionEngine'
  ) as TypedServiceIdentifier<'ThreadExecutionEngine'>,
  HookExecutor: Symbol.for('HookExecutor') as TypedServiceIdentifier<'HookExecutor'>,
  HookFactory: Symbol.for('HookFactory') as TypedServiceIdentifier<'HookFactory'>,
  Logger: Symbol.for('Logger') as TypedServiceIdentifier<'Logger'>,

  // 线程相关服务
  ThreadLifecycleService: Symbol.for(
    'ThreadLifecycleService'
  ) as TypedServiceIdentifier<'ThreadLifecycleService'>,
  ThreadExecutionService: Symbol.for(
    'ThreadExecutionService'
  ) as TypedServiceIdentifier<'ThreadExecutionService'>,
  ThreadMonitoringService: Symbol.for(
    'ThreadMonitoringService'
  ) as TypedServiceIdentifier<'ThreadMonitoringService'>,
  ThreadDefinitionRepository: Symbol.for(
    'ThreadDefinitionRepository'
  ) as TypedServiceIdentifier<'ThreadDefinitionRepository'>,
  ThreadExecutionRepository: Symbol.for(
    'ThreadExecutionRepository'
  ) as TypedServiceIdentifier<'ThreadExecutionRepository'>,

  // 会话相关服务
  SessionMonitoringService: Symbol.for(
    'SessionMonitoringService'
  ) as TypedServiceIdentifier<'SessionMonitoringService'>,

  // ========== Application层实现 ==========

  SessionOrchestrationServiceImpl: Symbol.for(
    'SessionOrchestrationServiceImpl'
  ) as TypedServiceIdentifier<'SessionOrchestrationServiceImpl'>,
  SessionResourceServiceImpl: Symbol.for(
    'SessionResourceServiceImpl'
  ) as TypedServiceIdentifier<'SessionResourceServiceImpl'>,
  SessionLifecycleServiceImpl: Symbol.for(
    'SessionLifecycleServiceImpl'
  ) as TypedServiceIdentifier<'SessionLifecycleServiceImpl'>,
  SessionManagementServiceImpl: Symbol.for(
    'SessionManagementServiceImpl'
  ) as TypedServiceIdentifier<'SessionManagementServiceImpl'>,
  SessionMaintenanceServiceImpl: Symbol.for(
    'SessionMaintenanceServiceImpl'
  ) as TypedServiceIdentifier<'SessionMaintenanceServiceImpl'>,

  // LLM服务实现
  HumanRelayServiceImpl: Symbol.for(
    'HumanRelayServiceImpl'
  ) as TypedServiceIdentifier<'HumanRelayServiceImpl'>,
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
