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
import { ThreadJoin } from '../services/threads/thread-join';
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
import { ContextManagement } from '../services/workflow/context-management';
import { FunctionManagement } from '../services/workflow/function-management';
import { WorkflowLifecycle } from '../services/workflow/workflow-lifecycle';
import { WorkflowManagement } from '../services/workflow/workflow-management';
import { WorkflowValidator } from '../services/workflow/workflow-validator';
import { ExpressionEvaluator } from '../services/workflow/expression-evaluator';
import { FunctionExecutionEngine } from '../services/workflow/function-execution-engine';
import { MonitoringService } from '../services/workflow/monitoring';
import { NodeRouter } from '../services/workflow/node-router';
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
import { ThreadWorkflowExecutor } from '../services/threads/thread-workflow-executor';
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
  ThreadJoin: ThreadJoin;
  ThreadLifecycle: ThreadLifecycle;
  ThreadMaintenance: ThreadMaintenance;
  ThreadManagement: ThreadManagement;
  ThreadMonitoring: ThreadMonitoring;
  ThreadStateManager: ThreadStateManager;
  ThreadHistoryManager: ThreadHistoryManager;
  ThreadConditionalRouter: ThreadConditionalRouter;
  ThreadWorkflowExecutor: ThreadWorkflowExecutor;

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
  ContextManagement: ContextManagement;
  FunctionManagement: FunctionManagement;
  WorkflowLifecycle: WorkflowLifecycle;
  WorkflowManagement: WorkflowManagement;
  WorkflowValidator: WorkflowValidator;
  ExpressionEvaluator: ExpressionEvaluator;
  FunctionExecutionEngine: FunctionExecutionEngine;
  MonitoringService: MonitoringService;
  NodeRouter: NodeRouter;

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

  // 工作流节点服务
  FunctionRegistry: FunctionRegistry;
  NodeExecutor: NodeExecutor;
  EdgeExecutor: EdgeExecutor;
  HookExecutor: HookExecutor;
  HookFactory: HookFactory;

  // ========== Infrastructure层实现 ==========

  // 仓储实现
  SessionInfrastructureRepository: SessionInfrastructureRepository;
  ThreadInfrastructureRepository: ThreadInfrastructureRepository;
  WorkflowInfrastructureRepository: WorkflowInfrastructureRepository;
  PromptInfrastructureRepository: PromptInfrastructureRepository;
  CheckpointInfrastructureRepository: CheckpointInfrastructureRepository;

  // 基础设施组件
  ConnectionManager: ConnectionManager;
  Logger: Logger;
}

// ========== 服务标识符常量 ==========

/**
 * 服务标识符常量
 * 用于在运行时获取服务实例
 */
export const TYPES = {
  // ========== LLM模块服务 ==========

  // 基础设施组件
  HttpClient: Symbol.for('HttpClient'),
  ConfigLoadingModule: Symbol.for('ConfigLoadingModule'),
  TokenBucketLimiter: Symbol.for('TokenBucketLimiter'),
  TokenCalculator: Symbol.for('TokenCalculator'),

  // 客户端实现
  OpenAIChatClient: Symbol.for('OpenAIChatClient'),
  OpenAIResponseClient: Symbol.for('OpenAIResponseClient'),
  AnthropicClient: Symbol.for('AnthropicClient'),
  GeminiClient: Symbol.for('GeminiClient'),
  GeminiOpenAIClient: Symbol.for('GeminiOpenAIClient'),
  MockClient: Symbol.for('MockClient'),
  HumanRelayClient: Symbol.for('HumanRelayClient'),

  // 工厂类
  LLMClientFactory: Symbol.for('LLMClientFactory'),

  // 管理器
  PollingPoolManager: Symbol.for('PollingPoolManager'),
  TaskGroupManager: Symbol.for('TaskGroupManager'),
  LLMWrapperManager: Symbol.for('LLMWrapperManager'),

  // ========== Domain层接口 ==========

  // 仓储接口
  SessionRepository: Symbol.for('SessionRepository'),
  ThreadRepository: Symbol.for('ThreadRepository'),
  WorkflowRepository: Symbol.for('WorkflowRepository'),
  PromptRepository: Symbol.for('PromptRepository'),
  CheckpointRepository: Symbol.for('CheckpointRepository'),

  // 业务服务接口
  HumanRelayService: Symbol.for('HumanRelayService'),

  // ========== Services层实现 ==========

  // 线程服务
  ThreadCopy: Symbol.for('ThreadCopy'),
  ThreadExecution: Symbol.for('ThreadExecution'),
  ThreadFork: Symbol.for('ThreadFork'),
  ThreadJoin: Symbol.for('ThreadJoin'),
  ThreadLifecycle: Symbol.for('ThreadLifecycle'),
  ThreadMaintenance: Symbol.for('ThreadMaintenance'),
  ThreadManagement: Symbol.for('ThreadManagement'),
  ThreadMonitoring: Symbol.for('ThreadMonitoring'),
  ThreadStateManager: Symbol.for('ThreadStateManager'),
  ThreadHistoryManager: Symbol.for('ThreadHistoryManager'),
  ThreadConditionalRouter: Symbol.for('ThreadConditionalRouter'),
  ThreadWorkflowExecutor: Symbol.for('ThreadWorkflowExecutor'),

  // LLM服务
  HumanRelay: Symbol.for('HumanRelay'),
  Wrapper: Symbol.for('Wrapper'),

  // 会话服务
  SessionLifecycle: Symbol.for('SessionLifecycle'),
  SessionMaintenance: Symbol.for('SessionMaintenance'),
  SessionManagement: Symbol.for('SessionManagement'),
  SessionMonitoring: Symbol.for('SessionMonitoring'),
  SessionOrchestration: Symbol.for('SessionOrchestration'),
  SessionResource: Symbol.for('SessionResource'),
  SessionCheckpointManagement: Symbol.for('SessionCheckpointManagement'),

  // 状态服务
  StateHistory: Symbol.for('StateHistory'),
  StateManagement: Symbol.for('StateManagement'),
  StateRecovery: Symbol.for('StateRecovery'),

  // 工作流服务
  ContextManagement: Symbol.for('ContextManagement'),
  FunctionManagement: Symbol.for('FunctionManagement'),
  WorkflowLifecycle: Symbol.for('WorkflowLifecycle'),
  WorkflowManagement: Symbol.for('WorkflowManagement'),
  WorkflowValidator: Symbol.for('WorkflowValidator'),
  ExpressionEvaluator: Symbol.for('ExpressionEvaluator'),
  FunctionExecutionEngine: Symbol.for('FunctionExecutionEngine'),
  MonitoringService: Symbol.for('MonitoringService'),
  NodeRouter: Symbol.for('NodeRouter'),

  // 检查点服务
  CheckpointAnalysis: Symbol.for('CheckpointAnalysis'),
  CheckpointBackup: Symbol.for('CheckpointBackup'),
  CheckpointCleanup: Symbol.for('CheckpointCleanup'),
  CheckpointCreation: Symbol.for('CheckpointCreation'),
  CheckpointManagement: Symbol.for('CheckpointManagement'),
  CheckpointQuery: Symbol.for('CheckpointQuery'),
  CheckpointRestore: Symbol.for('CheckpointRestore'),

  // Prompt服务
  PromptBuilder: Symbol.for('PromptBuilder'),
  TemplateProcessor: Symbol.for('TemplateProcessor'),
  PromptReferenceParser: Symbol.for('PromptReferenceParser'),
  PromptReferenceValidator: Symbol.for('PromptReferenceValidator'),

  // 工作流节点服务
  FunctionRegistry: Symbol.for('FunctionRegistry'),
  NodeExecutor: Symbol.for('NodeExecutor'),
  EdgeExecutor: Symbol.for('EdgeExecutor'),
  HookExecutor: Symbol.for('HookExecutor'),
  HookFactory: Symbol.for('HookFactory'),

  // ========== Infrastructure层实现 ==========

  // 仓储实现
  SessionInfrastructureRepository: Symbol.for('SessionInfrastructureRepository'),
  ThreadInfrastructureRepository: Symbol.for('ThreadInfrastructureRepository'),
  WorkflowInfrastructureRepository: Symbol.for('WorkflowInfrastructureRepository'),
  PromptInfrastructureRepository: Symbol.for('PromptInfrastructureRepository'),
  CheckpointInfrastructureRepository: Symbol.for('CheckpointInfrastructureRepository'),

  // 基础设施组件
  ConnectionManager: Symbol.for('ConnectionManager'),
  Logger: Symbol.for('Logger'),
};
