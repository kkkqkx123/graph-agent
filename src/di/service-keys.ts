/**
 * Inversify服务标识符
 *
 * 定义所有服务的唯一标识符，用于依赖注入
 */

export const TYPES = {
  // ========== Domain层接口 ==========
  
  // 仓储接口
  SessionRepository: Symbol.for('SessionRepository'),
  ThreadRepository: Symbol.for('ThreadRepository'),
  WorkflowRepository: Symbol.for('WorkflowRepository'),
  PromptRepository: Symbol.for('PromptRepository'),
  CheckpointRepository: Symbol.for('CheckpointRepository'),
  HistoryRepository: Symbol.for('HistoryRepository'),
  
  // 业务服务接口
  GraphAlgorithmService: Symbol.for('GraphAlgorithmService'),
  GraphValidationService: Symbol.for('GraphValidationService'),
  ThreadCoordinatorService: Symbol.for('ThreadCoordinatorService'),
  
  // ========== Application层接口 ==========
  
  // 会话服务
  SessionOrchestrationService: Symbol.for('SessionOrchestrationService'),
  SessionResourceService: Symbol.for('SessionResourceService'),
  
  // 工作流服务
  WorkflowOrchestrationService: Symbol.for('WorkflowOrchestrationService'),
  
  // 提示词服务
  PromptService: Symbol.for('PromptService'),
  
  // ========== Infrastructure层实现 ==========
  
  // 仓储实现
  SessionRepositoryImpl: Symbol.for('SessionRepositoryImpl'),
  ThreadRepositoryImpl: Symbol.for('ThreadRepositoryImpl'),
  WorkflowRepositoryImpl: Symbol.for('WorkflowRepositoryImpl'),
  PromptRepositoryImpl: Symbol.for('PromptRepositoryImpl'),
  CheckpointRepositoryImpl: Symbol.for('CheckpointRepositoryImpl'),
  HistoryRepositoryImpl: Symbol.for('HistoryRepositoryImpl'),
  
  // 业务服务实现
  GraphAlgorithmServiceImpl: Symbol.for('GraphAlgorithmServiceImpl'),
  GraphValidationServiceImpl: Symbol.for('GraphValidationServiceImpl'),
  ThreadCoordinatorServiceImpl: Symbol.for('ThreadCoordinatorServiceImpl'),
  
  // 基础设施服务
  ConnectionManager: Symbol.for('ConnectionManager'),
  PromptLoader: Symbol.for('PromptLoader'),
  PromptInjector: Symbol.for('PromptInjector'),
  NodeExecutor: Symbol.for('NodeExecutor'),
  EdgeExecutor: Symbol.for('EdgeExecutor'),
  EdgeEvaluator: Symbol.for('EdgeEvaluator'),
  NodeRouter: Symbol.for('NodeRouter'),
  HookExecutor: Symbol.for('HookExecutor'),
  Logger: Symbol.for('Logger'),
  
  // 线程相关服务
  ThreadLifecycleService: Symbol.for('ThreadLifecycleService'),
  ThreadDefinitionRepository: Symbol.for('ThreadDefinitionRepository'),
  ThreadExecutionRepository: Symbol.for('ThreadExecutionRepository'),
  
  // ========== Application层实现 ==========
  
  SessionOrchestrationServiceImpl: Symbol.for('SessionOrchestrationServiceImpl'),
  SessionResourceServiceImpl: Symbol.for('SessionResourceServiceImpl'),
  WorkflowOrchestrationServiceImpl: Symbol.for('WorkflowOrchestrationServiceImpl'),
  PromptServiceImpl: Symbol.for('PromptServiceImpl'),
};