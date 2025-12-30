/**
 * Application层服务绑定
 *
 * 绑定应用层的所有服务实现
 */

import { ContainerModule } from 'inversify';
import { TYPES } from '../service-keys';

// Application层服务实现
import { SessionOrchestrationService } from '../../application/sessions/services/session-orchestration-service';
import { SessionResourceService } from '../../application/sessions/services/session-resource-service';
import { WorkflowOrchestrationService } from '../../application/workflow/services/workflow-orchestration-service';
import { PromptService } from '../../application/prompts/services/prompt-service';
import { HumanRelayService } from '../../application/llm/services/human-relay-service';
import { ThreadLifecycleService } from '../../application/threads/services/thread-lifecycle-service';
import { ThreadExecutionService } from '../../application/threads/services/thread-execution-service';

// Domain层接口
import { SessionRepository } from '../../domain/sessions/repositories/session-repository';
import { ThreadRepository } from '../../domain/threads/repositories/thread-repository';
import { WorkflowRepository } from '../../domain/workflow/repositories/workflow-repository';
import { ThreadCheckpointRepository } from '../../domain/threads/checkpoints/repositories/thread-checkpoint-repository';
import { GraphAlgorithmService } from '../../domain/workflow/services/graph-algorithm-service.interface';
import { GraphValidationService } from '../../domain/workflow/services/graph-validation-service.interface';
import { ContextProcessorService } from '../../domain/workflow/services/context-processor-service.interface';
import { IHumanRelayService } from '../../domain/llm/services/human-relay-service.interface';

/**
 * Application层绑定模块
 */
export const applicationBindings = new ContainerModule((bind: any) => {
  // ========== Application层服务绑定 ==========

  // 会话服务
  bind(TYPES.SessionOrchestrationServiceImpl)
    .to(SessionOrchestrationService)
    .inSingletonScope();

  bind(TYPES.SessionResourceServiceImpl)
    .to(SessionResourceService)
    .inSingletonScope();

  // 工作流服务
  bind(TYPES.WorkflowOrchestrationServiceImpl)
    .to(WorkflowOrchestrationService)
    .inSingletonScope();

  // 线程服务
  bind(TYPES.ThreadLifecycleService)
    .to(ThreadLifecycleService)
    .inSingletonScope();

  bind(TYPES.ThreadExecutionService)
    .to(ThreadExecutionService)
    .inSingletonScope();

  // 提示词服务
  bind(TYPES.PromptServiceImpl)
    .to(PromptService)
    .inSingletonScope();

  // LLM服务
  bind(TYPES.HumanRelayServiceImpl)
    .to(HumanRelayService)
    .inSingletonScope();

  // ========== Domain层接口到Infrastructure实现的绑定 ==========

  // 仓储接口绑定
  bind(TYPES.SessionRepository)
    .toDynamicValue((context: any) => {
      return context.container.get(TYPES.SessionRepositoryImpl);
    })
    .inSingletonScope();

  bind(TYPES.ThreadRepository)
    .toDynamicValue((context: any) => {
      return context.container.get(TYPES.ThreadRepositoryImpl);
    })
    .inSingletonScope();

  bind(TYPES.WorkflowRepository)
    .toDynamicValue((context: any) => {
      return context.container.get(TYPES.WorkflowRepositoryImpl);
    })
    .inSingletonScope();

  bind(TYPES.ThreadCheckpointRepository)
    .toDynamicValue((context: any) => {
      return context.container.get(TYPES.ThreadCheckpointRepositoryImpl);
    })
    .inSingletonScope();

  bind(TYPES.GraphAlgorithmService)
    .toDynamicValue((context: any) => {
      return context.container.get(TYPES.GraphAlgorithmServiceImpl);
    })
    .inSingletonScope();

  bind(TYPES.GraphValidationService)
    .toDynamicValue((context: any) => {
      return context.container.get(TYPES.GraphValidationServiceImpl);
    })
    .inSingletonScope();

  bind(TYPES.ContextProcessorService)
    .toDynamicValue((context: any) => {
      return context.container.get(TYPES.ContextProcessorServiceImpl);
    })
    .inSingletonScope();

  // ========== Application层接口到实现的绑定 ==========
  // 注意：Application层服务直接绑定实现类，不使用接口
});