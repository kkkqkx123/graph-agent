/**
 * Inversify服务标识符（类型安全版本）
 *
 * 定义所有服务的唯一标识符，用于依赖注入
 * 提供完整的类型映射，确保编译时类型检查
 *
 * 注意：Application层服务直接绑定实现类，不使用接口
 */

// ========== 导入服务类型 ==========

// Domain层接口（用于类型定义，不注册到容器）
import { SessionRepository } from '../domain/sessions/repositories/session-repository';
import { ThreadRepository } from '../domain/threads/repositories/thread-repository';
import { WorkflowRepository } from '../domain/workflow/repositories/workflow-repository';
import { CheckpointRepository } from '../domain/checkpoint/repositories/checkpoint-repository';
import { HistoryRepository } from '../domain/history/repositories/history-repository';
import { GraphAlgorithmService } from '../domain/workflow/services/graph-algorithm-service.interface';
import { GraphValidationService } from '../domain/workflow/services/graph-validation-service.interface';
import { ContextProcessorService } from '../domain/workflow/services/context-processor-service.interface';
import { ThreadCoordinatorService } from '../domain/threads/services/thread-coordinator-service.interface';
import { WorkflowOrchestrationService } from '../application/workflow/services/workflow-orchestration-service';
import { PromptService } from '../application/prompts/services/prompt-service';
import { IHumanRelayService } from '../domain/llm/services/human-relay-service.interface';

// Infrastructure层实现
import { SessionRepository as SessionInfrastructureRepository } from '../infrastructure/persistence/repositories/session-repository';
import { ThreadRepository as ThreadInfrastructureRepository } from '../infrastructure/persistence/repositories/thread-repository';
import { WorkflowRepository as WorkflowInfrastructureRepository } from '../infrastructure/persistence/repositories/workflow-repository';
import { PromptRepository as PromptInfrastructureRepository } from '../infrastructure/persistence/repositories/prompt-repository';
import { CheckpointRepository as CheckpointInfrastructureRepository } from '../infrastructure/persistence/repositories/checkpoint-repository';
import { HistoryRepository as HistoryInfrastructureRepository } from '../infrastructure/persistence/repositories/history-repository';
import { GraphAlgorithmServiceImpl } from '../infrastructure/workflow/services/graph-algorithm-service';
import { GraphValidationServiceImpl } from '../infrastructure/workflow/services/graph-validation-service';
import { ContextProcessorServiceImpl } from '../infrastructure/workflow/services/context-processor-service';
import { ThreadCoordinatorInfrastructureService } from '../infrastructure/threads/services/thread-coordinator-service';
import { ConnectionManager } from '../infrastructure/persistence/connections/connection-manager';
import { PromptBuilder } from '../infrastructure/prompts/services/prompt-builder';
import { TemplateProcessor } from '../infrastructure/prompts/services/template-processor';
import { PromptReferenceParser } from '../infrastructure/prompts/services/prompt-reference-parser';
import { PromptReferenceValidator } from '../infrastructure/prompts/services/prompt-reference-validator';
import { NodeExecutor } from '../infrastructure/workflow/nodes/node-executor';
import { EdgeExecutor } from '../infrastructure/workflow/edges/edge-executor';
import { EdgeEvaluator } from '../infrastructure/threads/execution/edge-evaluator';
import { NodeRouter } from '../infrastructure/threads/execution/node-router';
import { HookExecutor } from '../infrastructure/workflow/hooks/hook-executor';
import { Logger } from '../infrastructure/logging/logger';

// Application层实现
import { SessionOrchestrationServiceImpl } from '../application/sessions/services/session-orchestration-service';
import { SessionResourceServiceImpl } from '../application/sessions/services/session-resource-service';
import { HumanRelayService } from '../application/llm/services/human-relay-service';

// ========== 服务类型映射接口 ==========

/**
 * 服务类型映射接口
 * 将服务标识符映射到对应的服务类型
 */
export interface ServiceTypes {
  // ========== Domain层接口（仅用于类型定义） ==========

  // 仓储接口
  SessionRepository: SessionRepository;
  ThreadRepository: ThreadRepository;
  WorkflowRepository: WorkflowRepository;
  PromptRepository: PromptInfrastructureRepository;
  CheckpointRepository: CheckpointRepository;
  HistoryRepository: HistoryRepository;

  // 业务服务接口
  GraphAlgorithmService: GraphAlgorithmService;
  GraphValidationService: GraphValidationService;
  ContextProcessorService: ContextProcessorService;
  ThreadCoordinatorService: ThreadCoordinatorService;

  // ========== Application层接口（仅用于类型定义） ==========

  // 工作流服务
  WorkflowOrchestrationService: WorkflowOrchestrationService;

  // 提示词服务
  PromptService: PromptService;

  // LLM服务
  HumanRelayService: IHumanRelayService;

  // ========== Infrastructure层实现 ==========

  // 仓储实现
  SessionRepositoryImpl: SessionInfrastructureRepository;
  ThreadRepositoryImpl: ThreadInfrastructureRepository;
  WorkflowRepositoryImpl: WorkflowInfrastructureRepository;
  PromptRepositoryImpl: PromptInfrastructureRepository;
  CheckpointRepositoryImpl: CheckpointInfrastructureRepository;
  HistoryRepositoryImpl: HistoryInfrastructureRepository;

  // 业务服务实现
  GraphAlgorithmServiceImpl: GraphAlgorithmServiceImpl;
  GraphValidationServiceImpl: GraphValidationServiceImpl;
  ContextProcessorServiceImpl: ContextProcessorServiceImpl;
  ThreadCoordinatorServiceImpl: ThreadCoordinatorInfrastructureService;

  // 基础设施服务
  ConnectionManager: ConnectionManager;
  PromptBuilder: PromptBuilder;
  TemplateProcessor: TemplateProcessor;
  PromptReferenceParser: PromptReferenceParser;
  PromptReferenceValidator: PromptReferenceValidator;
  NodeExecutor: NodeExecutor;
  EdgeExecutor: EdgeExecutor;
  EdgeEvaluator: EdgeEvaluator;
  NodeRouter: NodeRouter;
  HookExecutor: HookExecutor;
  Logger: Logger;

  // 线程相关服务
  ThreadLifecycleService: any; // TODO: 添加具体类型
  ThreadDefinitionRepository: any; // TODO: 添加具体类型
  ThreadExecutionRepository: any; // TODO: 添加具体类型

  // ========== Application层实现 ==========

  SessionOrchestrationServiceImpl: SessionOrchestrationServiceImpl;
  SessionResourceServiceImpl: SessionResourceServiceImpl;
  WorkflowOrchestrationServiceImpl: WorkflowOrchestrationService;
  PromptServiceImpl: PromptService;

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
  [K in ServiceIdentifier]: TypedServiceIdentifier<K>
} = {
  // ========== Domain层接口（仅用于类型定义） ==========

  // 仓储接口
  SessionRepository: Symbol.for('SessionRepository') as TypedServiceIdentifier<'SessionRepository'>,
  ThreadRepository: Symbol.for('ThreadRepository') as TypedServiceIdentifier<'ThreadRepository'>,
  WorkflowRepository: Symbol.for('WorkflowRepository') as TypedServiceIdentifier<'WorkflowRepository'>,
  PromptRepository: Symbol.for('PromptRepository') as TypedServiceIdentifier<'PromptRepository'>,
  CheckpointRepository: Symbol.for('CheckpointRepository') as TypedServiceIdentifier<'CheckpointRepository'>,
  HistoryRepository: Symbol.for('HistoryRepository') as TypedServiceIdentifier<'HistoryRepository'>,

  // 业务服务接口
  GraphAlgorithmService: Symbol.for('GraphAlgorithmService') as TypedServiceIdentifier<'GraphAlgorithmService'>,
  GraphValidationService: Symbol.for('GraphValidationService') as TypedServiceIdentifier<'GraphValidationService'>,
  ContextProcessorService: Symbol.for('ContextProcessorService') as TypedServiceIdentifier<'ContextProcessorService'>,
  ThreadCoordinatorService: Symbol.for('ThreadCoordinatorService') as TypedServiceIdentifier<'ThreadCoordinatorService'>,

  // ========== Application层接口（仅用于类型定义） ==========

  // 工作流服务
  WorkflowOrchestrationService: Symbol.for('WorkflowOrchestrationService') as TypedServiceIdentifier<'WorkflowOrchestrationService'>,

  // 提示词服务
  PromptService: Symbol.for('PromptService') as TypedServiceIdentifier<'PromptService'>,

  // LLM服务
  HumanRelayService: Symbol.for('HumanRelayService') as TypedServiceIdentifier<'HumanRelayService'>,

  // ========== Infrastructure层实现 ==========

  // 仓储实现
  SessionRepositoryImpl: Symbol.for('SessionRepositoryImpl') as TypedServiceIdentifier<'SessionRepositoryImpl'>,
  ThreadRepositoryImpl: Symbol.for('ThreadRepositoryImpl') as TypedServiceIdentifier<'ThreadRepositoryImpl'>,
  WorkflowRepositoryImpl: Symbol.for('WorkflowRepositoryImpl') as TypedServiceIdentifier<'WorkflowRepositoryImpl'>,
  PromptRepositoryImpl: Symbol.for('PromptRepositoryImpl') as TypedServiceIdentifier<'PromptRepositoryImpl'>,
  CheckpointRepositoryImpl: Symbol.for('CheckpointRepositoryImpl') as TypedServiceIdentifier<'CheckpointRepositoryImpl'>,
  HistoryRepositoryImpl: Symbol.for('HistoryRepositoryImpl') as TypedServiceIdentifier<'HistoryRepositoryImpl'>,

  // 业务服务实现
  GraphAlgorithmServiceImpl: Symbol.for('GraphAlgorithmServiceImpl') as TypedServiceIdentifier<'GraphAlgorithmServiceImpl'>,
  GraphValidationServiceImpl: Symbol.for('GraphValidationServiceImpl') as TypedServiceIdentifier<'GraphValidationServiceImpl'>,
  ContextProcessorServiceImpl: Symbol.for('ContextProcessorServiceImpl') as TypedServiceIdentifier<'ContextProcessorServiceImpl'>,
  ThreadCoordinatorServiceImpl: Symbol.for('ThreadCoordinatorServiceImpl') as TypedServiceIdentifier<'ThreadCoordinatorServiceImpl'>,

  // 基础设施服务
  ConnectionManager: Symbol.for('ConnectionManager') as TypedServiceIdentifier<'ConnectionManager'>,
  PromptBuilder: Symbol.for('PromptBuilder') as TypedServiceIdentifier<'PromptBuilder'>,
  TemplateProcessor: Symbol.for('TemplateProcessor') as TypedServiceIdentifier<'TemplateProcessor'>,
  PromptReferenceParser: Symbol.for('PromptReferenceParser') as TypedServiceIdentifier<'PromptReferenceParser'>,
  PromptReferenceValidator: Symbol.for('PromptReferenceValidator') as TypedServiceIdentifier<'PromptReferenceValidator'>,
  NodeExecutor: Symbol.for('NodeExecutor') as TypedServiceIdentifier<'NodeExecutor'>,
  EdgeExecutor: Symbol.for('EdgeExecutor') as TypedServiceIdentifier<'EdgeExecutor'>,
  EdgeEvaluator: Symbol.for('EdgeEvaluator') as TypedServiceIdentifier<'EdgeEvaluator'>,
  NodeRouter: Symbol.for('NodeRouter') as TypedServiceIdentifier<'NodeRouter'>,
  HookExecutor: Symbol.for('HookExecutor') as TypedServiceIdentifier<'HookExecutor'>,
  Logger: Symbol.for('Logger') as TypedServiceIdentifier<'Logger'>,

  // 线程相关服务
  ThreadLifecycleService: Symbol.for('ThreadLifecycleService') as TypedServiceIdentifier<'ThreadLifecycleService'>,
  ThreadDefinitionRepository: Symbol.for('ThreadDefinitionRepository') as TypedServiceIdentifier<'ThreadDefinitionRepository'>,
  ThreadExecutionRepository: Symbol.for('ThreadExecutionRepository') as TypedServiceIdentifier<'ThreadExecutionRepository'>,

  // ========== Application层实现 ==========

  SessionOrchestrationServiceImpl: Symbol.for('SessionOrchestrationServiceImpl') as TypedServiceIdentifier<'SessionOrchestrationServiceImpl'>,
  SessionResourceServiceImpl: Symbol.for('SessionResourceServiceImpl') as TypedServiceIdentifier<'SessionResourceServiceImpl'>,
  WorkflowOrchestrationServiceImpl: Symbol.for('WorkflowOrchestrationServiceImpl') as TypedServiceIdentifier<'WorkflowOrchestrationServiceImpl'>,
  PromptServiceImpl: Symbol.for('PromptServiceImpl') as TypedServiceIdentifier<'PromptServiceImpl'>,

  // LLM服务实现
  HumanRelayServiceImpl: Symbol.for('HumanRelayServiceImpl') as TypedServiceIdentifier<'HumanRelayServiceImpl'>,
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