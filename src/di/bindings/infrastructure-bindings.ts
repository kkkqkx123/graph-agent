/**
 * Infrastructure层服务绑定
 *
 * 绑定基础设施层的所有服务实现
 */

import { ContainerModule } from 'inversify';
import type { interfaces } from 'inversify';
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
export const infrastructureBindings = new ContainerModule((bind: interfaces.Bind) => {
  // ========== 仓储绑定 ==========
  
  bind<SessionInfrastructureRepository>(TYPES.SessionRepositoryImpl)
    .to(SessionInfrastructureRepository)
    .inSingletonScope();
  
  bind<ThreadInfrastructureRepository>(TYPES.ThreadRepositoryImpl)
    .to(ThreadInfrastructureRepository)
    .inSingletonScope();
  
  bind<WorkflowInfrastructureRepository>(TYPES.WorkflowRepositoryImpl)
    .to(WorkflowInfrastructureRepository)
    .inSingletonScope();
  
  bind<PromptInfrastructureRepository>(TYPES.PromptRepositoryImpl)
    .to(PromptInfrastructureRepository)
    .inSingletonScope();
  
  bind<CheckpointInfrastructureRepository>(TYPES.CheckpointRepositoryImpl)
    .to(CheckpointInfrastructureRepository)
    .inSingletonScope();
  
  bind<HistoryInfrastructureRepository>(TYPES.HistoryRepositoryImpl)
    .to(HistoryInfrastructureRepository)
    .inSingletonScope();

  // ========== 业务服务绑定 ==========
  
  bind<GraphAlgorithmServiceImpl>(TYPES.GraphAlgorithmServiceImpl)
    .to(GraphAlgorithmServiceImpl)
    .inSingletonScope();
  
  bind<GraphValidationServiceImpl>(TYPES.GraphValidationServiceImpl)
    .to(GraphValidationServiceImpl)
    .inSingletonScope();
  
  bind<ThreadCoordinatorInfrastructureService>(TYPES.ThreadCoordinatorServiceImpl)
    .to(ThreadCoordinatorInfrastructureService)
    .inSingletonScope();

  // ========== 基础设施服务绑定 ==========
  
  bind<ConnectionManager>(TYPES.ConnectionManager)
    .to(ConnectionManager)
    .inSingletonScope();
  
  bind<PromptLoader>(TYPES.PromptLoader)
    .to(PromptLoader)
    .inSingletonScope();
  
  bind<PromptInjector>(TYPES.PromptInjector)
    .to(PromptInjector)
    .inSingletonScope();
  
  bind<NodeExecutor>(TYPES.NodeExecutor)
    .to(NodeExecutor)
    .inSingletonScope();
  
  bind<EdgeExecutor>(TYPES.EdgeExecutor)
    .to(EdgeExecutor)
    .inSingletonScope();
  
  bind<EdgeEvaluator>(TYPES.EdgeEvaluator)
    .to(EdgeEvaluator)
    .inSingletonScope();
  
  bind<NodeRouter>(TYPES.NodeRouter)
    .to(NodeRouter)
    .inSingletonScope();
  
  bind<HookExecutor>(TYPES.HookExecutor)
    .to(HookExecutor)
    .inSingletonScope();
  
  bind<Logger>(TYPES.Logger)
    .to(Logger)
    .inSingletonScope();
});