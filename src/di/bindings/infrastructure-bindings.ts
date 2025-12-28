/**
 * Infrastructure层服务绑定
 *
 * 绑定基础设施层的所有服务实现
 */

import { ContainerModule } from 'inversify';
import { TYPES } from '../service-keys';

// 仓储实现
import { SessionRepository as SessionInfrastructureRepository } from '../../infrastructure/persistence/repositories/session-repository';
import { ThreadRepository as ThreadInfrastructureRepository } from '../../infrastructure/persistence/repositories/thread-repository';
import { WorkflowRepository as WorkflowInfrastructureRepository } from '../../infrastructure/persistence/repositories/workflow-repository';
import { PromptRepository as PromptInfrastructureRepository } from '../../infrastructure/persistence/repositories/prompt-repository';
import { CheckpointRepository as CheckpointInfrastructureRepository } from '../../infrastructure/persistence/repositories/checkpoint-repository';
import { HistoryRepository as HistoryInfrastructureRepository } from '../../infrastructure/persistence/repositories/history-repository';

// 业务服务实现
import { GraphAlgorithmServiceImpl } from '../../infrastructure/workflow/services/graph-algorithm-service';
import { GraphValidationServiceImpl } from '../../infrastructure/workflow/services/graph-validation-service';
import { ContextProcessorServiceImpl } from '../../infrastructure/workflow/services/context-processor-service';
import { ThreadCoordinatorInfrastructureService } from '../../infrastructure/threads/services/thread-coordinator-service';

// 基础设施服务
import { ConnectionManager } from '../../infrastructure/persistence/connections/connection-manager';
import { PromptLoader } from '../../infrastructure/prompts/services/prompt-loader';
import { PromptInjector } from '../../infrastructure/prompts/services/prompt-injector';
import { NodeExecutor } from '../../infrastructure/workflow/nodes/node-executor';
import { EdgeExecutor } from '../../infrastructure/workflow/edges/edge-executor';
import { EdgeEvaluator } from '../../infrastructure/threads/execution/edge-evaluator';
import { NodeRouter } from '../../infrastructure/threads/execution/node-router';
import { HookExecutor } from '../../infrastructure/workflow/hooks/hook-executor';
import { Logger } from '../../infrastructure/logging/logger';

/**
 * Infrastructure层绑定模块
 */
export const infrastructureBindings = new ContainerModule((bind: any) => {
  // ========== 仓储绑定 ==========
  
  bind(TYPES.SessionRepositoryImpl).to(SessionInfrastructureRepository).inSingletonScope();
  bind(TYPES.ThreadRepositoryImpl).to(ThreadInfrastructureRepository).inSingletonScope();
  bind(TYPES.WorkflowRepositoryImpl).to(WorkflowInfrastructureRepository).inSingletonScope();
  bind(TYPES.PromptRepositoryImpl).to(PromptInfrastructureRepository).inSingletonScope();
  bind(TYPES.CheckpointRepositoryImpl).to(CheckpointInfrastructureRepository).inSingletonScope();
  bind(TYPES.HistoryRepositoryImpl).to(HistoryInfrastructureRepository).inSingletonScope();

  // ========== 业务服务绑定 ==========
  
  bind(TYPES.GraphAlgorithmServiceImpl).to(GraphAlgorithmServiceImpl).inSingletonScope();
  bind(TYPES.GraphValidationServiceImpl).to(GraphValidationServiceImpl).inSingletonScope();
  bind(TYPES.ContextProcessorServiceImpl).to(ContextProcessorServiceImpl).inSingletonScope();
  bind(TYPES.ThreadCoordinatorServiceImpl).to(ThreadCoordinatorInfrastructureService).inSingletonScope();

  // ========== 基础设施服务绑定 ==========
  
  bind(TYPES.ConnectionManager).to(ConnectionManager).inSingletonScope();
  bind(TYPES.PromptLoader).to(PromptLoader).inSingletonScope();
  bind(TYPES.PromptInjector).to(PromptInjector).inSingletonScope();
  bind(TYPES.NodeExecutor).to(NodeExecutor).inSingletonScope();
  bind(TYPES.EdgeExecutor).to(EdgeExecutor).inSingletonScope();
  bind(TYPES.EdgeEvaluator).to(EdgeEvaluator).inSingletonScope();
  bind(TYPES.NodeRouter).to(NodeRouter).inSingletonScope();
  bind(TYPES.HookExecutor).to(HookExecutor).inSingletonScope();
  bind(TYPES.Logger).to(Logger).inSingletonScope();
});