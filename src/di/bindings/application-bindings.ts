/**
 * Application层服务绑定
 *
 * 绑定应用层的所有服务实现
 */

import { ContainerModule } from 'inversify';
import type { interfaces } from 'inversify';
import { TYPES } from '../service-keys';

// Application层服务实现
import { SessionOrchestrationServiceImpl } from '../../application/sessions/services/session-orchestration-service';
import { SessionResourceServiceImpl } from '../../application/sessions/services/session-resource-service';
import { WorkflowOrchestrationService } from '../../application/workflow/services/workflow-orchestration-service';
import { PromptService } from '../../application/prompts/services/prompt-service';

// Domain层接口
import { SessionRepository } from '../../domain/sessions/repositories/session-repository';
import { ThreadRepository } from '../../domain/threads/repositories/thread-repository';
import { WorkflowRepository } from '../../domain/workflow/repositories/workflow-repository';
import { ThreadCoordinatorService } from '../../domain/threads/services/thread-coordinator-service.interface';
import { GraphAlgorithmService } from '../../domain/workflow/services/graph-algorithm-service.interface';
import { GraphValidationService } from '../../domain/workflow/services/graph-validation-service.interface';

/**
 * Application层绑定模块
 */
export const applicationBindings = new ContainerModule((bind: interfaces.Bind) => {
  // ========== Application层服务绑定 ==========
  
  bind<SessionOrchestrationServiceImpl>(TYPES.SessionOrchestrationServiceImpl)
    .to(SessionOrchestrationServiceImpl)
    .inSingletonScope();
  
  bind<SessionResourceServiceImpl>(TYPES.SessionResourceServiceImpl)
    .to(SessionResourceServiceImpl)
    .inSingletonScope();
  
  bind<WorkflowOrchestrationService>(TYPES.WorkflowOrchestrationServiceImpl)
    .to(WorkflowOrchestrationService)
    .inSingletonScope();
  
  bind<PromptService>(TYPES.PromptServiceImpl)
    .to(PromptService)
    .inSingletonScope();

  // ========== Domain层接口到Infrastructure实现的绑定 ==========
  
  // 仓储接口绑定
  bind<SessionRepository>(TYPES.SessionRepository)
    .toDynamicValue((context: inversifyInterfaces.Context) => {
      return context.container.get<SessionRepository>(TYPES.SessionRepositoryImpl);
    })
    .inSingletonScope();
  
  bind<ThreadRepository>(TYPES.ThreadRepository)
    .toDynamicValue((context: inversifyInterfaces.Context) => {
      return context.container.get<ThreadRepository>(TYPES.ThreadRepositoryImpl);
    })
    .inSingletonScope();
  
  bind<WorkflowRepository>(TYPES.WorkflowRepository)
    .toDynamicValue((context: inversifyInterfaces.Context) => {
      return context.container.get<WorkflowRepository>(TYPES.WorkflowRepositoryImpl);
    })
    .inSingletonScope();

  // 业务服务接口绑定
  bind<ThreadCoordinatorService>(TYPES.ThreadCoordinatorService)
    .toDynamicValue((context: inversifyInterfaces.Context) => {
      return context.container.get<ThreadCoordinatorService>(TYPES.ThreadCoordinatorServiceImpl);
    })
    .inSingletonScope();
  
  bind<GraphAlgorithmService>(TYPES.GraphAlgorithmService)
    .toDynamicValue((context: inversifyInterfaces.Context) => {
      return context.container.get<GraphAlgorithmService>(TYPES.GraphAlgorithmServiceImpl);
    })
    .inSingletonScope();
  
  bind<GraphValidationService>(TYPES.GraphValidationService)
    .toDynamicValue((context: inversifyInterfaces.Context) => {
      return context.container.get<GraphValidationService>(TYPES.GraphValidationServiceImpl);
    })
    .inSingletonScope();

  // ========== Application层接口到实现的绑定 ==========
  
  bind<SessionOrchestrationServiceImpl>(TYPES.SessionOrchestrationService)
    .toDynamicValue((context: inversifyInterfaces.Context) => {
      return context.container.get<SessionOrchestrationServiceImpl>(TYPES.SessionOrchestrationServiceImpl);
    })
    .inSingletonScope();
  
  bind<SessionResourceServiceImpl>(TYPES.SessionResourceService)
    .toDynamicValue((context: inversifyInterfaces.Context) => {
      return context.container.get<SessionResourceServiceImpl>(TYPES.SessionResourceServiceImpl);
    })
    .inSingletonScope();
  
  bind<WorkflowOrchestrationService>(TYPES.WorkflowOrchestrationService)
    .toDynamicValue((context: inversifyInterfaces.Context) => {
      return context.container.get<WorkflowOrchestrationService>(TYPES.WorkflowOrchestrationServiceImpl);
    })
    .inSingletonScope();
  
  bind<PromptService>(TYPES.PromptService)
    .toDynamicValue((context: inversifyInterfaces.Context) => {
      return context.container.get<PromptService>(TYPES.PromptServiceImpl);
    })
    .inSingletonScope();
});